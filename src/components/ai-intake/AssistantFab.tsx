import { BotMessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { requestAssistantOpen } from "./assistant-open";

/** The floating button for the assistant, where the contact button was. Contact moved into the menu. */
export function AssistantFab() {
  const { t } = useTranslation("navigation");
  return (
    <div className="fixed bottom-6 end-6 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            className="size-14 mobile-landscape:size-12 rounded-full shadow-lg [&_svg]:size-7 mobile-landscape:[&_svg]:size-6"
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
