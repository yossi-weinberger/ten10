export type ReminderLanguage = "he" | "en";
export type TextDirection = "rtl" | "ltr";

export interface MonthlyEncouragement {
  body: string;
  source?: string;
}

interface BalanceCopy {
  outstanding: string;
  credit: string;
  settled: string;
}

interface SubjectCopy {
  outstanding: (amount: string) => string;
  credit: (amount: string) => string;
  settled: string;
}

export interface ReminderLocaleCopy {
  htmlLang: ReminderLanguage;
  direction: TextDirection;
  locale: "he-IL" | "en-US";
  slogan: string;
  greeting: string;
  reminder: string;
  balance: BalanceCopy;
  verification: string;
  importHintPrefix: string;
  importHintEmphasis: string;
  cta: string;
  encouragementLabel: string;
  footerPreferenceNote: string;
  unsubscribeReminder: string;
  unsubscribeAll: string;
  subject: SubjectCopy;
  monthlyEncouragements: readonly MonthlyEncouragement[];
}

const HEBREW_ENCOURAGEMENTS = [
  {
    body: "עשר תעשר את כל תבואת זרעך היוצא השדה שנה שנה",
    source: "דברים יד, כב",
  },
  {
    body: "עשר בשביל שתתעשר",
    source: "תלמוד בבלי, תענית ט׳ ע״א",
  },
  {
    body: "הביאו את כל המעשר אל בית האוצר... והריקותי לכם ברכה עד בלי די",
    source: "מלאכי ג, י",
  },
  {
    body: "וכל אשר תתן לי עשר אעשרנו לך",
    source: "בראשית כח, כב",
  },
  {
    body: "הפרשת מעשר מדויקת הופכת כוונה טובה להרגל של נתינה.",
  },
  {
    body: "גם כשחומש מלא קשה, אפשר להתחיל בהדרגה ולהוסיף בנתינה כשמתאפשר.",
    source: "על פי המקורות ההלכתיים של Ten10",
  },
  {
    body: "החפץ חיים הציע למפרישי חומש לחשב מעשר פעמיים, כדי לשמור על דיוק.",
    source: "אהבת חסד",
  },
  {
    body: "כספי המעשר נועדו לצדקה, לחסד ולמעשים טובים.",
    source: "מתוך ספריית ההלכה של Ten10",
  },
  {
    body: "יש שמייעצים לחלק את המעשר בין עזרה לעניים לבין מטרות מצווה חשובות.",
    source: "מתוך ספריית ההלכה של Ten10",
  },
  {
    body: "הלוואה לנזקק דרך גמ״ח יכולה להיות צדקה שממשיכה לעזור שוב ושוב.",
    source: "על פי אהבת חסד",
  },
  {
    body: "גם הנחה או ויתור לנזקק יכולים להפוך מסחר יומיומי למעשה של צדקה.",
    source: "מתוך ספריית ההלכה של Ten10",
  },
  {
    body: "Ten10 צמחה מטבלאות Excel פשוטות שנועדו לעזור לחשב מעשר וחומש בדיוק.",
    source: "סיפור הקמת Ten10",
  },
] as const satisfies readonly MonthlyEncouragement[];

const ENGLISH_ENCOURAGEMENTS = [
  {
    body: "You shall surely tithe all the produce of your planting, year by year.",
    source: "Deuteronomy 14:22",
  },
  {
    body: "Give ma'aser so that you will prosper.",
    source: "Babylonian Talmud, Taanit 9a",
  },
  {
    body: "Bring the full tithe into the storehouse... and I will pour out blessing without end.",
    source: "Malachi 3:10",
  },
  {
    body: "Of all that You give me, I will surely give a tenth to You.",
    source: "Genesis 28:22",
  },
  {
    body: "Accurate ma'aser turns a good intention into a lasting habit of giving.",
  },
  {
    body: "When giving a full chomesh is difficult, one can begin gradually and increase when possible.",
    source: "Based on Ten10's halachic library",
  },
  {
    body: "The Chafetz Chaim advised those giving chomesh to calculate ma'aser twice for greater accuracy.",
    source: "Ahavas Chesed",
  },
  {
    body: "Ma'aser funds are meant for tzedakah, kindness, and good deeds.",
    source: "From Ten10's halachic library",
  },
  {
    body: "Some authorities advise dividing ma'aser between helping the poor and other important mitzvah purposes.",
    source: "From Ten10's halachic library",
  },
  {
    body: "A loan through a gemach can become tzedakah that helps again and again.",
    source: "Based on Ahavas Chesed",
  },
  {
    body: "Even a discount or waived payment for someone in need can turn everyday commerce into tzedakah.",
    source: "From Ten10's halachic library",
  },
  {
    body: "Ten10 grew from simple Excel sheets created to help people calculate ma'aser and chomesh accurately.",
    source: "The Ten10 origin story",
  },
] as const satisfies readonly MonthlyEncouragement[];

export const REMINDER_COPY = {
  he: {
    htmlLang: "he",
    direction: "rtl",
    locale: "he-IL",
    slogan: "ניהול מעשרות ותקציב פיננסי פשוט ומדויק",
    greeting: "ערב טוב",
    reminder: "תזכורת קצרה לעדכון המעשרות, כדי לשמור על יתרה מדויקת.",
    balance: {
      outstanding: "יתרת המעשר שלך לתרומה היא",
      credit: "הינך נמצא בזכות של",
      settled: "יתרת המעשר שלך מאוזנת",
    },
    verification:
      "כדאי לוודא שהוספת את ההכנסות, ההוצאות והתרומות האחרונות.",
    importHintPrefix: "יש לך כמה פעולות לעדכן?",
    importHintEmphasis: "אפשר לייבא אותן בקלות מקובץ Excel.",
    cta: "לעדכון המעשרות ב־Ten10",
    encouragementLabel: "פינת החיזוק",
    footerPreferenceNote: "נשלח אליך לפי העדפות התזכורת שבחרת",
    unsubscribeReminder: "הפסקת תזכורות חודשיות",
    unsubscribeAll: "ביטול הרשמה מכל המיילים",
    subject: {
      outstanding: (amount) => `תזכורת מעשר - נותרו ${amount} לתרומה`,
      credit: (amount) => `תזכורת מעשר - הינך בזכות של ${amount}`,
      settled: "תזכורת מעשר - היתרה שלך מאוזנת",
    },
    monthlyEncouragements: HEBREW_ENCOURAGEMENTS,
  },
  en: {
    htmlLang: "en",
    direction: "ltr",
    locale: "en-US",
    slogan: "Simple and Accurate Tithe and Financial Budget Management",
    greeting: "Good evening",
    reminder:
      "A quick reminder to update your tithes and keep your balance accurate.",
    balance: {
      outstanding: "Your remaining tithe balance is",
      credit: "You currently have a credit of",
      settled: "Your tithe balance is settled",
    },
    verification:
      "Make sure you have added your latest income, expenses, and donations.",
    importHintPrefix: "Several transactions to update?",
    importHintEmphasis: "You can easily import them from an Excel file.",
    cta: "Update your tithes in Ten10",
    encouragementLabel: "Encouragement Corner",
    footerPreferenceNote:
      "Sent according to the reminder preferences you selected",
    unsubscribeReminder: "Stop monthly reminders",
    unsubscribeAll: "Unsubscribe from all emails",
    subject: {
      outstanding: (amount) => `Tithe reminder - ${amount} remaining`,
      credit: (amount) => `Tithe reminder - ${amount} credit`,
      settled: "Tithe reminder - your balance is settled",
    },
    monthlyEncouragements: ENGLISH_ENCOURAGEMENTS,
  },
} satisfies Record<ReminderLanguage, ReminderLocaleCopy>;

export function normalizeReminderLanguage(
  value: unknown,
): ReminderLanguage {
  return value === "en" ? "en" : "he";
}

export function getMonthlyEncouragement(
  language: ReminderLanguage,
  month: number,
): MonthlyEncouragement {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Month must be between 1 and 12");
  }

  return REMINDER_COPY[language].monthlyEncouragements[month - 1];
}

export function getIsraelMonth(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      month: "numeric",
    }).format(date),
  );
}
