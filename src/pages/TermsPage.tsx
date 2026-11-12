import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  AlertCircle,
  Scale,
  CheckCircle,
  Shield,
  Lock,
  Mail,
  Globe,
  Gavel,
  Code,
  UserCheck,
  MapPin,
  UserX,
} from "lucide-react";
import { LegalDocument, LegalHeader, LegalList, LegalSection } from "@/components/legal/LegalDocument";

export function TermsPage() {
  const { t, i18n } = useTranslation("terms");
  const headerRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <LegalDocument
      dir={i18n.dir()}
      header={(
        <LegalHeader
          ref={headerRef.ref}
          inView={headerRef.isInView}
          badgeClassName="bg-green-100 dark:bg-green-900"
          icon={<FileText className="h-8 w-8 text-green-600 max-md:size-5" />}
          title={t("title")}
          lastUpdated={t("lastUpdated")}
        />
      )}
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
        icon={<UserCheck className="mt-1 h-6 w-6 flex-shrink-0 text-indigo-600" />}
        title={t("eligibility.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("eligibility.description")}
        </p>
        <LegalList>
          <li>{t("eligibility.item1")}</li>
          <li>{t("eligibility.item2")}</li>
          <li>{t("eligibility.item3")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Scale className="mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />}
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
        icon={<UserX className="mt-1 h-6 w-6 flex-shrink-0 text-rose-600" />}
        title={t("intendedUse.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("intendedUse.description")}
        </p>
        <LegalList>
          <li>{t("intendedUse.item1")}</li>
          <li>{t("intendedUse.item2")}</li>
          <li>{t("intendedUse.item3")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Lock className="mt-1 h-6 w-6 flex-shrink-0 text-indigo-600" />}
        title={t("dataAndPrivacy.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("dataAndPrivacy.description")}
        </p>
        <LegalList>
          <li>{t("dataAndPrivacy.item1")}</li>
          <li>{t("dataAndPrivacy.item2")}</li>
          <li>{t("dataAndPrivacy.item3")}</li>
          <li>{t("dataAndPrivacy.item4")}</li>
          <li>{t("dataAndPrivacy.item5")}</li>
          <li>{t("dataAndPrivacy.item6")}</li>
        </LegalList>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          <span>{t("dataAndPrivacy.privacyLinkPrefix")}</span>{" "}
          <Link
            to="/privacy"
            className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            {t("dataAndPrivacy.privacyLinkText")}
          </Link>
          <span>{t("dataAndPrivacy.privacyLinkSuffix")}</span>
        </p>
      </LegalSection>

      <LegalSection
        icon={<Globe className="mt-1 h-6 w-6 flex-shrink-0 text-teal-600" />}
        title={t("thirdParties.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("thirdParties.description")}
        </p>
        <LegalList>
          <li>{t("thirdParties.item1")}</li>
          <li>{t("thirdParties.item2")}</li>
          <li>{t("thirdParties.item3")}</li>
          <li>{t("thirdParties.item4")}</li>
        </LegalList>
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
        icon={<Shield className="mt-1 h-6 w-6 flex-shrink-0 text-green-700" />}
        title={t("security.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("security.description")}
        </p>
        <LegalList>
          <li>{t("security.item1")}</li>
          <li>{t("security.item2")}</li>
          <li>{t("security.item3")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<Mail className="mt-1 h-6 w-6 flex-shrink-0 text-amber-600" />}
        title={t("communications.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("communications.description")}
        </p>
        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("communications.signupNotice")}
        </p>
        <LegalList>
          <li>{t("communications.item1")}</li>
          <li>{t("communications.item2")}</li>
          <li>{t("communications.item3")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("limitations.title")}>
        <p className="text-gray-600 dark:text-gray-300">
          {t("limitations.description")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Code className="mt-1 h-6 w-6 flex-shrink-0 text-purple-600" />}
        title={t("openSource.title")}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {t("openSource.description")}
        </p>
      </LegalSection>

      <LegalSection
        icon={<Gavel className="mt-1 h-6 w-6 flex-shrink-0 text-slate-700" />}
        title={t("legal.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("legal.description")}
        </p>
        <LegalList>
          <li>{t("legal.item1")}</li>
          <li>{t("legal.item2")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={<MapPin className="mt-1 h-6 w-6 flex-shrink-0 text-red-600" />}
        title={t("jurisdiction.title")}
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {t("jurisdiction.description")}
        </p>
        <LegalList>
          <li>{t("jurisdiction.item1")}</li>
          <li>{t("jurisdiction.item2")}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("changes.title")}>
        <p className="text-gray-600 dark:text-gray-300">
          {t("changes.description")}
        </p>
      </LegalSection>

      <LegalSection title={t("contact.title")}>
        <p className="text-gray-600 dark:text-gray-300">
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
