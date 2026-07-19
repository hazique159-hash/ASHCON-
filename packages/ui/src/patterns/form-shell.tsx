import * as React from "react";
import { Loader2, MessageSquare, Paperclip, Save, Upload, X } from "lucide-react";
import { cn } from "../lib/cn";
import { Alert, AlertDescription } from "../primitives/alert";
import { Button } from "../primitives/button";
import { Textarea } from "../primitives/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../primitives/tabs";
import { ActivityTimeline, formatWhen, type TimelineEntry } from "./activity-timeline";
import { ForwardBox, type ForwardPayload, type ForwardUser } from "./forward-box";

export interface CommentEntry {
  id: string;
  author: string;
  body: string;
  at: string | Date;
}

export interface AttachmentEntry {
  id: string;
  fileName: string;
  size?: number;
  uploadedBy?: string;
  at?: string | Date;
  url?: string;
}

export interface VersionEntry {
  id: string;
  version: number | string;
  author: string;
  at: string | Date;
  note?: string;
}

export interface FormShellProps {
  title: string;
  description?: string;
  /** Status badge or similar, rendered by the header. */
  status?: React.ReactNode;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onCancel?: () => void;
  onReset?: () => void;
  onSaveDraft?: () => void | Promise<void>;
  /** Debounced draft save while the user types. Requires onSaveDraft. */
  autoSave?: boolean;
  autoSaveDelayMs?: number;
  isDirty?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  error?: string | null;

  comments?: CommentEntry[];
  onAddComment?: (body: string) => void | Promise<void>;
  activity?: TimelineEntry[];
  approvals?: TimelineEntry[];
  versions?: VersionEntry[];
  attachments?: AttachmentEntry[];
  onUpload?: (files: FileList) => void | Promise<void>;
  forward?: { users: ForwardUser[]; onForward: (payload: ForwardPayload) => void | Promise<void> };

  /** The form fields. */
  children: React.ReactNode;
}

function humanSize(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

/**
 * The one form layout used across Connect Affairs.
 *
 * Provides validation surface, draft + auto-save, attachments, comments,
 * activity/approval history, version history, forwarding, and cancel/reset —
 * so no module re-implements any of it.
 */
export function FormShell({
  title,
  description,
  status,
  onSubmit,
  onCancel,
  onReset,
  onSaveDraft,
  autoSave = false,
  autoSaveDelayMs = 2000,
  isDirty = false,
  isSubmitting = false,
  submitLabel = "Save",
  error,
  comments = [],
  onAddComment,
  activity = [],
  approvals = [],
  versions = [],
  attachments = [],
  onUpload,
  forward,
  children,
}: FormShellProps) {
  const [changeTick, setChangeTick] = React.useState(0);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [commentDraft, setCommentDraft] = React.useState("");
  const [isPostingComment, setIsPostingComment] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const saveDraft = React.useCallback(async () => {
    if (!onSaveDraft) return;
    setIsSavingDraft(true);
    try {
      await onSaveDraft();
      setLastSavedAt(new Date());
    } finally {
      setIsSavingDraft(false);
    }
  }, [onSaveDraft]);

  // Auto-save: input events bubble from the fields to the <form>, so a tick
  // counter gives us a debounce trigger without the page wiring anything up.
  React.useEffect(() => {
    if (!autoSave || !onSaveDraft || changeTick === 0) return;
    const timer = setTimeout(() => void saveDraft(), autoSaveDelayMs);
    return () => clearTimeout(timer);
  }, [autoSave, onSaveDraft, changeTick, autoSaveDelayMs, saveDraft]);

  const postComment = async () => {
    if (!onAddComment || !commentDraft.trim()) return;
    setIsPostingComment(true);
    try {
      await onAddComment(commentDraft.trim());
      setCommentDraft("");
    } finally {
      setIsPostingComment(false);
    }
  };

  const draftStatus = isSavingDraft
    ? "Saving draft…"
    : lastSavedAt
      ? `Draft saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : isDirty
        ? "Unsaved changes"
        : null;

  return (
    <form onSubmit={onSubmit} onInput={() => setChangeTick((tick) => tick + 1)} noValidate>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Fields */}
        <div className="space-y-4 lg:col-span-2">{children}</div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-card">
            <Tabs defaultValue="comments">
              <TabsList className="w-full justify-between">
                <TabsTrigger value="comments">Comments{comments.length ? ` (${comments.length})` : ""}</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="approvals">Approvals</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="versions">Versions</TabsTrigger>
              </TabsList>

              <TabsContent value="comments">
                {onAddComment ? (
                  <div className="mb-3 space-y-2">
                    <Textarea
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Add a comment…"
                      rows={3}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void postComment()}
                      disabled={!commentDraft.trim() || isPostingComment}
                    >
                      {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare />}
                      Post
                    </Button>
                  </div>
                ) : null}
                {comments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No comments yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {comments.map((comment) => (
                      <li key={comment.id} className="rounded-md bg-muted/50 p-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium">{comment.author}</span>
                          <span className="text-[11px] text-muted-foreground">{formatWhen(comment.at)}</span>
                        </div>
                        <p className="mt-1 text-xs text-foreground/90">{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="activity">
                <ActivityTimeline entries={activity} />
              </TabsContent>

              <TabsContent value="approvals">
                <ActivityTimeline entries={approvals} emptyMessage="No approval steps recorded." />
              </TabsContent>

              <TabsContent value="files">
                {onUpload ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        if (event.target.files?.length) void onUpload(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mb-3 w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload />
                      Attach files
                    </Button>
                  </>
                ) : null}
                {attachments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No attachments.</p>
                ) : (
                  <ul className="space-y-2">
                    {attachments.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs"
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
                        {file.size ? (
                          <span className="shrink-0 text-muted-foreground">{humanSize(file.size)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="versions">
                {versions.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No previous versions.</p>
                ) : (
                  <ul className="space-y-2">
                    {versions.map((version) => (
                      <li key={version.id} className="rounded-md border px-2.5 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium">v{version.version}</span>
                          <span className="text-[11px] text-muted-foreground">{formatWhen(version.at)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {version.author}
                          {version.note ? ` · ${version.note}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {forward ? <ForwardBox users={forward.users} onForward={forward.onForward} /> : null}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex flex-wrap items-center gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {draftStatus ? (
          <span
            className={cn(
              "text-xs",
              isDirty && !isSavingDraft && !lastSavedAt ? "text-warning-foreground" : "text-muted-foreground",
            )}
          >
            {draftStatus}
          </span>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              <X />
              Cancel
            </Button>
          ) : null}
          {onReset ? (
            <Button type="button" variant="outline" onClick={onReset} disabled={isSubmitting || !isDirty}>
              Reset
            </Button>
          ) : null}
          {onSaveDraft ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveDraft()}
              disabled={isSubmitting || isSavingDraft}
            >
              <Save />
              Save draft
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
