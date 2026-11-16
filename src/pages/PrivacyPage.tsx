import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Shield,
  Database,
  Lock,
  Eye,
  Mail,
  Globe,
  Building,
  Plane,
  Clock,
  Cookie,
  UserCheck,
} from "lucide-react";
import { LegalDocument, LegalHeader, LegalList, LegalSection } from "@/components/legal/LegalDocument";

export function PrivacyPage() {
  const { t, i18n } = useTranslation("privacy");
  const headerRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <LegalDocument
      dir={i18n.dir()}
      header={(
        <LegalHeader
          ref={headerRef.ref}
          inView={headerRef.isInView}
          badgeClassName="bg-blue-100 dark:bg-blue-900"
          icon={<Shield className="h-8 w-8 text-blue-600 max-md:size-5" />}
          title={t("title")}
          lastUpdated={t("lastUpdated")}
        />
      )}
    >
      <LegalSection
        icon={<Building className="mt-1 h-6 w-6 flex-shrink-0 text-slate-600" />}
        title={t("serviceOwner.title")}
      >
        <p className="mb-2 text-gray-600 dark:text-gray-300">
          {t("serviceOwner.description")}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          {t("serviceOwner.contact")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Database className="mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />}
        title={t("dataCollection.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("dataCollection.description")}
        </p>
        <p className="mb-2 font-semibold text-gray-900 dark:text-white">
          {t("dataCollection.required")}
        </p>
        <LegalList className="mb-3">
          <li>{t("dataCollection.item1")}</li>
        </LegalList>
        <p className="mb-2 font-semibold text-gray-900 dark:text-white">
          {t("dataCollection.optional")}
        </p>
        <LegalList>
          <li>{t("dataCollection.item2")}</li>
          <li>{t("dataCollection.item3")}</li>
          <li>{t("dataCollection.item4")}</li>
          <li>{t("dataCollection.item5")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Lock className="mt-1 h-6 w-6 flex-shrink-0 text-green-600" />}
        title={t("dataStorage.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("dataStorage.description")}
        </p>
        <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="font-semibold text-gray-900 dark:text-white">
            {t("dataStorage.web.title")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("dataStorage.web.location")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("dataStorage.web.access")}
          </p>
          <p className="mt-4 font-semibold text-gray-900 dark:text-white">
            {t("dataStorage.desktop.title")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("dataStorage.desktop.description")}
          </p>
        </div>
      </LegalSection>

      <LegalSection
        icon={<Plane className="mt-1 h-6 w-6 flex-shrink-0 text-sky-600" />}
        title={t("internationalTransfer.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("internationalTransfer.description")}
        </p>
        <LegalList>
          <li>{t("internationalTransfer.item1")}</li>
          <li>{t("internationalTransfer.item2")}</li>
          <li>{t("internationalTransfer.item3")}</li>
          <li>{t("internationalTransfer.item4")}</li>
          <li>{t("internationalTransfer.item5")}</li>
          <li>{t("internationalTransfer.item6")}</li>
        </LegalList>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("internationalTransfer.note")}
        </p>
        <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("internationalTransfer.financialDataNote")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Clock className="mt-1 h-6 w-6 flex-shrink-0 text-amber-600" />}
        title={t("dataRetention.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("dataRetention.description")}
        </p>
        <LegalList>
          <li>{t("dataRetention.item1")}</li>
          <li>{t("dataRetention.item2")}</li>
          <li>{t("dataRetention.item3")}</li>
          <li>{t("dataRetention.item4")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Eye className="mt-1 h-6 w-6 flex-shrink-0 text-purple-600" />}
        title={t("dataUsage.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("dataUsage.description")}
        </p>
        <LegalList>
          <li>{t("dataUsage.item1")}</li>
          <li>{t("dataUsage.item2")}</li>
          <li>{t("dataUsage.item3")}</li>
          <li>{t("dataUsage.item4")}</li>
          <li>{t("dataUsage.item5")}</li>
          <li>{t("dataUsage.item6")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Mail className="mt-1 h-6 w-6 flex-shrink-0 text-orange-600" />}
        title={t("communications.title")}
        bodyClassName="space-y-4"
      >
        <p className="text-gray-600 dark:text-gray-300">
          {t("communications.description")}
        </p>
        <div className="space-y-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="font-semibold text-gray-900 dark:text-white">
            {t("communications.reminder.title")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("communications.reminder.description")}
          </p>
        </div>
        <div className="space-y-2 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <p className="font-semibold text-gray-900 dark:text-white">
            {t("communications.marketing.title")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("communications.marketing.description")}
          </p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("communications.unsubscribe")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Globe className="mt-1 h-6 w-6 flex-shrink-0 text-teal-600" />}
        title={t("analytics.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("analytics.description")}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          {t("analytics.note")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Cookie className="mt-1 h-6 w-6 flex-shrink-0 text-yellow-600" />}
        title={t("cookies.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("cookies.description")}
        </p>
        <LegalList>
          <li>{t("cookies.item1")}</li>
          <li>{t("cookies.item2")}</li>
          <li>{t("cookies.item3")}</li>
          <li>{t("cookies.item4")}</li>
        </LegalList>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("cookies.note")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<UserCheck className="mt-1 h-6 w-6 flex-shrink-0 text-indigo-600" />}
        title={t("ageRequirement.title")}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {t("ageRequirement.description")}
        </p>
      </LegalSection>

      <LegalSection title={t("userRights.title")}>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("userRights.description")}
        </p>
        <LegalList>
          <li>{t("userRights.item1")}</li>
          <li>{t("userRights.item2")}</li>
          <li>{t("userRights.item3")}</li>
          <li>{t("userRights.item4")}</li>
          <li>{t("userRights.item5")}</li>
          <li>{t("userRights.item6")}</li>
          <li>{t("userRights.item7")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("contact.title")}>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("contact.description")}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          <a
            href="mailto:contact@ten10-app.com"
            className="text-blue-600 underline hover:text-blue-700"
          >
            contact@ten10-app.com
          </a>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
