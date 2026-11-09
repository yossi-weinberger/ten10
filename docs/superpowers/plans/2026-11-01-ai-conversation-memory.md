# זיכרון בשיחה

נכתב ב־1/11/2026 על feat/ai-intake (e2e41e7c). יוסי אישר את הכיוון.

## למה

יוסי ניהל שיחה אמיתית עם העוזר ב־testing. העוזר לא החזיק את השיחה:
- «כל חודש בעשירי נכנס לי 100 מקצבה» נשמר כתנועה אחת ב־01/11.
- «אבל זה כל חודש» לא שינה את הטיוטה שעל המסך.
- אחרי «על איזו תקופה?» התשובה «כל התקופות» נקראה כשאלה חדשה ונשארה בלי תשובה.
- «וכמה הוצאות?» לא לקח את התקופה מהשאלה הקודמת.
- «כמה אני חייב למעשרות?», «היי» ו«מותר לשלם שכר לימוד ממעשרות?» קיבלו out_of_scope.
- «כמה הוראות קבע יש לי» קיבל שאלת תקופה.
- «אבל זה פטור ממעשרות» הציע כלל שלא התבקש, במקום לסמן את התנועה כהכנסה פטורה.

השורש:
- beginTurn (AssistantDrawer.tsx, בערך שורה 1029) מאפס את כל המצב בכל הודעה.
- Jev (ai-classify-intent), הקורא (ai-split-items) ו־ai-read-question מקבלים רק את ההודעה הנוכחית.
- הניתוב לפי התווית של Jev גובר על מה שהקורא קרא. ב־showIntent, כרטיס הוראת קבע מוצג רק כש־nextIntent === "create_recurring".

## החלטות

- Jev, הקורא, הכרטיסים, הבדיקות בקוד (עיגון, תאריכים, תקופות, decideQuestionFilter), השמירה וה־RPC נשארים.
- משתנים חמישה דברים: זיכרון, הקשר למודלים, החלטה לפי התוכן, תשובות חסרות וניסוח.
- ההקשר למודלים בנוי רק מהמילים של המשתמש, מהטקסט שהועתק מקבלה, ומסיכום שהקוד כותב. הטקסט שהעוזר הציג לא נשלח למודלים.
- שמירה רק בלחיצה. עריכה או מחיקה של תנועה שכבר נשמרה נשארות מחוץ לתחום. ביטול של טיוטה שלא נשמרה נתמך.
- הטקסטים של העוזר קבועים, בקבצי התרגום. המודל לא מנסח תשובות.
- לא בתוכנית:
  - מודל אחד עם כלים במקום Jev.
  - שיפור זמנים.
  - עריכה של תנועה שמורה.
  - ניסוח חופשי של המודל. אם סט השיחות יראה שהשיחה עדיין מרגישה מכנית, שלב אפשרי אחרי C6 הוא משפט קצר שהמודל מנסח, עם בדיקה שכל מספר בו מופיע בהודעות המשתמש או בנתונים.
  - הבעיות הידועות: תקופות של חגים, period: null ו־Zod על «לפני ראש השנה», הוראת קבע בלוח העברי בריצה אחת מתוך שתיים, החוק «גן» בריצה אחת מתוך שתיים, ו«ישיבה» שלא מציעה את «ישיבת נחלת».

## מצב השיחה

ConversationState נשמר ב־ref במגירה ולא מתאפס ב־beginTurn:
- recentUserTexts: עד 3 הודעות משתמש אחרונות, כל אחת עד 400 תווים. המילים שלו בלבד, ובהקלטה התמלול.
- receiptText: הטקסט שהועתק מהקבלה האחרונה, כשהיא עדיין על המסך.
- onScreen: מה שהתשובה האחרונה הציגה ועדיין פתוח. אחד מאלה:
  - draft: תנועה אחת או כמה, עדיין לא נשמרו.
  - recurring: כרטיס הוראת קבע.
  - data_answer: השאלה שנענתה (YearTypeSum).
  - halacha או inspiration: הדף או הפריט שהוצג.
  - saved: savedItemId.
  לכל אחד יש גם sourceText.
- pending: השאלה שהעוזר שאל ומחכה לה (amount, period, family או name), עם ה־sourceText של הבקשה המקורית.

pending נקבע בכל מקום שבו העוזר שואל היום: «כמה?», period_missing, family_missing, ו־category_missing (שם).

handleSubmit, handleReceipt, finishVoice ו־handleAmountReply מעדכנים את ConversationState. ConversationState מתאפס ב־clearConversation, וכשהתור הבא הוא נושא חדש (C3). onScreen הופך ל־saved אחרי שמירה.

## בלוק ההקשר

פונקציה טהורה, conversationContext(state), ב־supabase/functions/_shared/ai/conversation-context.ts. הבלוק מסומן כנתונים ולא כהוראות, והאורך שלו עד 800 תווים. לדוגמה:

  Earlier messages from the user, oldest first:
  1. "כל 10 לחודש נכנס לי 250 מביטוח לאומי"
  On screen now, not saved: one transaction, income 250 ILS, "ביטוח לאומי", 2026-11-01, one time.
  The assistant is waiting for: nothing.

השורות «On screen» ו־«waiting for» נכתבות מהמבנה, לא מהטקסט שהוצג. ב־Jev היום MAX_TEXT = 500, וצריך להגדיל אותו כך שההקשר וההודעה ייכנסו. ההקשר לא נכתב ללוגים, לפי RULE.md כלל 11.

## שלבים

PR לכל שלב, מול feat/ai-intake. אחרי כל שינוי בפונקציית Edge: פריסה ל־testing ודיווח.

C1. החלטת התור בפונקציה טהורה, בלי שינוי התנהגות (בוצע, #640)
- להוציא מ־handleSubmit, shownIntent ו־showIntent את ההחלטה «מה להציג ומה pending» לפונקציה decideTurn ב־src/lib/ai/assistant-turn.ts. הקלט: הודעה, תוצאת Jev, תוצאת הקורא, תוצאת השאלה ו־ConversationState. הפלט: מה להציג ומה המצב הבא. המגירה רק מחילה את התוצאה.
- סט שיחות: fixtures/conversation-eval-cases.json, ו־runner בשם conversation-eval-run.ts. ה־runner קורא ל־Jev, לקורא ולשאלה עם אותם request builders ואותם קלטים כמו האפליקציה, ואז ל־decideTurn. לא מעתיקים לוגיקה לתוך הבדיקה.
- ריצה אחת = הבסיס של היום.

C2. ההחלטה לפי מה שנקרא (בוצע, #643)
- פריט עם recurrence, ובלי unsupportedFrequency, מקבל כרטיס הוראת קבע, בלי קשר לתווית של Jev.
- כרטיס כלל רק כשהקורא החזיר rule, לא לפי התווית.
- «זה פטור ממעשרות» ליד תנועה: הסוג המיוחד בכרטיס (type או type_question), בלי להציע כלל.
- הלכה, לפי halacha_page של Jev:
  - אחד מארבעת הדפים מעל הסף מוצג, בלי קשר לתווית.
  - personal מציג את כרטיס הרב.
  - none ו־out_of_scope נשארים out_of_scope.
  - HALACHA_CRITERIA.personal: «A question about tithe or charity money that no published page answers, or a personal ruling about the user's own money. Do not answer the ruling.»
  - INTENT_CRITERIA.out_of_scope: להוריד ממנו «a personal halachic ruling».

C3. זיכרון והקשר (בוצע, #645; followed_up עוד לא נבנה)
- ConversationState כמו שמתואר למעלה.
- ai-classify-intent, ai-split-items ו־ai-read-question מקבלים שדה context, הבלוק מלמעלה, שמוצג במודל לפני ההודעה.
- Jev:
  - הוראה אחת לכל השאלות: «When the message answers the assistant's question or changes what is on screen, choose the intent of what is on screen.»
  - help: להוסיף «A greeting with no request is this.»
  - out_of_scope: «delete, edit, undo» הופך ל־«deleting, editing, or undoing a saved transaction».
- הקורא:
  - שני שדות חדשים ונדרשים, עם default false ב־Zod:
    - continues: «When the message changes or completes what is on screen, return the full updated items and set continues to true.»
    - discards: «The user asks to drop what is on screen.»
  - continues=true ו־onScreen הוא draft או recurring: מחליפים את הכרטיס שעל המסך במקום להוסיף כרטיס חדש.
  - continues=true ו־onScreen הוא saved: טקסט קבוע «זה כבר נשמר» עם כפתור הביטול הקיים.
  - discards=true: הכרטיס שעל המסך יורד, בלי שמירה.
- עיגון:
  - כש־continues=true, ‏amount_text ו־date_text יכולים להגיע מכל אחת מ־recentUserTexts ומ־receiptText.
  - כש־continues=false, רק מההודעה החדשה. כך סכום מהודעה קודמת לא נכנס לתנועה חדשה.
  - אותו כלל ב־anchoredQuestionName.
- pending:
  - amount: כמו handleAmountReply היום. digitsOnlyAmount נשאר, ואחרת קוראים שוב את «sourceText + התשובה».
  - period, family ו־name: קודם מנסים לקרוא את «sourceText + התשובה» כשאלה. אם הקריאה ממלאת את השדה שחסר, זו תשובה. אחרת זה נושא חדש, pending מתבטל, והזרימה רגילה. התווית של Jev היא רק שובר שוויון.
- שאלה: ההוראה ב־periodPrompt: «When the question continues the previous question, use its period unless it names a new one.» גם Jev slots מקבל את ההקשר.
- מדידת השאלות (question-outcome.ts): שאלה שהיא המשך של השאלה הקודמת לא נספרת כ־asked_again. מוסיפים outcome בשם followed_up, והשאלה הקודמת מסומנת answered. אם יש CHECK על הערכים ב־mark_ai_question_outcome, צריך מיגרציה עם rollback.

C4. תשובות חסרות (בוצע, #645)
- יתרה:
  - INTENT_CRITERIA.ask_data: להוסיף «including the user's tithe balance, such as how much tithe they still owe».
  - measure חדש ב־question-slots, balance. הוא עונה מ־fetchServerTitheBalance (analytics.service.ts, ה־RPC calculate_user_tithe_balance), אותו מספר שבדשבורד. בלי תקופה ובלי משפחה.
  - כרטיס: יתרת מעשר, וחומש אם מופעל.
- הוראות קבע: בחירה חדשה ב־Jev slots, subject: transactions או standing_orders. עבור standing_orders: המספר והרשימה מ־fetchActiveRecurring, וקישור לטבלה, בלי שאלת תקופה.
- ברכה: help עם טקסט קצר.
- out_of_scope: טקסט קבוע אחד בנוסח «את זה אני לא יודע לעשות. אפשר לכתוב לי תנועה, לשאול על הנתונים, על יתרת המעשר, או שאלה על מעשרות».
- העוזר לא מציע פעולה שאין לה מסלול בקוד.

C5. ניסוח ותיקונים קטנים (בוצע, #645)
- להסיר את showNotSaved ואת «שום דבר לא נשמר» מהתשובות. הם נשארים רק בטקסט הפתיחה כשהשיחה ריקה (emptyDescription).
- להסיר את שורת «זו נראית כמו...» כשמוצג כרטיס.
- הכרטיס מראה בעצמו אם הוא טיוטה או שכבר נשמר.
- MultiDraftList: התאריך והמטבע באותו פורמט כמו בכרטיס הבודד (01/11/2026, ₪). היום הרשימה מציגה card.date ו־card.currency כמו שהם.
- NAME_PREFIX_LETTERS ב־split-anchor.ts: להוסיף את האות מ (מש״ה וכל״ב). בדיקת יחידה: חוק «ביטוח לאומי» על «הכנסה מביטוח לאומי».

C6. בדיקה סופית (בוצע, שתי ריצות; הספים לא הושגו, ראו ai-progress)
- סט השיחות פעמיים.
- סט הכוונות (intent-eval-cases), סטי השאלות והתקופות, 264, הוראות הקבע והקבלות: פעם אחת בזמן העבודה ופעמיים בסוף. זה נדרש כי ההוראות של Jev ושל הקורא השתנו.
- מדידת זמן אחת, כמידע בלבד.
- ai-progress.md ו־ai-intake-how-it-works.md מעודכנים.

## סט השיחות

כ־50 שיחות, כל אחת של 2 עד 5 הודעות משתמש. השיחה של יוסי היא conv-001.

לכל תור מצופה:
- סוג התשובה: draft, drafts, recurring, rule, data_answer, balance, standing_orders, halacha, rabbi, inspiration, help, out_of_scope, discarded, או question.
- שדות מפתח: סכום, סוג, תדירות ויום, תקופה ומשפחה.
- ומה אסור שיקרה.

נושאים, ומספר שיחות לכל נושא:
- תיקון לטיוטה: 6.
- תשובה לשאלת העוזר (סכום, תקופה, משפחה, שם): 8, מהן לפחות 3 עם תשובה קצרה שבה Jev עלול לטעות.
- המשך של שאלת נתונים: 5.
- הוראת קבע שנאמרת כעובדה, כמו «כל חודש בעשירי נכנס לי»: 5.
- סוג מיוחד באותה הודעה: 3.
- יתרה: 4.
- הלכה: 5. עם דף, בלי דף («האם מותר לשלם שכר לימוד מכספי מעשרות?» מצופה rabbi או דף), אישית, והמשך («ומה עם חומש?»).
- ברכה, עזרה ומחוץ לתחום: 4.
- נושא חדש כשיש pending: 3.
- סכום ישן שאסור שיעבור לתנועה חדשה: 3.
- ביטול טיוטה בטקסט («לא משנה», «תמחק את זה»): 3.
- קבלה ואחריה תיקון: 2.
- חיזוק, ואחריו «עוד אחד» בטקסט: 1.
- כמה בקשות בהודעה אחת: 2.

מדדים:
- wrong_save: כרטיס שהיה נשמר עם סכום, סוג, תאריך או הוראת קבע שגויים.
- recurring_as_one_time.
- dead_end: out_of_scope או חוסר תשובה על משהו שנתמך.
- unnecessary_question.
- turn_correct.

ספים לאישור יוסי:
- wrong_save = 0.
- recurring_as_one_time = 0.
- dead_end = 0.
- turn_correct ≥ 90%.
- unnecessary_question ≤ 10%.

כל שורת תוצאה שומרת את ההודעה, ההקשר, תוצאת Jev, הפלט הגולמי של הקורא, ההחלטה והסיבה.

## לבדוק לפני C3

- MAX_TEXT של Jev וזמן התשובה שלו עם state ארוך יותר.
- שמשתמש הניסיון ב־testing יכול לקרוא ל־calculate_user_tithe_balance מהמגירה.
- אם יש CHECK על ערכי ה־outcome ב־ai (בשביל followed_up).
