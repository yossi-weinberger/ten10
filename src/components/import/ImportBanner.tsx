import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportBanner() {
  const { t } = useTranslation("import");
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Upload className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        <span className="text-sm text-foreground">{t("addPageBanner")}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate({ to: "/transactions-table/import" })}
        className="shrink-0 gap-1.5"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        {t("entryButton")}
      </Button>
    </motion.div>
  );
}
