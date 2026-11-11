import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Paperclip, SquarePen } from "lucide-react";
import { isAiIntakeEnabled } from "@/lib/ai/flags";
import { loadTitheBalance } from "@/lib/ai/assistant-extras";
import type { CurrencyCode } from "@/lib/currencies";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";
import { onBetaConsentRequired } from "@/lib/ai/beta-consent-required";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantShell } from "./AssistantShell";
import { AssistantThread } from "./AssistantThread";
import { BetaTermsDialog } from "./BetaTermsDialog";
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

  // Beta consent gate - fail closed: start checking when drawer opens with a userId
  const [consentState, setConsentState] = useState<{
    checking: boolean;
    accepted: boolean | null;
    showDialog: boolean;
  }>(() => ({ checking: open && !!userId, accepted: null, showDialog: false }));

  // Check consent status when drawer opens
  useEffect(() => {
    if (!open || !userId) return;

    let cancelled = false;

    const checkConsent = async () => {
      setConsentState({ checking: true, accepted: null, showDialog: false });

      try {
        const { data, error } = await supabase.rpc("ai_beta_consent_status");

        if (cancelled) return;

        if (error) {
          console.error("Failed to check AI beta consent:", error);
          setConsentState({ checking: false, accepted: false, showDialog: true });
        } else if (data) {
          const accepted = data.accepted === true && data.version === AI_BETA_TERMS_VERSION;
          setConsentState({ checking: false, accepted, showDialog: !accepted });
        } else {
          setConsentState({ checking: false, accepted: false, showDialog: true });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Unexpected error checking consent:", err);
        setConsentState({ checking: false, accepted: false, showDialog: true });
      }
    };

    void checkConsent();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  useEffect(() => {
    return onBetaConsentRequired(() => {
      setConsentState({ checking: false, accepted: false, showDialog: true });
    });
  }, []);

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

  // Derive consent OK: fail closed unless explicitly accepted
  const consentOk = !!userId && !consentState.checking && consentState.accepted === true;

  const handleBetaAccept = () => {
    setConsentState({ checking: false, accepted: true, showDialog: false });
  };

  const handleBetaDecline = () => {
    setConsentState((prev) => ({ ...prev, showDialog: false }));
    handleOpenChange(false); // Use handleOpenChange to stop recording and clear conversation
  };

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
    <>
      <BetaTermsDialog
        open={consentState.showDialog}
        onAccept={handleBetaAccept}
        onDecline={handleBetaDecline}
      />
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
      onReceipt={consentOk ? (file) => {
        void composer.handleReceipt(file);
      } : undefined}
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
                disabled={!consentOk}
                onClick={() => {
                  if (!consentOk) return;
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
          disabled={!consentOk}
          recording={composer.wiring.recording}
          transcribing={composer.wiring.transcribing}
          mediaStream={state.mediaStream.current}
          elapsed={composer.wiring.elapsed}
          mode={composer.wiring.mode}
          onReceipt={(file) => {
            if (!consentOk) return;
            void composer.handleReceipt(file);
          }}
          onToggleVoice={() => {
            if (!consentOk) return;
            void composer.toggleRecording();
          }}
          onCancelRecording={() => {
            composer.cancelRecording();
          }}
          onSubmit={() => {
            if (!consentOk) return;
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
          interactiveActive={consentOk}
          disabled={!consentOk}
          transcribing={composer.wiring.transcribing}
          opening={consentOk ? { name: firstName, line: openingLine } : undefined}
          onSuggestion={(suggestion) => {
            if (!consentOk) return;
            void intent.handleSubmit(suggestion);
          }}
          onReceipt={(file) => {
            if (!consentOk) return;
            void composer.handleReceipt(file);
          }}
          onVoice={() => {
            if (!consentOk) return;
            void composer.toggleRecording();
          }}
          handlers={thread.handlers}
          limitInfo={state.limitInfo}
        />
      </div>
    </AssistantShell>
    </>
  );
}
