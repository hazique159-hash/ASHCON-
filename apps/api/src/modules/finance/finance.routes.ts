import { Router } from "express";
import { createAccountSchema, createJournalSchema } from "@ca/contracts";
import { authenticate } from "../../core/middleware/authenticate";
import { authorize } from "../../core/middleware/authorize";
import { validate } from "../../core/middleware/validate";
import { financeController } from "./finance.controller";

export const financeRoutes: Router = Router();

// Default-deny for the whole module; each route adds its own permission.
financeRoutes.use(authenticate);

financeRoutes.get("/accounts", authorize("finance:view"), financeController.listAccounts);
financeRoutes.post(
  "/accounts",
  authorize("finance:create"),
  validate({ body: createAccountSchema }),
  financeController.createAccount,
);

financeRoutes.get("/reference", authorize("finance:view"), financeController.reference);
financeRoutes.get("/trial-balance", authorize("finance:view"), financeController.trialBalance);

financeRoutes.get("/journal", authorize("finance:view"), financeController.listJournal);
financeRoutes.get("/journal/:id", authorize("finance:view"), financeController.journalDetail);
financeRoutes.post(
  "/journal",
  authorize("finance:create"),
  validate({ body: createJournalSchema }),
  financeController.createJournal,
);
// Posting commits an entry to the ledger — treated as an approval action.
financeRoutes.post("/journal/:id/post", authorize("finance:approve"), financeController.postJournal);
