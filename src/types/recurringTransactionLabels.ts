export const recurringStatusLabels: Record<string, string> = {
  active: "פעיל",
  paused: "מושהה",
  completed: "הושלם",
  cancelled: "בוטל",
};

export const recurringFrequencyLabels: Record<string, string> = {
  monthly: "חודשי",
  weekly: "שבועי",
  yearly: "שנתי",
  daily: "יומי",
};

export const recurringStatusBadgeColors: { [key: string]: string } = {
  active:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
  paused:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700",
  completed:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
  cancelled:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
};
