import { type ClipboardEvent, type FormEvent, type KeyboardEvent, type RefObject, useRef } from "react";
import { ArrowUp, Camera, Check, Image, Mic, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { useMediaQuery } from "@/hooks/use-media-query";

interface AssistantComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReceipt: (file: File | undefined) => void;
  onToggleVoice: () => void;
  onCancelRecording?: () => void;
  /** Busy reading, saving or answering. The thread shows what; the composer only waits. */
  busy?: boolean;
  recording: boolean;
  transcribing: boolean;
  mediaStream?: MediaStream | null;
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
  onCancelRecording,
  busy = false,
  recording,
  transcribing,
  mediaStream,
  elapsed = 0,
  mode,
  textareaRef,
}: AssistantComposerProps) {
  const { t } = useTranslation("navigation");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
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
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={isMobile ? "environment" : undefined}
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
        {recording || transcribing ? (
          <div className="flex min-h-12 w-full items-center gap-2 px-3" role="status" aria-label={t(transcribing ? "aiIntake.transcribing" : "aiIntake.recording")}>
            {recording ? (
              <span className="size-2 rounded-full bg-destructive animate-pulse motion-reduce:bg-destructive/70 motion-reduce:animate-none" />
            ) : null}
            <LiveWaveform
              active={recording}
              processing={transcribing}
              mediaStream={mediaStream}
              mode="scrolling"
              height={40}
              barWidth={3}
              barGap={1}
              barRadius={1.5}
              sensitivity={1.2}
              className="min-w-0 flex-1"
            />
            {recording ? (
              <span dir="ltr" className="text-sm tabular-nums text-muted-foreground">{clock} / 1:00</span>
            ) : null}
          </div>
        ) : null}
        <InputGroupAddon align="block-end">
          {recording && onCancelRecording ? (
            <InputGroupButton
              size="icon-sm"
              variant="outline"
              className="size-11 min-h-11 min-w-11 rounded-full border-destructive text-destructive hover:bg-destructive/10 sm:size-11"
              aria-label={t("aiIntake.voiceCancel")}
              onClick={onCancelRecording}
            >
              <X aria-hidden />
            </InputGroupButton>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  size="icon-sm"
                  variant="outline"
                  className="size-11 min-h-11 min-w-11 rounded-full sm:size-11"
                  aria-label={t("aiIntake.attach")}
                  disabled={busy}
                >
                  <Plus aria-hidden />
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => cameraRef.current?.click()}>
                  <Camera className="me-2 size-4" aria-hidden />
                  {t("aiIntake.attachCamera")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                  <Image className="me-2 size-4" aria-hidden />
                  {t("aiIntake.attachImage")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!recording ? (
            <InputGroupButton
              size="icon-sm"
              variant="outline"
              className="size-11 min-h-11 min-w-11 rounded-full sm:size-11"
              aria-label={t("aiIntake.voice")}
              disabled={busy}
              onClick={onToggleVoice}
            >
              <Mic aria-hidden />
            </InputGroupButton>
          ) : null}
          {recording ? (
            <InputGroupButton
              size="icon-sm"
              variant="outline"
              className="ms-auto size-11 min-h-11 min-w-11 rounded-full border-success text-success hover:bg-success/10 sm:size-11"
              aria-label={t("aiIntake.voiceStop")}
              onClick={onToggleVoice}
            >
              <Check aria-hidden />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              className="ms-auto size-11 min-h-11 min-w-11 rounded-full sm:size-11"
              aria-label={t("aiIntake.send")}
              disabled={!canSend}
            >
              <ArrowUp aria-hidden />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
