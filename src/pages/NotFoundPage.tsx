import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Brand404 } from "@/components/brand/Brand404";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t, i18n } = useTranslation("auth");

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center p-6 bg-background"
      dir={i18n.dir()}
    >
      <Brand404 className="mb-8 md:w-80" />
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
        {t("notFound.title")}
      </h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        {t("notFound.description")}
      </p>
      <Button asChild size="lg">
        <Link to="/">{t("notFound.backHomeButton")}</Link>
      </Button>
    </div>
  );
}
