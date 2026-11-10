import type { ClarificationField } from "@/lib/ai/classify-intake";
import { composerBusyKey, composerMode, type DrawerThinkingInput } from "./assistant-drawer-state";

export interface ComposerWiringInput extends DrawerThinkingInput {
  text: string;
  clarification: ClarificationField | null;
  recording: boolean;
  elapsed: number;
}

export interface ComposerWiring {
  value: string;
  busyKey: ReturnType<typeof composerBusyKey>;
  recording: boolean;
  elapsed: number;
  mode: "amount" | "message";
}

/** Props the drawer passes to AssistantComposer, minus callbacks and the textarea ref. */
export function composerWiring(input: ComposerWiringInput): ComposerWiring {
  return {
    value: input.text,
    busyKey: composerBusyKey(input),
    recording: input.recording,
    elapsed: input.elapsed,
    mode: composerMode(input.clarification),
  };
}

export function amountReplySource(pendingText: string, reply: string): string {
  return `${pendingText} ${reply}`.trim();
}
