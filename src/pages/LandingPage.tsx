import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Download,
  Globe,
  Mail,
  Monitor,
  Star,
  CheckCircle,
  Calendar,
  PieChart,
  FileText,
  Users,
} from "lucide-react";

const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation("landing");

  const features = [
    {
      icon: <Calculator className="h-8 w-8" />,
      titleKey: "features.items.autoCalculation.title",
      descriptionKey: "features.items.autoCalculation.description",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      titleKey: "features.items.accessAnywhere.title",
      descriptionKey: "features.items.accessAnywhere.description",
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      titleKey: "features.items.smartRecurring.title",
      descriptionKey: "features.items.smartRecurring.description",
    },
    {
      icon: <Mail className="h-8 w-8" />,
      titleKey: "features.items.personalReminders.title",
      descriptionKey: "features.items.personalReminders.description",
    },
    {
      icon: <PieChart className="h-8 w-8" />,
      titleKey: "features.items.reportsCharts.title",
      descriptionKey: "features.items.reportsCharts.description",
    },
    {
      icon: <FileText className="h-8 w-8" />,
      titleKey: "features.items.dataExport.title",
      descriptionKey: "features.items.dataExport.description",
    },
  ];

  const testimonials = [
    {
      nameKey: "testimonials.items.0.name",
      textKey: "testimonials.items.0.text",
      rating: 5,
    },
    {
      nameKey: "testimonials.items.1.name",
      textKey: "testimonials.items.1.text",
      rating: 5,
    },
    {
      nameKey: "testimonials.items.2.name",
      textKey: "testimonials.items.2.text",
      rating: 5,
    },
  ];

  const faqs = [
    {
      questionKey: "faq.items.0.question",
      answerKey: "faq.items.0.answer",
    },
    {
      questionKey: "faq.items.1.question",
      answerKey: "faq.items.1.answer",
    },
    {
      questionKey: "faq.items.2.question",
      answerKey: "faq.items.2.answer",
    },
    {
      questionKey: "faq.items.3.question",
      answerKey: "faq.items.3.answer",
    },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800"
      dir={i18n.dir()}
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 opacity-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 text-sm font-medium animate-fade-in"
            >
              {t("hero.badge")}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              <span className="text-blue-600">Ten10</span> -{" "}
              {t("hero.title").replace("Ten10 - ", "")}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="text-lg px-8 py-3" asChild>
                <a
                  href="#download"
                  className="inline-flex items-center"
                  aria-label={t("hero.downloadButton")}
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t("hero.downloadButton")}
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-3"
                asChild
              >
                <Link
                  to="/"
                  className="inline-flex items-center"
                  aria-label={t("hero.tryButton")}
                >
                  <Globe className="mr-2 h-5 w-5" />
                  {t("hero.tryButton")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero Image/Demo */}
          <div className="relative mx-auto max-w-4xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="ml-4 text-sm text-gray-500">
                  Ten10 Dashboard
                </span>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg p-8 text-center">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                <h3 className="text-2xl font-bold mb-2">Ten10 Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t("hero.subtitle")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <p className="text-blue-100">{t("stats.users")}</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">₪50M+</div>
              <p className="text-blue-100">{t("stats.managed")}</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <p className="text-blue-100">{t("stats.accuracy")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("features.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="text-blue-600 mb-2 transition-transform hover:scale-110">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">
                    {t(feature.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {t(feature.descriptionKey)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Comparison */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
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
                  {t("platforms.web.subtitle")}
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
                <Button className="w-full mt-6" variant="outline">
                  <Globe className="mr-2 h-4 w-4" />
                  {t("platforms.web.button")}
                </Button>
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
                <Button className="w-full mt-6">
                  <Download className="mr-2 h-4 w-4" />
                  {t("platforms.desktop.button")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("testimonials.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 italic">
                    "{t(testimonial.textKey)}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{t(testimonial.nameKey)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("faq.title")}
            </h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t(faq.questionKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t(faq.answerKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-xl mb-8 text-blue-100">{t("cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              <Download className="mr-2 h-5 w-5" />
              {t("cta.desktopButton")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600"
            >
              <Globe className="mr-2 h-5 w-5" />
              {t("cta.webButton")}
            </Button>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 px-4 bg-white dark:bg-gray-800">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
            {t("download.title")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            {t("download.subtitle")}
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">Windows</h3>
                <Button className="w-full" asChild>
                  <a href="/downloads/Ten10-Windows.msi" download>
                    <Download className="mr-2 h-4 w-4" />
                    {t("download.downloadButton")}
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">macOS</h3>
                <Button className="w-full" asChild>
                  <a href="/downloads/Ten10-macOS.dmg" download>
                    <Download className="mr-2 h-4 w-4" />
                    {t("download.downloadButton")}
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">Linux</h3>
                <Button className="w-full" asChild>
                  <a href="/downloads/Ten10-Linux.AppImage" download>
                    <Download className="mr-2 h-4 w-4" />
                    {t("download.downloadButton")}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("download.orText")}
            </p>
            <Button size="lg" variant="outline" asChild>
              <Link to="/" className="inline-flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                {t("download.webAppButton")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-blue-400">Ten10</h3>
              <p className="text-gray-300">{t("footer.description")}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.product")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>{t("footer.links.features")}</li>
                <li>{t("footer.links.download")}</li>
                <li>{t("footer.links.support")}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.company")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>{t("footer.links.about")}</li>
                <li>{t("footer.links.contact")}</li>
                <li>{t("footer.links.privacy")}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.resources")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>{t("footer.links.halacha")}</li>
                <li>{t("footer.links.guides")}</li>
                <li>{t("footer.links.faq")}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Ten10. {t("footer.copyright")}.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
