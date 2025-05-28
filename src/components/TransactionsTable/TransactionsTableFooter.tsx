import React from "react";
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
  return (
    <>
      {loading && transactionsLength > 0 && (
        <div className="text-center mt-4">
          <Button variant="outline" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            טוען עוד נתונים...
          </Button>
        </div>
      )}
      <div
        className="flex justify-center items-center mt-6 space-x-4"
        dir="rtl"
      >
        {!loading && pagination.hasMore && (
          <Button onClick={handleLoadMore}>טען עוד</Button>
        )}
        {transactionsLength > 0 && (
          <p className="text-sm text-muted-foreground">
            מציג {transactionsLength} מתוך {pagination.totalCount} תנועות
          </p>
        )}
      </div>
    </>
  );
};
