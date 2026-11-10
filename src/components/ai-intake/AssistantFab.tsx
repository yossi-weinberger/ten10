import * as React from "react";
import { BotMessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { requestAssistantOpen } from "./assistant-open";

/** The floating button for the assistant, where the contact button was. Contact moved into the menu. */
export function AssistantFab() {
  const { t } = useTranslation("navigation");
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const checkSelectionMode = () => {
      const isSelectionActive = document.body.dataset.mobileSelectionActive === "true";
      setHidden(isSelectionActive);
    };

    checkSelectionMode();

    const observer = new MutationObserver(checkSelectionMode);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-mobile-selection-active"],
    });

    return () => observer.disconnect();
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <div className="fixed bottom-6 end-6 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            className="size-14 rounded-full shadow-lg [&_svg]:size-7"
            aria-label={t("menu.assistant")}
            onClick={requestAssistantOpen}
          >
            <BotMessageSquare aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{t("menu.assistant")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
