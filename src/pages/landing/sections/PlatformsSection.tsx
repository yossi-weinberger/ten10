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
import {
  CheckCircle,
  Globe,
  Monitor,
  Download,
  Smartphone,
} from "lucide-react";

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

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Web Version */}
          <Card className="relative overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-teal-600 text-white">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8" />
                <div>
                  <CardTitle className="text-2xl">
                    {t("platforms.web.title")}
                  </CardTitle>
                  <CardDescription className="text-blue-100 mt-1">
                    {t("platforms.web.subtitle")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 flex-grow flex flex-col">
              <ul className="space-y-4 mb-8 flex-grow">
                {t("platforms.web.features", { returnObjects: true }).map(
                  (item: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {item}
                      </span>
                    </li>
                  )
                )}
              </ul>
              <motion.div
                whileHover={buttonHover}
                whileTap={buttonTap}
                className="mt-auto"
              >
                <Button
                  className="w-full text-lg py-6"
                  variant="outline"
                  asChild
                >
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2"
                  >
                    <Globe className="h-5 w-5" />
                    {t("platforms.web.button")}
                  </Link>
                </Button>
              </motion.div>
            </CardContent>
          </Card>

          {/* Desktop Version */}
          <Card className="relative overflow-hidden border-2 border-blue-500 flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
            {/* Removed "Recommended" Badge as requested */}

            <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              <div className="flex items-center gap-3">
                <Monitor className="h-8 w-8" />
                <div>
                  <CardTitle className="text-2xl">
                    {t("platforms.desktop.title")}
                  </CardTitle>
                  <CardDescription className="text-green-100 mt-1">
                    {t("platforms.desktop.subtitle")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 flex-grow flex flex-col">
              <ul className="space-y-4 mb-8 flex-grow mt-6">
                {t("platforms.desktop.features", { returnObjects: true }).map(
                  (item: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {item}
                      </span>
                    </li>
                  )
                )}
              </ul>
              <motion.div
                whileHover={buttonHover}
                whileTap={buttonTap}
                className="mt-auto"
              >
                <Button
                  className="w-full text-lg py-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    document
                      .getElementById("download")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Download className="mr-2 h-5 w-5" />
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
