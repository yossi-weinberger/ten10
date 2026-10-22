import { ArrowDown, ChartColumn, CopyCheck, CreditCard, FileText, ListChecks, Mic } from "lucide-react";
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

const SUGGESTIONS = [
  { key: "transaction", icon: CreditCard },
  { key: "question", icon: ChartColumn },
  { key: "duplicates", icon: CopyCheck },
  { key: "rule", icon: ListChecks },
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
  handlers,
}: {
  history: AssistantTurn[];
  active: UserTurn | null;
  activeBlocks: ReplyBlock[];
  interactiveActive: boolean;
  onSuggestion: (text: string) => void;
  handlers: ReplyHandlers;
}) {
  const { t } = useTranslation("navigation");
  const reduce = useReducedMotion();
  if (history.length === 0 && !active) {
    const greeting = t(`aiIntake.greeting.${greetingKey(new Date().getHours())}`);
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <AssistantMark size="md" />
          <EmptyTitle>{greeting}</EmptyTitle>
          <EmptyDescription>{t("aiIntake.emptyDescription")}</EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map(({ key, icon: Icon }, index) => (
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
                onClick={() => onSuggestion(t(`aiIntake.suggestions.${key}`))}
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
              const thinking = turn.blocks.some((block) => block.kind === "thinking");
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
                        <MessageAvatar className="bg-transparent">
                          <AssistantMark thinking={thinking} />
                        </MessageAvatar>
                        <MessageContent>
                          <motion.div
                            className="flex flex-col gap-2.5"
                            variants={reduce ? undefined : blockListVariants}
                            initial={reduce || !turn.fresh ? false : "initial"}
                            animate="animate"
                          >
                            {turn.blocks.map((block, index) => (
                              <motion.div key={`${block.kind}-${index}`} variants={reduce ? undefined : fieldVariants}>
                                <ReplyBlockView block={block} interactive={turn.interactive} handlers={handlers} />
                              </motion.div>
                            ))}
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
