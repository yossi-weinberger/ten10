import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { buttonHover, buttonTap } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Globe, Monitor, Download } from "lucide-react";

interface PlatformsSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

export const PlatformsSection: React.FC<PlatformsSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");

  return (
    <section
      id="platforms"
      ref={sectionRef}
      className="py-20 px-4 bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("platforms.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Web Version */}
          <Card className="relative overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex items-center gap-2">
                <Globe className="h-6 w-6" />
                <CardTitle className="text-2xl">
                  {t("platforms.web.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-blue-100">
                {t("platforms.web.subtitle")} • {t("platforms.web.pwaNote")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {t("platforms.web.features", { returnObjects: true }).map(
                  (item: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button className="w-full mt-6" variant="outline">
                  <Globe className="mr-2 h-4 w-4" />
                  {t("platforms.web.button")}
                </Button>
              </motion.div>
            </CardContent>
          </Card>

          {/* Desktop Version */}
          <Card className="relative overflow-hidden border-2 border-blue-500">
            <div className="absolute top-4 right-4">
              <Badge className="bg-blue-500">
                {t("platforms.desktop.badge")}
              </Badge>
            </div>
            <CardHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Monitor className="h-6 w-6" />
                <CardTitle className="text-2xl">
                  {t("platforms.desktop.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-green-100">
                {t("platforms.desktop.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {t("platforms.desktop.features", { returnObjects: true }).map(
                  (item: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button className="w-full mt-6">
                  <Download className="mr-2 h-4 w-4" />
                  {t("platforms.desktop.button")}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
