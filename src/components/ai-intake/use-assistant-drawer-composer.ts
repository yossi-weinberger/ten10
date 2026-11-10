import { readReceiptImage } from "@/lib/ai/read-receipt";
import { openAiReceipt } from "@/lib/ai/open-receipt";
import { receiptAsDraft } from "@/lib/ai/receipt-card";
import { transcribeSpeech } from "@/lib/ai/transcribe-speech";
import { getCurrentLocalDate } from "@/lib/utils/local-date";
import { splitItems } from "@/lib/ai/split-items";
import { openCardEvidence, rememberClosed, rememberDraft } from "@/lib/ai/assistant-turn";
import { digitsOnlyAmount } from "@/lib/ai/split-draft";
import {
  isSingleReceipt,
  openReceiptFailureStatus,
  receiptFailureStatus,
  receiptRouteStatus,
  voiceFailureStatus,
} from "./assistant-drawer-intent";
import { amountReplySource, composerWiring } from "./assistant-drawer-composer";
import type { AssistantDrawerState } from "./use-assistant-drawer-state";
import type { AssistantDrawerIntent } from "./use-assistant-drawer-intent";

export function useAssistantDrawerComposer(
  state: AssistantDrawerState,
  intent: Pick<AssistantDrawerIntent, "handleSubmit" | "showIntent" | "showHeld">,
) {
  const {
    defaultCurrency,
    questionCalendar,
    text,
    setText,
    intent: currentIntent,
    receiptArtifactId,
    setReceiptArtifactId,
    setReceiptLink,
    setClarification,
    held,
    splitRef,
    setPendingText,
    setReceiptFields,
    setParsedRule,
    setRuleChoice,
    setHalachaNamespace,
    setHalachaUserQuestion,
    setChecking,
    setPendingPhase,
    setElapsed,
    recording,
    setRecording,
    transcribing,
    setTranscribing,
    setStatus,
    askIntent,
    dataReply,
    duplicateScan,
    clarification,
    elapsed,
    pendingPhase,
    checking,
    previewUrls,
    requestRef,
    memoryRef,
    turnStart,
    contextRef,
    discardRecording,
    recorder,
    recordTimer,
    mediaStream,
    elapsedTimer,
    showDraft,
    beginTurn,
  } = state;

  function stopMeter() {
    if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    elapsedTimer.current = null;
    mediaStream.current = null;
  }

  function stopRecording() {
    discardRecording.current = true;
    stopMeter();
    if (recordTimer.current) {
      clearTimeout(recordTimer.current);
      recordTimer.current = null;
    }
    const active = recorder.current;
    if (active && active.state !== "inactive") active.stop();
  }

  async function openReceiptFile(artifactId = receiptArtifactId) {
    if (!artifactId) return;
    setReceiptLink(null);
    const result = await openAiReceipt({ artifactId });
    if (result.status === "opened") return;
    if (result.status === "blocked") {
      setReceiptLink(result.url);
      return;
    }
    setStatus(openReceiptFailureStatus(result.status));
  }

  async function handleReceipt(file: File | undefined) {
    if (!file) return;
    const request = ++requestRef.current;
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    if (previewUrl) previewUrls.current.push(previewUrl);
    beginTurn({ kind: "receipt", fileName: file.name, mimeType: file.type, previewUrl });
    setPendingPhase("receipt");
    setChecking(true);
    setStatus(null);
    const result = await readReceiptImage(file, defaultCurrency);
    if (requestRef.current !== request) return;
    setChecking(false);
    if (!result.ok) {
      memoryRef.current = rememberClosed(turnStart.current);
      setReceiptArtifactId(null);
      state.setIntent(null);
      setReceiptFields(null);
      showDraft(null, "");
      setStatus(receiptFailureStatus(result.reason));
      return;
    }
    if (!isSingleReceipt(result)) {
      memoryRef.current = rememberClosed(turnStart.current);
      setReceiptArtifactId(null);
      state.setIntent(null);
      setReceiptFields(null);
      showDraft(null, "");
      switch (result.route) {
        case "several_receipts":
        case "statement":
          setStatus(receiptRouteStatus(result.route));
          break;
        default: {
          const unreachable: never = result;
          return unreachable;
        }
      }
      return;
    }
    state.setIntent("add_transaction");
    setPendingText("");
    setParsedRule(null);
    setRuleChoice(null);
    setHalachaNamespace(null);
    setHalachaUserQuestion(null);
    setReceiptArtifactId(result.artifactId);
    memoryRef.current = rememberDraft(turnStart.current, null, { ...result.fields, type: result.fields.ruledType }, "one receipt");
    if (result.fields.ruledType && result.fields.ruleName) {
      setReceiptFields(null);
      setClarification(null);
      showDraft(receiptAsDraft(result.fields, result.fields.ruledType), result.fields.ruleName);
      if (result.fields.checkDate) setStatus("checkDate");
      return;
    }
    setReceiptFields(result.fields);
    setClarification("type");
    showDraft(null, "");
  }

  async function finishVoice(blob: Blob) {
    const request = ++requestRef.current;
    setPendingPhase("voice");
    setChecking(true);
    setTranscribing(true);
    const heard = await transcribeSpeech(blob);
    if (requestRef.current !== request) return;
    setTranscribing(false);
    setChecking(false);
    if (!heard.ok) {
      beginTurn({ kind: "voice", text: "" });
      setStatus(voiceFailureStatus(heard.reason));
      return;
    }
    setText("");
    await intent.handleSubmit(heard.text, "voice");
  }

  async function toggleRecording() {
    if (checking) return;
    const active = recorder.current;
    if (active && active.state !== "inactive") {
      active.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("voiceDenied");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
    } catch {
      setStatus("voiceDenied");
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "";
    const media = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.current = media;
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      stopMeter();
      if (recordTimer.current) clearTimeout(recordTimer.current);
      recorder.current = null;
      setRecording(false);
      if (discardRecording.current) {
        setTranscribing(false);
        return;
      }
      void finishVoice(new Blob(chunks, { type: media.mimeType || "audio/webm" }));
    };
    // A close or "new chat" set this for the recording it stopped; this one is new.
    // The drawer opens by prop, so onOpenChange(true) never clears it.
    discardRecording.current = false;
    media.start();
    setRecording(true);
    setStatus(null);
    const started = Date.now();
    setElapsed(0);
    elapsedTimer.current = setInterval(() => {
      setElapsed(Math.min(60, Math.floor((Date.now() - started) / 1000)));
    }, 100);
    recordTimer.current = setTimeout(() => {
      if (media.state !== "inactive") media.stop();
    }, 60_000);
  }

  function handleAmountReply(reply: string) {
    const trimmed = reply.trim();
    if (!trimmed) return;
    const previous = held.current;
    const source = amountReplySource(state.pendingText, trimmed);
    const request = ++requestRef.current;
    beginTurn({ kind: "text", text: trimmed });
    setText("");
    state.setIntent("add_transaction");
    setPendingText(source);
    held.current = previous;
    const digits = digitsOnlyAmount(trimmed);
    if (digits !== null && previous) {
      intent.showHeld({ ...previous, amount: digits, checkAmount: false });
      memoryRef.current = rememberDraft(turnStart.current, trimmed, { ...previous, amount: digits });
      return;
    }
    setPendingPhase("reading");
    setChecking(true);
    void splitItems(source, getCurrentLocalDate(), {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      receivedAt: new Date().toISOString(),
      defaultCurrency,
      calendar: questionCalendar,
      context: contextRef.current,
      cardEvidence: openCardEvidence(turnStart.current),
    }).then((split) => {
      if (requestRef.current !== request) return;
      setChecking(false);
      splitRef.current = split;
      intent.showIntent(source, "add_transaction", false, trimmed);
    });
  }

  const wiring = composerWiring({
    text,
    checking,
    pendingPhase,
    askIntent,
    intent: currentIntent,
    dataReply,
    duplicateScan,
    saving: state.saving || state.undoing,
    clarification,
    recording,
    transcribing,
    elapsed,
  });

  return {
    stopMeter,
    stopRecording,
    openReceiptFile,
    handleReceipt,
    finishVoice,
    toggleRecording,
    handleAmountReply,
    wiring,
  };
}

export type AssistantDrawerComposer = ReturnType<typeof useAssistantDrawerComposer>;
