import { useRef } from "react";
import { ArrowDown, BookOpen, BotMessageSquare, ChartColumn, CreditCard, FileText, Mic, Receipt, Repeat, Scale } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Attachment,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
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
import { BASE_TYPE_TINT } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { AssistantMark } from "./AssistantMark";
import { KIND_TINT } from "./blocks/card-style";
import type { SavedFooter } from "./blocks/SavedLine";
import { blockListVariants, fieldVariants, greetingKey, turnVariants } from "./assistant-motion";
import type { AssistantTurn, ReplyBlock, UserTurn } from "./assistant-reply-view";
import { ReplyBlockView, type ReplyHandlers } from "./ReplyBlockView";

/** One chip per capability, its icon tinted like the cards it leads to. "receipt" opens the file picker; the others send their text. */
const SUGGESTIONS = [
  { key: "transaction", icon: CreditCard, tint: BASE_TYPE_TINT.expense },
  { key: "recurring", icon: Repeat, tint: BASE_TYPE_TINT.donation },
  { key: "receipt", icon: Receipt, tint: KIND_TINT.neutral },
  { key: "question", icon: ChartColumn, tint: KIND_TINT.knowledge },
  { key: "balance", icon: Scale, tint: BASE_TYPE_TINT.donation },
  { key: "inspiration", icon: BotMessageSquare, tint: KIND_TINT.knowledge },
  { key: "halacha", icon: BookOpen, tint: KIND_TINT.knowledge },
] as const;

/**
 * A saved draft or standing order shows the turn's status, undo and receipt on its own last line.
 * Returns the saved card's index (-1 when there is none) and that line.
 */
function savedCardFooter(blocks: ReplyBlock[], interactive: boolean, handlers: ReplyHandlers): { at: number; footer?: SavedFooter } {
  const at = blocks.findIndex((block) => (block.kind === "draft" && block.view.locked) || (block.kind === "recurring" && block.card.saved));
  if (at < 0) return { at };
  let status: SavedFooter["status"] = null;
  let undo = false;
  let receiptId: string | null = null;
  blocks.forEach((block, index) => {
    if (block.kind === "receipt") receiptId = block.artifactId;
    if (index <= at) return;
    if (block.kind === "status") status = block.status;
    if (block.kind === "undo") undo = true;
  });
  const artifactId: string | null = receiptId;
  return {
    at,
    footer: {
      status,
      onOpenReceipt: artifactId ? () => handlers.onOpenReceipt(artifactId) : undefined,
      onUndo: interactive && undo ? handlers.onUndo : undefined,
      undoing: handlers.undoing,
    },
  };
}

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
      <Empty className="h-full min-h-0 justify-start gap-4 overflow-y-auto border-0 p-4 md:p-6">
        {/* No mark here: the panel's header already shows it. */}
        <EmptyHeader className="mt-auto shrink-0">
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
        <div className="mb-auto shrink-0 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.filter(({ key }) => key !== "receipt" || onReceipt).map(({ key, icon: Icon, tint }, index) => (
            <motion.div
              key={key}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : index * 0.04, duration: 0.22 }}
            >
              <button
                type="button"
                className="inline-flex h-11 min-h-11 items-center gap-1.5 rounded-full border bg-card pe-3 ps-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  if (key === "receipt") fileRef.current?.click();
                  else onSuggestion(t(`aiIntake.suggestions.${key}`));
                }}
              >
                <span className={`inline-flex size-6 items-center justify-center rounded-full ${tint}`}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {t(`aiIntake.suggestions.${key}`)}
              </button>
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
              const saved = savedCardFooter(turn.blocks, turn.interactive, handlers);
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
                        {/* No avatar column on narrow phones: the cards get the width. Hidden under 400px to maximize card space. */}
                        <MessageAvatar className="bg-transparent max-[399px]:hidden">
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
                              // These live on the saved card's last line.
                              if (saved.at >= 0 && (block.kind === "receipt" || (index > saved.at && (block.kind === "status" || block.kind === "undo")))) return null;
                              // Elsewhere, "Saved" and its undo share one row.
                              if (block.kind === "undo" && turn.blocks[index - 1]?.kind === "status") return null;
                              const next = turn.blocks[index + 1];
                              const undo = block.kind === "status" && next?.kind === "undo" && turn.interactive ? next : null;
                              return (
                                <motion.div
                                  key={`${block.kind}-${index}`}
                                  variants={reduce ? undefined : fieldVariants}
                                  className={undo ? "flex flex-wrap items-center justify-between gap-2" : undefined}
                                >
                                  <ReplyBlockView
                                    block={block}
                                    interactive={turn.interactive}
                                    handlers={handlers}
                                    footer={index === saved.at ? saved.footer : undefined}
                                  />
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
