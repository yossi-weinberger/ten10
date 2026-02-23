/**
 * Email Templates for Reminder Emails
 * Separated from main function for better maintainability
 */

import { EMAIL_THEME, getEmailHeader } from "../_shared/email-design.ts";

export interface EmailTemplateData {
  titheBalance: number;
  maaserBalance?: number;
  chomeshBalance?: number;
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
    ? EMAIL_THEME.colors.warning.bg // Yellow for positive balance
    : isNegative
    ? EMAIL_THEME.colors.success.bg // Green for negative balance (excellent - overpaid!)
    : EMAIL_THEME.colors.success.bg; // Green for exact balance

  const textColor = isPositive
    ? EMAIL_THEME.colors.warning.text
    : isNegative
    ? EMAIL_THEME.colors.success.text
    : EMAIL_THEME.colors.success.text;

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
    <body style="margin: 0; padding: 0; font-family: ${
      EMAIL_THEME.fonts.main
    }; background-color: ${
    EMAIL_THEME.colors.background
  }; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin-top: 40px; margin-bottom: 40px; direction: rtl; text-align: right; border-top: 6px solid ${
        EMAIL_THEME.colors.primary
      };">
        
        ${getEmailHeader("he")}

        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff; direction: rtl; text-align: right;">
          <!-- Greeting -->
          <h2 style="color: ${
            EMAIL_THEME.colors.textMain
          }; margin: 0 0 20px 0; font-size: 24px; text-align: right; font-weight: 700;">שלום!</h2>
          
          <p style="color: ${
            EMAIL_THEME.colors.textSecondary
          }; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0; text-align: right;">
            זוהי התזכורת החודשית שלך לעדכון המעשרות.
          </p>
          
          <div style="background-color: ${
            EMAIL_THEME.colors.success.bg
          }; border: 1px solid ${
    EMAIL_THEME.colors.success.border
  }; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: right;">
            <h3 style="color: ${
              EMAIL_THEME.colors.success.text
            }; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">💡 זכור לעדכן:</h3>
            <ul style="color: ${
              EMAIL_THEME.colors.success.text
            }; font-size: 15px; line-height: 1.8; margin: 0; padding-right: 20px;">
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
                      border-right: 4px solid ${textColor};
                      text-align: right;">
            <h3 style="margin: 0; color: ${textColor}; font-size: 20px; font-weight: 600;">
              ${statusText}
            </h3>
            ${
              typeof data.chomeshBalance === "number" && data.chomeshBalance !== 0
                ? `<p style="margin: 10px 0 0 0; color: ${textColor}; font-size: 14px; opacity: 0.85;">
                     מעשר: ${(data.maaserBalance ?? 0).toFixed(2)} ₪ | חומש: ${data.chomeshBalance.toFixed(2)} ₪
                   </p>`
                : ""
            }
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 40px 0 20px 0; direction: rtl;">
            <p style="color: ${
              EMAIL_THEME.colors.textSecondary
            }; font-size: 16px; margin: 0 0 20px 0; text-align: right;">
              כדי לעדכן את המעשרות שלך, היכנס לאפליקציה:
            </p>
            <a href="https://ten10-app.com" 
               style="background-color: ${EMAIL_THEME.colors.primary}; 
                      color: white; 
                      padding: 14px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: 600;
                      font-size: 16px;
                      box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2);
                      transition: background-color 0.2s;">
              פתח את Ten10
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid ${
          EMAIL_THEME.colors.border
        }; direction: rtl;">
          
          <!-- Unsubscribe Buttons -->
          ${
            data.unsubscribeUrls
              ? `
          <div style="margin-bottom: 25px;">
            <div style="margin-bottom: 12px;">
              <a href="${data.unsubscribeUrls.reminderUrl}" 
                 style="color: ${EMAIL_THEME.colors.warning.text}; 
                        text-decoration: none; 
                        font-weight: 500;
                        font-size: 14px;
                        border-bottom: 1px dotted ${EMAIL_THEME.colors.warning.text};">
                הפסקת תזכורות חודשיות
              </a>
            </div>
            <div>
              <a href="${data.unsubscribeUrls.allUrl}" 
                 style="color: ${EMAIL_THEME.colors.textLight}; 
                        text-decoration: none; 
                        font-weight: 400;
                        font-size: 12px;
                        border-bottom: 1px dotted ${EMAIL_THEME.colors.textLight};">
                ביטול הרשמה מכל המיילים
              </a>
            </div>
          </div>
          `
              : ""
          }
        
          <p style="color: ${
            EMAIL_THEME.colors.textLight
          }; font-size: 14px; margin: 0 0 10px 0;">
            ${
              data.unsubscribeUrls
                ? "תוכל גם להגיע לדף ההגדרות באפליקציה לעדכון העדפות המייל שלך."
                : "אם אינך רוצה לקבל תזכורות אלו, תוכל לבטל אותן בהגדרות האפליקציה."
            }
          </p>
          <p style="color: ${
            EMAIL_THEME.colors.textLight
          }; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Ten10. כל הזכויות שמורות.
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
