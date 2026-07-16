import { describe, expect, it } from "vitest";
import {
  getIsraelMonth,
  getMonthlyEncouragement,
  normalizeReminderLanguage,
  REMINDER_COPY,
} from "./email-copy.ts";

const EXPECTED_MONTH_PAIRS = [
  {
    month: 1,
    he: {
      body: "עשר תעשר את כל תבואת זרעך היוצא השדה שנה שנה",
      source: "דברים יד, כב",
    },
    en: {
      body: "You shall surely tithe all the produce of your planting, year by year.",
      source: "Deuteronomy 14:22",
    },
  },
  {
    month: 2,
    he: {
      body: "עשר בשביל שתתעשר",
      source: "תלמוד בבלי, תענית ט׳ ע״א",
    },
    en: {
      body: "Give ma'aser so that you will prosper.",
      source: "Babylonian Talmud, Taanit 9a",
    },
  },
  {
    month: 3,
    he: {
      body: "הביאו את כל המעשר אל בית האוצר... והריקותי לכם ברכה עד בלי די",
      source: "מלאכי ג, י",
    },
    en: {
      body: "Bring the full tithe into the storehouse... and I will pour out blessing without end.",
      source: "Malachi 3:10",
    },
  },
  {
    month: 4,
    he: {
      body: "וכל אשר תתן לי עשר אעשרנו לך",
      source: "בראשית כח, כב",
    },
    en: {
      body: "Of all that You give me, I will surely give a tenth to You.",
      source: "Genesis 28:22",
    },
  },
  {
    month: 5,
    he: {
      body: "הפרשת מעשר מדויקת הופכת כוונה טובה להרגל של נתינה.",
    },
    en: {
      body: "Accurate ma'aser turns a good intention into a lasting habit of giving.",
    },
  },
  {
    month: 6,
    he: {
      body: "גם כשחומש מלא קשה, אפשר להתחיל בהדרגה ולהוסיף בנתינה כשמתאפשר.",
      source: "על פי המקורות ההלכתיים של Ten10",
    },
    en: {
      body: "When giving a full chomesh is difficult, one can begin gradually and increase when possible.",
      source: "Based on Ten10's halachic library",
    },
  },
  {
    month: 7,
    he: {
      body: "החפץ חיים הציע למפרישי חומש לחשב מעשר פעמיים, כדי לשמור על דיוק.",
      source: "אהבת חסד",
    },
    en: {
      body: "The Chafetz Chaim advised those giving chomesh to calculate ma'aser twice for greater accuracy.",
      source: "Ahavas Chesed",
    },
  },
  {
    month: 8,
    he: {
      body: "כספי המעשר נועדו לצדקה, לחסד ולמעשים טובים.",
      source: "מתוך ספריית ההלכה של Ten10",
    },
    en: {
      body: "Ma'aser funds are meant for tzedakah, kindness, and good deeds.",
      source: "From Ten10's halachic library",
    },
  },
  {
    month: 9,
    he: {
      body: "יש שמייעצים לחלק את המעשר בין עזרה לעניים לבין מטרות מצווה חשובות.",
      source: "מתוך ספריית ההלכה של Ten10",
    },
    en: {
      body: "Some authorities advise dividing ma'aser between helping the poor and other important mitzvah purposes.",
      source: "From Ten10's halachic library",
    },
  },
  {
    month: 10,
    he: {
      body: "הלוואה לנזקק דרך גמ״ח יכולה להיות צדקה שממשיכה לעזור שוב ושוב.",
      source: "על פי אהבת חסד",
    },
    en: {
      body: "A loan through a gemach can become tzedakah that helps again and again.",
      source: "Based on Ahavas Chesed",
    },
  },
  {
    month: 11,
    he: {
      body: "גם הנחה או ויתור לנזקק יכולים להפוך מסחר יומיומי למעשה של צדקה.",
      source: "מתוך ספריית ההלכה של Ten10",
    },
    en: {
      body: "Even a discount or waived payment for someone in need can turn everyday commerce into tzedakah.",
      source: "From Ten10's halachic library",
    },
  },
  {
    month: 12,
    he: {
      body: "Ten10 צמחה מטבלאות Excel פשוטות שנועדו לעזור לחשב מעשר וחומש בדיוק.",
      source: "סיפור הקמת Ten10",
    },
    en: {
      body: "Ten10 grew from simple Excel sheets created to help people calculate ma'aser and chomesh accurately.",
      source: "The Ten10 origin story",
    },
  },
] as const;

describe("reminder email copy", () => {
  it("supports exactly Hebrew and English", () => {
    expect(Object.keys(REMINDER_COPY).sort()).toEqual(["en", "he"]);
  });

  it("falls back to Hebrew for missing or unsupported values", () => {
    expect(normalizeReminderLanguage(undefined)).toBe("he");
    expect(normalizeReminderLanguage(null)).toBe("he");
    expect(normalizeReminderLanguage("")).toBe("he");
    expect(normalizeReminderLanguage("fr")).toBe("he");
  });

  it("keeps English when explicitly selected", () => {
    expect(normalizeReminderLanguage("en")).toBe("en");
  });

  it("contains exactly 12 encouragement entries per language", () => {
    expect(REMINDER_COPY.he.monthlyEncouragements).toHaveLength(12);
    expect(REMINDER_COPY.en.monthlyEncouragements).toHaveLength(12);
  });

  it("keeps all 12 concrete Hebrew and English month pairs aligned", () => {
    for (const pair of EXPECTED_MONTH_PAIRS) {
      expect(getMonthlyEncouragement("he", pair.month)).toEqual(pair.he);
      expect(getMonthlyEncouragement("en", pair.month)).toEqual(pair.en);
    }
  });

  it("rejects month numbers outside 1 through 12", () => {
    expect(() => getMonthlyEncouragement("he", 0)).toThrow(
      "Month must be between 1 and 12",
    );
    expect(() => getMonthlyEncouragement("he", 13)).toThrow(
      "Month must be between 1 and 12",
    );
  });

  it("uses the Israeli calendar month at UTC month boundaries", () => {
    expect(getIsraelMonth(new Date("2026-01-31T22:30:00.000Z"))).toBe(2);
  });
});
