import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  AlertCircle,
  Shield,
  CheckCircle,
  Lock,
  Globe,
  Brain,
  Database,
  UserX,
  Clock,
} from "lucide-react";
import { LegalDocument, LegalList, LegalSection } from "@/components/legal/LegalDocument";

export function BetaTermsPage() {
  const { t, i18n } = useTranslation("betaTerms");

  return (
    <LegalDocument
      dir={i18n.dir()}
      badgeClassName="bg-blue-100 dark:bg-blue-900"
      icon={<FileText className="h-8 w-8 text-blue-600 max-md:size-5" />}
      title={t("title")}
      lastUpdated={t("lastUpdated")}
    >
      <LegalSection
        icon={<CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-green-600" />}
        title={t("acceptance.title")}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {t("acceptance.description")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Brain className="mt-1 h-6 w-6 flex-shrink-0 text-indigo-600" />}
        title={t("service.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("service.description")}
        </p>
        <LegalList>
          <li>{t("service.item1")}</li>
          <li>{t("service.item2")}</li>
          <li>{t("service.item3")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Database className="mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />}
        title={t("dataCollection.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("dataCollection.description")}
        </p>
        <LegalList>
          <li>{t("dataCollection.item1")}</li>
          <li>{t("dataCollection.item2")}</li>
          <li>{t("dataCollection.item3")}</li>
          <li>{t("dataCollection.item4")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Clock className="mt-1 h-6 w-6 flex-shrink-0 text-amber-600" />}
        title={t("retention.title")}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {t("retention.description")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Globe className="mt-1 h-6 w-6 flex-shrink-0 text-teal-600" />}
        title={t("processors.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("processors.description")}
        </p>
        <LegalList>
          <li>{t("processors.item1")}</li>
          <li>{t("processors.item2")}</li>
          <li>{t("processors.item3")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<UserX className="mt-1 h-6 w-6 flex-shrink-0 text-rose-600" />}
        title={t("yourRights.title")}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {t("yourRights.description")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Shield className="mt-1 h-6 w-6 flex-shrink-0 text-green-700" />}
        title={t("security.title")}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {t("security.description")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-orange-600" />}
        title={t("disclaimer.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("disclaimer.description")}
        </p>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            {t("disclaimer.note")}
          </p>
        </div>
      </LegalSection>

      <LegalSection
        icon={<Lock className="mt-1 h-6 w-6 flex-shrink-0 text-indigo-600" />}
        title={t("generalTerms.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("generalTerms.description")}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          <span>{t("generalTerms.linkPrefix")}</span>{" "}
          <Link
            to="/terms"
            className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            {t("generalTerms.linkText")}
          </Link>
          <span>{t("generalTerms.linkSuffix")}</span>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
