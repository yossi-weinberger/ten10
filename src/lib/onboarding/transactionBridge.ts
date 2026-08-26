type TransactionCreatedListener = () => void;

const listeners = new Set<TransactionCreatedListener>();

export function subscribeOnboardingTransactionCreated(
  listener: TransactionCreatedListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOnboardingTransactionCreated(): void {
  for (const listener of listeners) {
    listener();
  }
}
