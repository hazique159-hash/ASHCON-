import { env } from "../../core/config/env";
import { AccountLockedError, NotFoundError, UnauthorizedError } from "../../core/errors";
import { verifyPassword } from "../../core/auth/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../core/auth/tokens";
import { resolveEffectiveAccess } from "../../core/rbac/permissions";
import { fromNow } from "../../core/utils/duration";
import { authRepository } from "./auth.repository";

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/**
 * Window in which the immediately-previous refresh token is still accepted.
 *
 * Rotation is not atomic across clients: two tabs, or a request retried after a
 * dropped response, can legitimately present the same token moments apart.
 * Without this, those races look identical to theft and would sign the user out
 * constantly. Trade-off: a stolen token replayed inside this window is not
 * flagged; replayed after it, the whole session is still revoked. Keep it small.
 */
const REFRESH_GRACE_MS = 10_000;

type UserWithRoles = NonNullable<Awaited<ReturnType<typeof authRepository.findUserByEmail>>>;

function toPublicUser(user: UserWithRoles) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    avatarUrl: user.avatarUrl,
    status: user.status,
    isSuperAdmin: user.isSuperAdmin,
    roles: user.roles.map((r) => ({ key: r.role.key, name: r.role.name })),
  };
}

export const authService = {
  /** Password authentication. Generic errors prevent user enumeration. */
  async login(rawEmail: string, password: string, ctx: RequestContext) {
    // Shared schemas validate only; normalisation lives here.
    const email = rawEmail.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(email);

    if (!user || user.deletedAt) {
      await authRepository.recordLoginAttempt({
        email,
        success: false,
        reason: "NO_SUCH_USER",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedError();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await authRepository.recordLoginAttempt({
        userId: user.id,
        email,
        success: false,
        reason: "LOCKED",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new AccountLockedError(user.lockedUntil);
    }

    if (user.status === "DISABLED" || user.status === "SUSPENDED") {
      await authRepository.recordLoginAttempt({
        userId: user.id,
        email,
        success: false,
        reason: `STATUS_${user.status}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedError("This account is not active. Contact your administrator.");
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      const failedCount = user.failedLoginCount + 1;
      const shouldLock = failedCount >= env.LOCKOUT_THRESHOLD;
      await authRepository.updateUser(user.id, {
        failedLoginCount: shouldLock ? 0 : failedCount,
        lockedUntil: shouldLock ? fromNow(env.LOCKOUT_DURATION) : null,
        status: shouldLock ? "LOCKED" : user.status,
      });
      await authRepository.recordLoginAttempt({
        userId: user.id,
        email,
        success: false,
        reason: shouldLock ? "LOCKED_OUT" : "BAD_PASSWORD",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedError();
    }

    // TODO(Phase 0.4b): if user.twoFactorEnabled, issue a short-lived MFA
    // challenge here instead of a session, and complete via /2fa/verify.

    await authRepository.updateUser(user.id, {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      status: user.status === "INVITED" ? "ACTIVE" : user.status,
    });

    const session = await authRepository.createSession({
      userId: user.id,
      tokenVersion: 0,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      idleExpiresAt: fromNow(env.REFRESH_IDLE_TTL),
      absoluteExpiresAt: fromNow(env.REFRESH_ABSOLUTE_TTL),
    });

    await authRepository.recordLoginAttempt({
      userId: user.id,
      email,
      success: true,
      reason: "OK",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    const roleKeys = user.roles.map((r) => r.role.key);

    return {
      accessToken: signAccessToken({ sub: user.id, sid: session.id, roles: roleKeys }),
      refreshToken: signRefreshToken({ sub: user.id, sid: session.id, ver: session.tokenVersion }),
      user: toPublicUser(user),
      mustChangePassword: user.mustChangePassword,
    };
  },

  /** Rotate tokens. Presenting an already-rotated token revokes the session. */
  async refresh(token: string, ctx: RequestContext) {
    const payload = verifyRefreshToken(token);
    const session = await authRepository.findSessionById(payload.sid);
    const now = new Date();

    if (
      !session ||
      session.revokedAt ||
      session.absoluteExpiresAt < now ||
      session.idleExpiresAt < now
    ) {
      throw new UnauthorizedError("Session expired. Please sign in again.");
    }

    if (session.tokenVersion !== payload.ver) {
      const isImmediatelyPrevious = payload.ver === session.tokenVersion - 1;
      const withinGrace = now.getTime() - session.lastUsedAt.getTime() <= REFRESH_GRACE_MS;

      // A concurrent refresh, not theft: hand back the current token unchanged
      // (idempotent) rather than rotating again or revoking.
      if (isImmediatelyPrevious && withinGrace) {
        const graceAccess = await resolveEffectiveAccess(session.userId);
        return {
          accessToken: signAccessToken({
            sub: session.userId,
            sid: session.id,
            roles: graceAccess.roles,
          }),
          refreshToken: signRefreshToken({
            sub: session.userId,
            sid: session.id,
            ver: session.tokenVersion,
          }),
        };
      }

      await authRepository.updateSession(session.id, {
        revokedAt: now,
        revokedReason: "REUSE_DETECTED",
        reuseDetectedAt: now,
      });
      throw new UnauthorizedError("Session security violation. Please sign in again.");
    }

    const slidingIdle = fromNow(env.REFRESH_IDLE_TTL);
    const updated = await authRepository.updateSession(session.id, {
      tokenVersion: session.tokenVersion + 1,
      lastUsedAt: now,
      // the sliding window may never exceed the absolute cap
      idleExpiresAt: slidingIdle > session.absoluteExpiresAt ? session.absoluteExpiresAt : slidingIdle,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    const access = await resolveEffectiveAccess(session.userId);

    return {
      accessToken: signAccessToken({
        sub: session.userId,
        sid: session.id,
        roles: access.roles,
      }),
      refreshToken: signRefreshToken({
        sub: session.userId,
        sid: session.id,
        ver: updated.tokenVersion,
      }),
    };
  },

  async logout(token: string) {
    try {
      const payload = verifyRefreshToken(token);
      await authRepository.updateSession(payload.sid, {
        revokedAt: new Date(),
        revokedReason: "USER_LOGOUT",
      });
    } catch {
      // already invalid — logging out is idempotent
    }
  },

  /** Current user plus their effective permission keys (drives UI gating). */
  async me(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError("User");
    const access = await resolveEffectiveAccess(userId);
    return {
      user: toPublicUser(user),
      isSuperAdmin: access.isSuperAdmin,
      permissions: access.isSuperAdmin ? ["*"] : [...access.permissions],
    };
  },
};
