// Dev diagnostic: prove sensitive columns are ciphertext at rest.
// Usage: pnpm --filter @ca/api exec tsx scripts/inspect-encryption.ts
import "dotenv/config";
import { prisma } from "../src/core/db/prisma";
import { decryptField, maskTail } from "../src/core/crypto/field-encryption";

const rows = await prisma.salaryInfo.findMany({
  where: { bankAccountNumber: { not: null } },
  select: {
    bankName: true,
    bankAccountNumber: true,
    basicSalary: true,
    employee: { select: { employeeCode: true, firstName: true, lastName: true } },
  },
  take: 3,
});

if (rows.length === 0) {
  console.log("No salary rows with a bank account number yet.");
} else {
  for (const row of rows) {
    const stored = row.bankAccountNumber as string;
    const plain = decryptField(stored);
    console.log(`\n${row.employee.employeeCode} — ${row.employee.firstName} ${row.employee.lastName}`);
    console.log(`  bank            : ${row.bankName}`);
    console.log(`  basic salary    : ${row.basicSalary.toString()}  (numeric, not encrypted)`);
    console.log(`  STORED IN DB    : ${stored}`);
    console.log(`  looks encrypted : ${stored.startsWith("v1.") ? "YES (v1 AES-256-GCM)" : "NO — PLAINTEXT!"}`);
    console.log(`  decrypts to     : ${plain}`);
    console.log(`  masked for UI   : ${maskTail(plain)}`);
  }
}

await prisma.$disconnect();
