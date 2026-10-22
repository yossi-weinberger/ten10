import { type FormEvent, type KeyboardEvent, type RefObject, useRef } from "react";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
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
  busyLabel?: string;
  recording: boolean;
  mode: "message" | "amount";
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onReceipt,
  onToggleVoice,
  busyLabel,
  recording,
  mode,
  textareaRef,
}: AssistantComposerProps) {
  const { t } = useTranslation("navigation");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const label = t(mode === "amount" ? "aiIntake.askAmount" : "aiIntake.placeholder");
  const busy = Boolean(busyLabel);
  const canSend = value.trim().length > 0 && !busy && !recording;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    onSubmit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    event.preventDefault();
    submit();
  }

  return (
    <form onSubmit={submit}>
      {busyLabel ? (
        <p role="status" className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {busyLabel}
        </p>
      ) : null}
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
          enterKeyHint="send"
          inputMode={mode === "amount" ? "decimal" : undefined}
          placeholder={label}
          aria-label={label}
          className="max-h-40 min-h-12 [field-sizing:content]"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            size="icon-sm"
            variant="outline"
            className="rounded-full"
            aria-label={t("aiIntake.receipt")}
            disabled={busy || recording}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip aria-hidden />
          </InputGroupButton>
          <InputGroupButton
            size="icon-sm"
            variant={recording ? "destructive" : "outline"}
            className={recording ? "animate-pulse rounded-full" : "rounded-full"}
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
            className="ms-auto rounded-full"
            aria-label={t("aiIntake.send")}
            disabled={!canSend}
          >
            {busy ? <Spinner /> : <ArrowUp aria-hidden />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
