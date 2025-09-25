/**
 * Email Templates for Reminder Emails
 * Separated from main function for better maintainability
 */

export interface EmailTemplateData {
  titheBalance: number;
  isPositive: boolean;
  isNegative: boolean;
  userName?: string;
  unsubscribeUrls?: {
    reminderUrl: string;
    allUrl: string;
  };
}

export function generateReminderEmailHTML(data: EmailTemplateData): string {
  const { titheBalance, isPositive, isNegative } = data;

  const backgroundColor = isPositive
    ? "#fef3c7" // Yellow for positive balance
    : isNegative
    ? "#d1fae5" // Green for negative balance (excellent - overpaid!)
    : "#d1fae5"; // Green for exact balance

  const textColor = isPositive ? "#92400e" : isNegative ? "#065f46" : "#065f46";

  const statusText = isPositive
    ? `נותר לך ${Math.abs(titheBalance).toFixed(2)} ₪ לתרומה`
    : isNegative
    ? `מצוין! תרמת יותר מהנדרש ב-${Math.abs(titheBalance).toFixed(2)} ₪`
    : "אתה בדיוק ביעד!";

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>תזכורת מעשר - Ten10</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc; direction: rtl;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px; direction: rtl;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; direction: rtl;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Ten10</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 16px;">ניהול מעשרות חכם</p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">עדכון: ${new Date().toLocaleDateString(
            "he-IL"
          )}</p>
        </div>

        <!-- Greeting -->
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; text-align: right;">שלום!</h2>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0; text-align: right;">
          זוהי התזכורת החודשית שלך לעדכון המעשרות.
        </p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: right;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">💡 זכור לעדכן:</h3>
          <ul style="color: #374151; font-size: 15px; line-height: 1.8; margin: 0; padding-right: 20px;">
            <li>הכנסות ומשכורות חדשות</li>
            <li>הוצאות נוספות</li>
            <li>תרומות שביצעת</li>
          </ul>
        </div>
        
        <!-- Balance Card -->
        <div style="background-color: ${backgroundColor}; 
                    padding: 25px; 
                    border-radius: 12px; 
                    margin: 25px 0;
                    border-left: 4px solid ${textColor};
                    text-align: right;">
          <h3 style="margin: 0; color: ${textColor}; font-size: 20px; font-weight: 600;">
            ${statusText}
          </h3>
        </div>
        
        <!-- Call to Action -->
        <div style="text-align: center; margin: 30px 0; direction: rtl;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0; text-align: right;">
            כדי לעדכון את המעשרות שלך, היכנס לאפליקציה:
          </p>
          <a href="https://ten10-app.com" 
             style="background-color: #2563eb; 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    display: inline-block;
                    font-weight: 600;
                    font-size: 16px;
                    transition: background-color 0.2s;">
            פתח את Ten10
          </a>
        </div>
        
        <!-- Footer -->
        <hr style="margin: 40px 0 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <!-- Unsubscribe Buttons -->
        ${
          data.unsubscribeUrls
            ? `
        <div style="text-align: center; margin: 0 0 30px 0;">
          <div style="margin: 0 0 15px 0;">
            <a href="${data.unsubscribeUrls.reminderUrl}" 
               style="background-color: #f59e0b; 
                      color: white; 
                      padding: 10px 20px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;
                      font-weight: 500;
                      font-size: 14px;
                      margin: 0 5px;">
              הפסקת תזכורות חודשיות
            </a>
          </div>
          <div style="margin: 0;">
            <a href="${data.unsubscribeUrls.allUrl}" 
               style="background-color: #6b7280; 
                      color: white; 
                      padding: 8px 16px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;
                      font-weight: 400;
                      font-size: 12px;">
              ביטול הרשמה מכל המיילים
            </a>
          </div>
        </div>
        `
            : ""
        }
        
        <div style="text-align: center; direction: rtl;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; text-align: right;">
            ${
              data.unsubscribeUrls
                ? "תוכל גם להגיע לדף ההגדרות באפליקציה לעדכון העדפות המייל שלך."
                : "אם אינך רוצה לקבל תזכורות אלו, תוכל לבטל אותן בהגדרות האפליקציה."
            }
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: right;">
            © 2025 Ten10. כל הזכויות שמורות.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

export function generateReminderEmailSubject(data: EmailTemplateData): string {
  const { titheBalance, isPositive, isNegative } = data;

  if (isPositive) {
    return `תזכורת מעשר - נותר לך ${Math.abs(titheBalance).toFixed(
      2
    )} ₪ לתרומה`;
  } else if (isNegative) {
    return `תזכורת מעשר - מצוין! תרמת יותר מהנדרש ב-${Math.abs(
      titheBalance
    ).toFixed(2)} ₪`;
  } else {
    return `תזכורת מעשר - אתה בדיוק ביעד!`;
  }
}
