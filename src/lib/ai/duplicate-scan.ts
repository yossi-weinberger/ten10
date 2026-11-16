export type SavedTransactionRow = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  type: string;
  description: string;
};

export type DuplicatePair = {
  left: SavedTransactionRow;
  right: SavedTransactionRow;
};
