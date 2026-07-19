import * as React from "react";
import { Forward, Loader2 } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { Label } from "../primitives/label";
import { Textarea } from "../primitives/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select";

export type ForwardPurpose = "COMMENT" | "REVIEW" | "APPROVAL";

export interface ForwardUser {
  id: string;
  name: string;
  /** Shown as secondary text, e.g. the person's role. */
  roleLabel?: string;
}

export interface ForwardPayload {
  toUserId: string;
  purpose: ForwardPurpose;
  reason: string;
  remarks?: string;
}

export interface ForwardBoxProps {
  users: ForwardUser[];
  onForward: (payload: ForwardPayload) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

const PURPOSES: { value: ForwardPurpose; label: string }[] = [
  { value: "COMMENT", label: "For comment" },
  { value: "REVIEW", label: "For review" },
  { value: "APPROVAL", label: "For approval" },
];

/**
 * Routes the current record to another user for comment, review or approval.
 * Used identically on every page, per the project constitution.
 */
export function ForwardBox({ users, onForward, disabled = false, className }: ForwardBoxProps) {
  const [toUserId, setToUserId] = React.useState("");
  const [purpose, setPurpose] = React.useState<ForwardPurpose>("REVIEW");
  const [reason, setReason] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [errors, setErrors] = React.useState<{ toUserId?: string; reason?: string }>({});
  const [isSending, setIsSending] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const submit = async () => {
    const nextErrors: typeof errors = {};
    if (!toUserId) nextErrors.toUserId = "Select a recipient";
    if (!reason.trim()) nextErrors.reason = "A reason is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSending(true);
    try {
      await onForward({ toUserId, purpose, reason: reason.trim(), remarks: remarks.trim() || undefined });
      setSentTo(users.find((u) => u.id === toUserId)?.name ?? "recipient");
      setToUserId("");
      setReason("");
      setRemarks("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-card", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Forward className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Forward</h3>
      </div>

      {sentTo ? (
        <p className="mb-3 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
          Forwarded to {sentTo}.
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="forward-user" className="text-xs">
            Forward to
          </Label>
          <Select value={toUserId} onValueChange={setToUserId} disabled={disabled}>
            <SelectTrigger id="forward-user">
              <SelectValue placeholder="Select a user…" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.roleLabel ? `${user.name} · ${user.roleLabel}` : user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.toUserId ? <p className="text-xs text-destructive">{errors.toUserId}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="forward-purpose" className="text-xs">
            Purpose
          </Label>
          <Select
            value={purpose}
            onValueChange={(value) => setPurpose(value as ForwardPurpose)}
            disabled={disabled}
          >
            <SelectTrigger id="forward-purpose">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PURPOSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="forward-reason" className="text-xs">
            Reason
          </Label>
          <Input
            id="forward-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why are you forwarding this?"
            disabled={disabled}
          />
          {errors.reason ? <p className="text-xs text-destructive">{errors.reason}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="forward-remarks" className="text-xs">
            Remarks <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="forward-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Additional context…"
            rows={3}
            disabled={disabled}
          />
        </div>

        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => void submit()}
          disabled={disabled || isSending}
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Forward />}
          {isSending ? "Forwarding…" : "Forward"}
        </Button>
      </div>
    </div>
  );
}
