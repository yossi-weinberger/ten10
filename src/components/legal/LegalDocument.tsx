import { forwardRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeInUp, useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LegalHeaderProps {
  badgeClassName: string;
  icon: ReactNode;
  title: string;
  lastUpdated: string;
  inView: boolean;
}

export const LegalHeader = forwardRef<HTMLDivElement, LegalHeaderProps>(function LegalHeader(
  { badgeClassName, icon, title, lastUpdated, inView },
  ref,
) {
  return (
    <motion.div
      className="mb-12 text-center max-md:mb-3"
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeInUp}
    >
      <div
        className={cn(
          "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full max-md:size-10",
          badgeClassName,
        )}
      >
        {icon}
      </div>
      <motion.h1
        className="mb-4 text-4xl font-bold text-gray-900 dark:text-white max-md:text-[clamp(24px,6.5vw,28px)] max-md:leading-tight"
        variants={fadeInUp}
      >
        {title}
      </motion.h1>
      <motion.p className="text-lg text-gray-600 dark:text-gray-300" variants={fadeInUp}>
        {lastUpdated}
      </motion.p>
    </motion.div>
  );
});

interface LegalDocumentProps {
  dir: string;
  children: ReactNode;
  /** Terms and privacy pass their existing scroll header so the ref stays on the page. */
  header?: ReactNode;
  badgeClassName?: string;
  icon?: ReactNode;
  title?: string;
  lastUpdated?: string;
}

/** Shared shell for the terms, privacy, and beta-terms pages.
 *  Below md the header and cards tighten; md+ keeps the original spacing. */
export function LegalDocument({
  dir,
  badgeClassName,
  icon,
  title,
  lastUpdated,
  children,
  header,
}: LegalDocumentProps) {
  const { ref: headerRef, isInView: headerIsInView } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div className="min-h-screen" dir={dir}>
      <div className="container mx-auto max-w-4xl px-4 py-12 max-md:py-6">
        {header ?? (badgeClassName && title && lastUpdated ? (
          <LegalHeader
            ref={headerRef}
            inView={headerIsInView}
            badgeClassName={badgeClassName}
            icon={icon}
            title={title}
            lastUpdated={lastUpdated}
          />
        ) : null)}

        <div className="space-y-8 max-md:space-y-3">{children}</div>
      </div>
    </div>
  );
}

interface LegalSectionProps {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  bodyClassName?: string;
}

/** A legal card. On a phone the icon sits on the heading line and the
 *  body uses the full card width. Desktop keeps the icon in the row. */
export function LegalSection({ icon, title, children, bodyClassName }: LegalSectionProps) {
  const headingClassName = cn(
    "mb-3 text-2xl font-bold text-gray-900 dark:text-white max-md:text-xl",
    icon && "max-md:ps-7",
  );

  if (!icon) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4 md:p-6">
          <h2 className={headingClassName}>{title}</h2>
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 md:p-6">
        <div className="relative md:flex md:items-start md:gap-3">
          <span className="absolute inset-inline-start-0 top-0 md:contents">{icon}</span>
          <div className={bodyClassName}>
            <h2 className={headingClassName}>{title}</h2>
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LegalListProps {
  children: ReactNode;
  className?: string;
}

export function LegalList({ children, className }: LegalListProps) {
  return (
    <ul
      className={cn(
        "ms-4 list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 max-md:ms-0 max-md:list-outside max-md:ps-[18px]",
        className,
      )}
    >
      {children}
    </ul>
  );
}
