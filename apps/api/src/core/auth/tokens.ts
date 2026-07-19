import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../errors";

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  roles: string[];
  typ: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  ver: number;
  typ: "refresh";
}

type Expiry = jwt.SignOptions["expiresIn"];

export function signAccessToken(input: { sub: string; sid: string; roles: string[] }): string {
  return jwt.sign({ ...input, typ: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TTL as Expiry,
  });
}

export function signRefreshToken(input: { sub: string; sid: string; ver: number }): string {
  return jwt.sign({ ...input, typ: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_IDLE_TTL as Expiry,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.typ !== "access") throw new Error("wrong token type");
    return decoded;
  } catch {
    throw new UnauthorizedError("Invalid or expired session.");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.typ !== "refresh") throw new Error("wrong token type");
    return decoded;
  } catch {
    throw new UnauthorizedError("Session expired. Please sign in again.");
  }
}
