import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Paperclip, SquarePen } from "lucide-react";
import { isAiIntakeEnabled } from "@/lib/ai/flags";
import { loadTitheBalance } from "@/lib/ai/assistant-extras";
import type { CurrencyCode } from "@/lib/currencies";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantShell } from "./AssistantShell";
import { AssistantThread } from "./AssistantThread";
import { conversationStarted } from "./assistant-drawer-state";
import { useAssistantDrawerState } from "./use-assistant-drawer-state";
import { useAssistantDrawerIntent } from "./use-assistant-drawer-intent";
import { useAssistantDrawerComposer } from "./use-assistant-drawer-composer";
import { useAssistantDrawerThread } from "./use-assistant-drawer-thread";

/**
 * A share from the OS (or a forged cross-site post that got through) arrives here. Nothing in it reaches
 * the AI until the user acts: text waits in the composer, a file waits for "read".
 */
export interface AssistantDrawerHandle {
  receive(file: File): void;
  receiveText(text: string): void;
}

interface AssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiveRef: Ref<AssistantDrawerHandle>;
  /** A link in a reply was followed. The page changes behind the drawer, so the host closes it. */
  onNavigate?: () => void;
  /** The profile's full name. The opening greets by the first name. */
  userName?: string | null;
}

export function AssistantDrawer({
  open,
  onOpenChange,
  receiveRef,
  onNavigate,
  userName,
}: AssistantDrawerProps) {
  const state = useAssistantDrawerState();
  const defaultCurrency = useDonationStore((store) => store.settings.defaultCurrency);
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const userId = state.user?.id ?? null;
  // The opening speaks from the user's own data: the dashboard's balance, read each time it opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadTitheBalance(userId)
      .then((balance) => {
        if (!cancelled) setOpeningBalance(balance?.total ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, userId]);
  const intent = useAssistantDrawerIntent(state);
  const composer = useAssistantDrawerComposer(state, intent);
  const thread = useAssistantDrawerThread(state, intent, composer);
  state.syncConversation();

  function handleOpenChange(next: boolean) {
    if (next) state.keepRecording();
    else {
      composer.stopRecording();
      state.clearConversation();
    }
    onOpenChange(next);
  }

  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const setTextRef = useRef(state.setText);
  const disposeRef = useRef(state.disposeAssistant);
  useEffect(() => {
    setTextRef.current = state.setText;
    disposeRef.current = state.disposeAssistant;
  });
  useEffect(() => {
    return () => {
      disposeRef.current();
    };
  }, []);
  useImperativeHandle(receiveRef, () => ({
    receive(file: File) {
      setSharedFile(file);
    },
    receiveText(text: string) {
      setTextRef.current(text);
    },
  }), []);

  if (state.platform !== "web" || !isAiIntakeEnabled()) return null;

  const hasConversation = conversationStarted(state.history.length, state.activeUser);
  const firstName = userName?.trim().split(/\s+/)[0] || null;
  const openingLine = openingBalance === null
    ? undefined
    : openingBalance > 0
      ? state.t("aiIntake.openingBalance", {
        amount: formatCurrency(openingBalance, defaultCurrency as CurrencyCode, state.i18n.language.toLowerCase().startsWith("en") ? "en" : "he"),
      })
      : state.t("aiIntake.openingCovered");

  return (
    <AssistantShell
      open={open}
      onOpenChange={handleOpenChange}
      title={state.t("aiIntake.title")}
      description={state.t("aiIntake.emptyDescription")}
      initialFocusRef={state.textareaRef}
      headerActions={(
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
          disabled={!hasConversation || state.saving || state.undoing}
          onClick={() => {
            composer.stopRecording();
            state.clearConversation();
          }}
          title={state.t("aiIntake.newChat")}
          aria-label={state.t("aiIntake.newChat")}
        >
          <SquarePen aria-hidden />
        </Button>
      )}
      onReceipt={(file) => {
        void composer.handleReceipt(file);
      }}
      footer={(
        <>
        {sharedFile ? (
          // The file name gets the whole first row; the buttons sit under it, so a 320px phone shows both.
          <div role="status" className="mb-2 grid gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
            <p className="flex min-w-0 items-center gap-2">
              <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{state.t("aiIntake.sharedFile", { name: sharedFile.name })}</span>
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" className="h-10" onClick={() => setSharedFile(null)}>
                {state.t("aiIntake.sharedDismiss")}
              </Button>
              <Button
                type="button"
                className="h-10"
                onClick={() => {
                  setSharedFile(null);
                  void composer.handleReceipt(sharedFile);
                }}
              >
                {state.t("aiIntake.sharedRead")}
              </Button>
            </div>
          </div>
        ) : null}
        <AssistantComposer
          value={composer.wiring.value}
          onChange={state.setText}
          textareaRef={state.textareaRef}
          busy={composer.wiring.busyKey !== undefined}
          recording={composer.wiring.recording}
          mediaStream={state.mediaStream.current}
          elapsed={composer.wiring.elapsed}
          mode={composer.wiring.mode}
          onReceipt={(file) => {
            void composer.handleReceipt(file);
          }}
          onToggleVoice={() => {
            void composer.toggleRecording();
          }}
          onSubmit={() => {
            if (state.clarification === "amount") composer.handleAmountReply(state.text);
            else void intent.handleSubmit();
          }}
        />
        </>
      )}
    >
      {/* Closing here keeps the conversation; only the X or "new chat" clears it. */}
      <div
        className="contents"
        onClickCapture={(event) => {
          if ((event.target as Element).closest("a[href]")) (onNavigate ?? (() => onOpenChange(false)))();
        }}
      >
        <AssistantThread
          history={thread.history}
          active={thread.active}
          activeBlocks={thread.blocks}
          interactiveActive
          opening={{ name: firstName, line: openingLine }}
          onSuggestion={(suggestion) => {
            void intent.handleSubmit(suggestion);
          }}
          onReceipt={(file) => {
            void composer.handleReceipt(file);
          }}
          onVoice={() => {
            void composer.toggleRecording();
          }}
          handlers={thread.handlers}
        />
      </div>
    </AssistantShell>
  );
}
