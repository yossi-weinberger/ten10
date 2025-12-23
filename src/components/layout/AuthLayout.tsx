import React from "react";
import { useTranslation } from "react-i18next";
import { AuthControls } from "./AuthControls";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  imageSideContent?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  imageSideContent,
}) => {
  const { t, i18n } = useTranslation("auth");
  const isRtl = i18n.dir() === "rtl";

  return (
    <div
      className="min-h-screen w-full flex items-start sm:items-center justify-center p-4 sm:p-8 relative bg-muted/30"
      dir={i18n.dir()}
    >
      {/* Navigation & Controls */}
      <AuthControls />

      {/* Page Background Image (Mobile Only) */}
      <div className="absolute inset-0 z-0 lg:hidden">
        <div className="absolute inset-0 bg-[url('/background.webp')] bg-cover bg-right" />
        {/* Dark overlay to ensure the card stands out */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      <div className="w-full max-w-[1400px] bg-card rounded-[32px] shadow-2xl overflow-hidden grid lg:grid-cols-2 relative z-10 lg:h-[85vh] lg:min-h-[600px]">
        {/* Form Side */}
        <div className="relative flex flex-col justify-center p-8 md:p-16 lg:p-24 order-1 lg:h-full">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8 shrink-0">
            <img
              src="/logo/logo.svg"
              alt="Ten10 Logo"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="w-full max-w-md mx-auto space-y-8">
            <div className="space-y-2 text-center lg:text-start">
              {title && (
                <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
              )}
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>

            {/* Standard form styling (no transparency overrides) */}
            <div>{children}</div>
          </div>
        </div>

        {/* Image Side (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col justify-center p-12 relative bg-black text-white order-2">
          {/* Background Image */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0">
            <div className="absolute inset-0 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat" />
          </div>

          {/* Logo - Centered at the top relative to the image section */}
          <div className="absolute top-16 left-0 right-0 flex justify-center z-20">
            <img
              src="/logo/logo-wide.svg"
              alt="Ten10 Logo"
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-8 mt-20">
            <h1 className="text-4xl md:text-5xl font-medium leading-[1.2] tracking-tight">
              {imageSideContent || (
                <span className="whitespace-pre-line">
                  {t("layout.imageTitle")}
                </span>
              )}
            </h1>
            <div className="max-w-md space-y-4">
              <p className="text-gray-200 text-xl leading-relaxed italic">
                "{t("layout.imageQuote")}"
              </p>
              <p className="text-gray-400 text-sm font-medium">
                {t("layout.imageQuoteSource")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
