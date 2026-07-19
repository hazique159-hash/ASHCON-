import type { CreateUserInput, UserListItem } from "@ca/contracts";
import { ConflictError } from "../../core/errors";
import { generateTemporaryPassword, hashPassword } from "../../core/auth/password";
import { usersRepository } from "./users.repository";

/** HTML forms submit "" for untouched optional fields; store them as NULL. */
function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const usersService = {
  /**
   * Full list for the admin table. At Ashcon's scale (20–50 users) returning the
   * set and letting the client sort/filter/paginate is simpler and faster than
   * round-tripping; swap to server-side paging if this ever grows.
   */
  async list(): Promise<UserListItem[]> {
    const users = await usersRepository.findAll();

    return users.map((user) => ({
      id: user.id,
      employeeCode: user.employeeCode,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      status: user.status,
      department: user.department?.name ?? null,
      designation: user.designation?.name ?? null,
      roles: user.roles.map((entry) => entry.role.name).join(", "),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    }));
  },

  /** Departments and roles for the create/edit form selectors. */
  async reference() {
    const [departments, roles] = await Promise.all([
      usersRepository.listDepartments(),
      usersRepository.listRoles(),
    ]);
    return { departments, roles };
  },

  /**
   * Creates a portal account with a random temporary password. The password is
   * returned once so the administrator can hand it over; the account is flagged
   * mustChangePassword so it must be rotated at first sign-in.
   */
  async create(input: CreateUserInput, actorId: string) {
    const email = input.email.trim().toLowerCase();
    const existing = await usersRepository.findByEmail(email);
    if (existing) throw new ConflictError("A user with that email already exists.");

    const temporaryPassword = generateTemporaryPassword();
    const user = await usersRepository.create({
      email,
      passwordHash: await hashPassword(temporaryPassword),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      employeeCode: emptyToNull(input.employeeCode),
      phone: emptyToNull(input.phone),
      departmentId: emptyToNull(input.departmentId),
      status: "ACTIVE",
      mustChangePassword: true,
      createdById: actorId,
    });

    await usersRepository.assignRole(user.id, input.roleId);

    await usersRepository.writeAudit({
      actorId,
      action: "CREATE",
      module: "users",
      entityType: "User",
      entityId: user.id,
      after: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        roleId: input.roleId,
        departmentId: emptyToNull(input.departmentId),
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      temporaryPassword,
    };
  },
};
