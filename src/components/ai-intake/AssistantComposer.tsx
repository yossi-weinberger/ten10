import { type ClipboardEvent, type FormEvent, type KeyboardEvent, type RefObject, useRef } from "react";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

interface AssistantComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReceipt: (file: File | undefined) => void;
  onToggleVoice: () => void;
  /** Busy reading, saving or answering. The thread shows what; the composer only waits. */
  busy?: boolean;
  recording: boolean;
  level?: number;
  elapsed?: number;
  mode: "message" | "amount";
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onReceipt,
  onToggleVoice,
  busy = false,
  recording,
  level = 0,
  elapsed = 0,
  mode,
  textareaRef,
}: AssistantComposerProps) {
  const { t } = useTranslation("navigation");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const label = t(mode === "amount" ? "aiIntake.askAmount" : "aiIntake.placeholder");
  const canSend = value.trim().length > 0 && !busy && !recording;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    onSubmit();
  }

  // Enter sends on every device, phones included (Yossi's call); Shift+Enter is a new line.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = event.clipboardData.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) return;
    event.preventDefault();
    event.stopPropagation();
    onReceipt(file);
  }

  const weights = [0.45, 0.7, 1, 0.7, 0.45];
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <form onSubmit={submit}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          onReceipt(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <InputGroup>
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          rows={1}
          inputMode={mode === "amount" ? "decimal" : undefined}
          enterKeyHint="send"
          placeholder={label}
          aria-label={label}
          className={recording ? "sr-only" : "max-h-40 min-h-12 text-base [field-sizing:content]"}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        {recording ? (
          <div className="flex min-h-12 items-center gap-2 px-3" role="status" aria-label={t("aiIntake.recording")}>
            <span className="size-2 rounded-full bg-destructive animate-pulse motion-reduce:animate-none" />
            {weights.map((weight, index) => (
              <span
                key={index}
                className="h-6 w-1 origin-bottom rounded-full bg-primary motion-reduce:!transform-none"
                style={{ transform: `scaleY(${0.25 + level * weight})` }}
              />
            ))}
            <span className="text-sm tabular-nums text-muted-foreground">{clock} / 1:00</span>
          </div>
        ) : null}
        <InputGroupAddon align="block-end">
          <InputGroupButton
            size="icon-sm"
            variant="outline"
            className="size-10 rounded-full sm:size-8"
            aria-label={t("aiIntake.receipt")}
            disabled={busy || recording}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip aria-hidden />
          </InputGroupButton>
          <InputGroupButton
            size="icon-sm"
            variant={recording ? "destructive" : "outline"}
            className={recording ? "size-10 animate-pulse rounded-full motion-reduce:animate-none sm:size-8" : "size-10 rounded-full sm:size-8"}
            aria-label={t(recording ? "aiIntake.voiceStop" : "aiIntake.voice")}
            aria-pressed={recording}
            disabled={busy}
            onClick={onToggleVoice}
          >
            {recording ? <Square aria-hidden /> : <Mic aria-hidden />}
          </InputGroupButton>
          <InputGroupButton
            type="submit"
            size="icon-sm"
            variant="default"
            className="ms-auto size-10 rounded-full sm:size-8"
            aria-label={t("aiIntake.send")}
            disabled={!canSend}
          >
            <ArrowUp aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
