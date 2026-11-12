import {
  BulkActionsToolbar,
  type BulkActionsToolbarProps,
} from "@/components/TransactionsTable/BulkActionsToolbar";

const FLOATING_CLASS_NAME =
  "md:mb-4 max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(12px+env(safe-area-inset-bottom))] max-md:z-40 max-md:rounded-2xl max-md:bg-background max-md:shadow-lg max-md:border max-md:border-border max-md:p-3";

export type MobileBulkToolbarProps = Omit<BulkActionsToolbarProps, "className" | "mobileLayout">;

export function MobileBulkToolbar(props: MobileBulkToolbarProps) {
  return <BulkActionsToolbar {...props} className={FLOATING_CLASS_NAME} mobileLayout />;
}
