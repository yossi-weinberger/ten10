import { useRef } from "react";
import { ArrowDown, BookOpen, ChartColumn, CreditCard, FileText, Mic, Receipt, Repeat, Scale, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Attachment,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { AssistantMark } from "./AssistantMark";
import { blockListVariants, fieldVariants, greetingKey, turnVariants } from "./assistant-motion";
import type { AssistantTurn, ReplyBlock, UserTurn } from "./assistant-reply-view";
import { ReplyBlockView, type ReplyHandlers } from "./ReplyBlockView";

/** One chip per capability. "receipt" opens the file picker; the others send their text. */
const SUGGESTIONS = [
  { key: "transaction", icon: CreditCard },
  { key: "recurring", icon: Repeat },
  { key: "receipt", icon: Receipt },
  { key: "question", icon: ChartColumn },
  { key: "balance", icon: Scale },
  { key: "inspiration", icon: Sparkles },
  { key: "halacha", icon: BookOpen },
] as const;

function UserBubble({ turn, scanning }: { turn: UserTurn; scanning: boolean }) {
  if (turn.kind === "receipt") {
    return (
      <Attachment orientation="vertical" className="relative overflow-hidden">
        <AttachmentMedia variant={turn.previewUrl ? "image" : "icon"}>
          {turn.previewUrl ? <img src={turn.previewUrl} alt={turn.fileName} /> : <FileText aria-hidden />}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{turn.fileName}</AttachmentTitle>
        </AttachmentContent>
        {scanning ? (
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-primary/20 animate-receipt-scan motion-reduce:hidden" />
        ) : null}
      </Attachment>
    );
  }
  return (
    <Bubble align="end" variant="muted">
      <BubbleContent>
        {turn.kind === "voice" ? <Mic className="me-1 inline size-3.5" aria-hidden /> : null}
        {turn.text}
      </BubbleContent>
    </Bubble>
  );
}

export function AssistantThread({
  history,
  active,
  activeBlocks,
  interactiveActive,
  onSuggestion,
  onReceipt,
  opening,
  handlers,
}: {
  history: AssistantTurn[];
  active: UserTurn | null;
  activeBlocks: ReplyBlock[];
  interactiveActive: boolean;
  onSuggestion: (text: string) => void;
  onReceipt?: (file: File) => void;
  /** The greeting's first name and a line from the user's data. Missing parts fall back to the generic text. */
  opening?: { name: string | null; line?: string };
  handlers: ReplyHandlers;
}) {
  const { t } = useTranslation("navigation");
  const reduce = useReducedMotion();
  const fileRef = useRef<HTMLInputElement | null>(null);
  if (history.length === 0 && !active) {
    const hello = t(`aiIntake.greeting.${greetingKey(new Date().getHours())}`);
    const greeting = opening?.name ? t("aiIntake.greetingNamed", { greeting: hello, name: opening.name }) : hello;
    return (
      // Scrolls; auto margins center it but keep the top reachable when the screen is short or the keyboard is open.
      <Empty className="h-full justify-start gap-4 overflow-y-auto border-0 p-4 md:p-6">
        <EmptyHeader className="mt-auto">
          <AssistantMark size="md" />
          <EmptyTitle>{greeting}</EmptyTitle>
          <EmptyDescription>{opening?.line ?? t("aiIntake.emptyDescription")}</EmptyDescription>
        </EmptyHeader>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onReceipt?.(file);
            event.target.value = "";
          }}
        />
        <div className="mb-auto flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.filter(({ key }) => key !== "receipt" || onReceipt).map(({ key, icon: Icon }, index) => (
            <motion.div
              key={key}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : index * 0.04, duration: 0.22 }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  if (key === "receipt") fileRef.current?.click();
                  else onSuggestion(t(`aiIntake.suggestions.${key}`));
                }}
              >
                <Icon aria-hidden />
                {t(`aiIntake.suggestions.${key}`)}
              </Button>
            </motion.div>
          ))}
        </div>
      </Empty>
    );
  }

  const turns: Array<{ id: string; user: UserTurn; blocks: ReplyBlock[]; interactive: boolean; fresh: boolean }> = [
    ...history.map((turn) => ({ ...turn, interactive: false, fresh: false })),
    ...(active ? [{ id: "active", user: active, blocks: activeBlocks, interactive: interactiveActive, fresh: true }] : []),
  ];

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-6 px-4 py-4" role="log" aria-live="polite">
            {turns.map((turn) => {
              const scanning = turn.fresh && turn.blocks.some((block) => block.kind === "thinking" && block.phase === "receipt");
              return (
                <motion.div
                  key={turn.id}
                  className="flex flex-col gap-3"
                  variants={reduce ? undefined : turnVariants}
                  initial={reduce || !turn.fresh ? false : "initial"}
                  animate="animate"
                >
                  <MessageScrollerItem messageId={turn.id} scrollAnchor>
                    <Message align="end">
                      <MessageContent>
                        <UserBubble turn={turn.user} scanning={scanning} />
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                  {turn.blocks.length > 0 ? (
                    <MessageScrollerItem messageId={`${turn.id}-reply`}>
                      <Message>
                        {/* No avatar column on narrow phones: the cards get the width. */}
                        <MessageAvatar className="bg-transparent max-sm:hidden">
                          <AssistantMark />
                        </MessageAvatar>
                        <MessageContent>
                          <motion.div
                            className="flex flex-col gap-2.5"
                            variants={reduce ? undefined : blockListVariants}
                            initial={reduce || !turn.fresh ? false : "initial"}
                            animate="animate"
                          >
                            {turn.blocks.map((block, index) => {
                              // "Saved" and its undo share one row.
                              if (block.kind === "undo" && turn.blocks[index - 1]?.kind === "status") return null;
                              const next = turn.blocks[index + 1];
                              const undo = block.kind === "status" && next?.kind === "undo" && turn.interactive ? next : null;
                              return (
                                <motion.div
                                  key={`${block.kind}-${index}`}
                                  variants={reduce ? undefined : fieldVariants}
                                  className={undo ? "flex flex-wrap items-center justify-between gap-2" : undefined}
                                >
                                  <ReplyBlockView block={block} interactive={turn.interactive} handlers={handlers} />
                                  {undo ? <ReplyBlockView block={undo} interactive={turn.interactive} handlers={handlers} /> : null}
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ) : null}
                </motion.div>
              );
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton aria-label={t("aiIntake.scrollToLatest")}>
          <ArrowDown aria-hidden />
        </MessageScrollerButton>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
