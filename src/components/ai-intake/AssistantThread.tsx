import { FileText, Image as ImageIcon, Mic, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Attachment,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import type { AssistantTurn, ReplyBlock, UserTurn } from "./assistant-reply-view";
import { ReplyBlockView, type ReplyHandlers } from "./ReplyBlockView";

const SUGGESTIONS = ["transaction", "question", "duplicates", "rule"] as const;

function UserBubble({ turn }: { turn: UserTurn }) {
  if (turn.kind === "receipt") {
    const Icon = turn.mimeType === "application/pdf" ? FileText : ImageIcon;
    return (
      <Attachment size="sm">
        <AttachmentMedia>
          <Icon aria-hidden />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{turn.fileName}</AttachmentTitle>
        </AttachmentContent>
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
  if (history.length === 0 && !active) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{t("aiIntake.emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("aiIntake.emptyDescription")}</EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((key) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => onSuggestion(t(`aiIntake.suggestions.${key}`))}
            >
              {t(`aiIntake.suggestions.${key}`)}
            </Button>
          ))}
        </div>
      </Empty>
    );
  }

  const turns: Array<{ id: string; user: UserTurn; blocks: ReplyBlock[]; interactive: boolean }> = [
    ...history.map((turn) => ({ ...turn, interactive: false })),
    ...(active ? [{ id: "active", user: active, blocks: activeBlocks, interactive: interactiveActive }] : []),
  ];

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-6 px-4 py-4" role="log" aria-live="polite">
            {turns.map((turn) => (
              <div key={turn.id} className="flex flex-col gap-3">
                <MessageScrollerItem messageId={turn.id} scrollAnchor>
                  <Message align="end">
                    <MessageContent>
                      <UserBubble turn={turn.user} />
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
                {turn.blocks.length > 0 ? (
                  <MessageScrollerItem messageId={`${turn.id}-reply`}>
                    <Message>
                      <MessageContent>
                        {turn.blocks.map((block, index) => (
                          <ReplyBlockView
                            key={`${block.kind}-${index}`}
                            block={block}
                            interactive={turn.interactive}
                            handlers={handlers}
                          />
                        ))}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ) : null}
              </div>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
