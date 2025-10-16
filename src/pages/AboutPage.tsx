import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Heart,
  ExternalLink,
  Mail,
  Github,
  Users,
  Building2,
  ArrowRight,
  Gift,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  useScrollAnimation,
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "@/hooks/useScrollAnimation";

export function AboutPage() {
  const { t, i18n } = useTranslation("about");
  const headerRef = useScrollAnimation({ threshold: 0.1 });
  const cardsRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <div className="min-h-screen " dir={i18n.dir()}>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          ref={headerRef.ref}
          initial="hidden"
          animate={headerRef.isInView ? "visible" : "hidden"}
          variants={fadeInUp}
        >
          <motion.h1
            className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
            variants={fadeInUp}
          >
            {t("title")}
          </motion.h1>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            {t("subtitle")}
          </motion.p>
        </motion.div>

        <motion.div
          className="grid lg:grid-cols-3 gap-8"
          ref={cardsRef.ref}
          initial="hidden"
          animate={cardsRef.isInView ? "visible" : "hidden"}
          variants={staggerContainer}
        >
          {/* אודות האפליקציה */}
          <motion.div variants={staggerItem}>
            <Card className="hover:shadow-xl transition-all duration-300 group h-full grid grid-rows-[auto_1fr_auto]">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Calculator className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("appInfo.title")}
                </CardTitle>
                <Badge variant="secondary" className="w-fit mx-auto">
                  {t("appInfo.badge")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                  {t("appInfo.description")}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {t("appInfo.feature1")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {t("appInfo.feature2")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {t("appInfo.feature3")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {t("appInfo.feature4")}
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/landing">
                  <Button className="w-full">
                    {t("appInfo.learnMore")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>

          {/* אודות מכון תורת האדם לאדם */}
          <motion.div variants={staggerItem}>
            <Card className="hover:shadow-xl transition-all duration-300 group h-full grid grid-rows-[auto_1fr_auto]">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("institute.title")}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="w-fit mx-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  {t("institute.badge")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                  {t("institute.description")}
                </p>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      {t("institute.support")}
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t("institute.supportDescription")}
                  </p>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button
                  asChild
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <a
                    href="https://www.torah-adam.org.il/donate"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    {t("institute.donateButton")}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* אודות צוות הפיתוח */}
          <motion.div variants={staggerItem}>
            <Card className="hover:shadow-xl transition-all duration-300 group h-full grid grid-rows-[auto_1fr_auto]">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("team.title")}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="w-fit mx-auto bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  {t("team.badge")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                  {t("team.description")}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Mail className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {t("team.contactEmail")}
                      </p>
                      <a
                        href="mailto:contact@ten10-app.com"
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        contact@ten10-app.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Github className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {t("team.github")}
                      </p>
                      <a
                        href="https://github.com/ten10-app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm inline-flex items-center gap-1"
                      >
                        github.com/ten10-app
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button
                  asChild
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <a
                    href="mailto:contact@ten10-app.com"
                    className="inline-flex items-center justify-center"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {t("team.contactButton")}
                  </a>
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Footer Section */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t("footer.title")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              {t("footer.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link to="/landing">{t("footer.backToLanding")}</Link>
              </Button>
              <Button asChild variant="outline">
                <a href="mailto:feedback@ten10-app.com">
                  {t("footer.sendFeedback")}
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
