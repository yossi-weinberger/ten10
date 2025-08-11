import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface TransactionsTableFooterProps {
  loading: boolean;
  pagination: {
    hasMore: boolean;
    totalCount: number;
  };
  transactionsLength: number;
  handleLoadMore: () => void;
}

export const TransactionsTableFooter: React.FC<
  TransactionsTableFooterProps
> = ({ loading, pagination, transactionsLength, handleLoadMore }) => {
  const { t } = useTranslation("data-tables");

  return (
    <>
      {loading && transactionsLength > 0 && (
        <div className="text-center mt-4">
          <Button variant="outline" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("pagination.loadingMore")}
          </Button>
        </div>
      )}
      <div
        className="flex justify-center items-center mt-6 space-x-4"
        dir="rtl"
      >
        {!loading && pagination.hasMore && (
          <Button onClick={handleLoadMore}>{t("pagination.loadMore")}</Button>
        )}
        {transactionsLength > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              current: transactionsLength,
              total: pagination.totalCount,
            })}
          </p>
        )}
      </div>
    </>
  );
};
