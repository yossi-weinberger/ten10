import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AssistantComposer } from "@/components/ai-intake/AssistantComposer";
import { AssistantShell } from "@/components/ai-intake/AssistantShell";
import { AssistantThread } from "@/components/ai-intake/AssistantThread";
import { ASSISTANT_GALLERY, type GalleryScenario } from "@/components/ai-intake/assistant-gallery-fixtures";
import type { ReplyHandlers } from "@/components/ai-intake/ReplyBlockView";
import { Button } from "@/components/ui/button";

const noop = () => {};

const HANDLERS: ReplyHandlers = {
  onChooseIntent: noop,
  onChooseType: noop,
  onChooseFamily: noop,
  onSearchDescriptions: noop,
  onChooseRule: noop,
  onApproveRule: noop,
  onOpenReceipt: noop,
  onDateChange: noop,
  onDescriptionChange: noop,
  onAmountChange: noop,
  onSave: noop,
  onUndo: noop,
  onAskDelete: noop,
  onConfirmDelete: noop,
  onCancelDelete: noop,
  onDismissPair: noop,
  saving: false,
  undoing: false,
  questionCalendar: "gregorian",
};

const WIDTHS = [390, 768, 1440] as const;

export function AssistantGalleryPage() {
  const { i18n } = useTranslation("navigation");
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(390);
  const [open, setOpen] = useState<GalleryScenario | null>(null);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void (i18n as unknown as { changeLanguage: (language: string) => void }).changeLanguage(i18n.language.startsWith("en") ? "he" : "en")}>
          {i18n.language.startsWith("en") ? "English" : "עברית"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => document.documentElement.classList.toggle("dark")}>
          Theme
        </Button>
        {WIDTHS.map((value) => (
          <Button key={value} type="button" variant={width === value ? "default" : "outline"} size="sm" onClick={() => setWidth(value)}>
            {value}
          </Button>
        ))}
      </div>
      {ASSISTANT_GALLERY.map((scenario) => (
        <section key={scenario.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{scenario.title}</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(scenario)}>
              Open
            </Button>
          </div>
          <div className="h-[640px] overflow-hidden rounded-xl border bg-background" style={{ width }}>
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <AssistantThread
                  history={scenario.history}
                  active={scenario.active}
                  activeBlocks={scenario.activeBlocks}
                  interactiveActive
                  onSuggestion={noop}
                  handlers={HANDLERS}
                />
              </div>
              <div className="border-t p-3">
                <AssistantComposer
                  value=""
                  onChange={noop}
                  onSubmit={noop}
                  onReceipt={noop}
                  onToggleVoice={noop}
                  busy={false}
                  recording={false}
                  mode={scenario.id === "amount" ? "amount" : "message"}
                  textareaRef={{ current: null }}
                />
              </div>
            </div>
          </div>
        </section>
      ))}
      <AssistantShell
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setOpen(null);
        }}
        title="עוזר Ten10"
        description="גלריה"
        initialFocusRef={{ current: null }}
        footer={null}
      >
        {open ? (
          <AssistantThread
            history={open.history}
            active={open.active}
            activeBlocks={open.activeBlocks}
            interactiveActive
            onSuggestion={noop}
            handlers={HANDLERS}
          />
        ) : null}
      </AssistantShell>
    </div>
  );
}
