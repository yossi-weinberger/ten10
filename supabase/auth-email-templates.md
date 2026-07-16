# תבניות אימייל עבור Supabase Auth

Below are the styled HTML templates for Supabase's built-in authentication emails (email confirmation, password reset, etc.).
Copy the HTML and paste it into the Supabase Dashboard under:
**Authentication -> Configuration -> Email Templates**

---

### 1. Confirm Your Signup (אימות הרשמה)

**נושא (Subject):** אשר את הרשמתך ל-Ten10

**קוד HTML:**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #e9e7df; direction: rtl; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#e9e7df" style="width: 100%; margin: 0; padding: 0; background-color: #e9e7df; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#f7f3e7" style="width: 100%; max-width: 600px; background-color: #f7f3e7; border-collapse: collapse; border: 1px solid #d4d0c3;">
            <tr>
              <td align="center" bgcolor="#f9f6eb" style="padding: 29px 28px 22px 28px; background-color: #f9f6eb; background-image: radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%); background-repeat: no-repeat; border-bottom: 1px solid #ded9ca; text-align: center;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <img src="https://ten10-app.com/logo/logo-wide.png" width="142" alt="Ten10" style="display: block; width: 142px; max-width: 142px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 13px 0 9px 0;">
                      <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                        <tr>
                          <td bgcolor="#f0c000" height="4" style="height: 4px; line-height: 4px; font-size: 0; background-color: #f0c000;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 12px; font-weight: 600; line-height: 18px; padding: 0;">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 31px 32px 28px 32px; color: #243834; direction: rtl; text-align: right; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; background-color: #f7f3e7;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0 0 8px 0; color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: 700; line-height: 34px;">ברוכים הבאים ל-Ten10!</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">שמחים שהצטרפת אלינו.</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 24px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">כדי להתחיל להשתמש במערכת, אנא אשר את כתובת האימייל שלך על ידי לחיצה על הכפתור למטה:</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 22px 0;">
                      <a href="{{ .ConfirmationURL }}" style="display: block; background-color: #11676a; color: #fffdf8 !important; border-radius: 8px; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 700; line-height: 20px; padding: 15px 22px; text-align: center; text-decoration: none;">אשר הרשמה</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9f6eb" style="background-color: #f9f6eb; border-collapse: collapse; border-radius: 8px;">
                        <tr>
                          <td style="padding: 14px 16px; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 22px; text-align: right; border-right: 4px solid #f0c000;">אם לא נרשמת ל-Ten10, ניתן להתעלם ממייל זה.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#efebdf" style="padding: 19px 24px; background-color: #efebdf; border-top: 1px solid #ded9ca; color: #6b7471; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 18px;">© 2025 Ten10. כל הזכויות שמורות.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

### 2. Reset Password (איפוס סיסמה)

**נושא (Subject):** איפוס סיסמה ל-Ten10

**קוד HTML:**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #e9e7df; direction: rtl; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#e9e7df" style="width: 100%; margin: 0; padding: 0; background-color: #e9e7df; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#f7f3e7" style="width: 100%; max-width: 600px; background-color: #f7f3e7; border-collapse: collapse; border: 1px solid #d4d0c3;">
            <tr>
              <td align="center" bgcolor="#f9f6eb" style="padding: 29px 28px 22px 28px; background-color: #f9f6eb; background-image: radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%); background-repeat: no-repeat; border-bottom: 1px solid #ded9ca; text-align: center;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <img src="https://ten10-app.com/logo/logo-wide.png" width="142" alt="Ten10" style="display: block; width: 142px; max-width: 142px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 13px 0 9px 0;">
                      <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                        <tr>
                          <td bgcolor="#f0c000" height="4" style="height: 4px; line-height: 4px; font-size: 0; background-color: #f0c000;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 12px; font-weight: 600; line-height: 18px; padding: 0;">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 31px 32px 28px 32px; color: #243834; direction: rtl; text-align: right; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; background-color: #f7f3e7;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0 0 8px 0; color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: 700; line-height: 34px;">איפוס סיסמה</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">קיבלנו בקשה לאיפוס הסיסמה שלך.</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 24px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">לחץ על הכפתור למטה כדי לבחור סיסמה חדשה:</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 22px 0;">
                      <a href="{{ .ConfirmationURL }}" style="display: block; background-color: #11676a; color: #fffdf8 !important; border-radius: 8px; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 700; line-height: 20px; padding: 15px 22px; text-align: center; text-decoration: none;">אפס סיסמה</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9f6eb" style="background-color: #f9f6eb; border-collapse: collapse; border-radius: 8px;">
                        <tr>
                          <td style="padding: 14px 16px; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 22px; text-align: right; border-right: 4px solid #f0c000;">אם לא ביקשת לאפס את הסיסמה, ניתן להתעלם ממייל זה בבטחה.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#efebdf" style="padding: 19px 24px; background-color: #efebdf; border-top: 1px solid #ded9ca; color: #6b7471; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 18px;">© 2025 Ten10. כל הזכויות שמורות.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

### 3. Magic Link (כניסה ללא סיסמה)

**נושא (Subject):** קישור כניסה ל-Ten10

**קוד HTML:**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #e9e7df; direction: rtl; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#e9e7df" style="width: 100%; margin: 0; padding: 0; background-color: #e9e7df; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#f7f3e7" style="width: 100%; max-width: 600px; background-color: #f7f3e7; border-collapse: collapse; border: 1px solid #d4d0c3;">
            <tr>
              <td align="center" bgcolor="#f9f6eb" style="padding: 29px 28px 22px 28px; background-color: #f9f6eb; background-image: radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%); background-repeat: no-repeat; border-bottom: 1px solid #ded9ca; text-align: center;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <img src="https://ten10-app.com/logo/logo-wide.png" width="142" alt="Ten10" style="display: block; width: 142px; max-width: 142px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 13px 0 9px 0;">
                      <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                        <tr>
                          <td bgcolor="#f0c000" height="4" style="height: 4px; line-height: 4px; font-size: 0; background-color: #f0c000;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 12px; font-weight: 600; line-height: 18px; padding: 0;">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 31px 32px 28px 32px; color: #243834; direction: rtl; text-align: right; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; background-color: #f7f3e7;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0 0 8px 0; color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: 700; line-height: 34px;">התחברות ל-Ten10</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">ביקשת להיכנס למערכת באמצעות קישור קסם.</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 24px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">לחץ על הכפתור למטה כדי להתחבר מיד:</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 22px 0;">
                      <a href="{{ .ConfirmationURL }}" style="display: block; background-color: #11676a; color: #fffdf8 !important; border-radius: 8px; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 700; line-height: 20px; padding: 15px 22px; text-align: center; text-decoration: none;">התחבר עכשיו</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9f6eb" style="background-color: #f9f6eb; border-collapse: collapse; border-radius: 8px;">
                        <tr>
                          <td style="padding: 14px 16px; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 22px; text-align: right; border-right: 4px solid #f0c000;">אם לא ביקשת להתחבר, ניתן להתעלם ממייל זה.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#efebdf" style="padding: 19px 24px; background-color: #efebdf; border-top: 1px solid #ded9ca; color: #6b7471; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 18px;">© 2025 Ten10. כל הזכויות שמורות.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

### 4. Invite User (הזמנת משתמש)

**נושא (Subject):** הוזמנת להצטרף ל-Ten10

**קוד HTML:**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #e9e7df; direction: rtl; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#e9e7df" style="width: 100%; margin: 0; padding: 0; background-color: #e9e7df; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#f7f3e7" style="width: 100%; max-width: 600px; background-color: #f7f3e7; border-collapse: collapse; border: 1px solid #d4d0c3;">
            <tr>
              <td align="center" bgcolor="#f9f6eb" style="padding: 29px 28px 22px 28px; background-color: #f9f6eb; background-image: radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%); background-repeat: no-repeat; border-bottom: 1px solid #ded9ca; text-align: center;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <img src="https://ten10-app.com/logo/logo-wide.png" width="142" alt="Ten10" style="display: block; width: 142px; max-width: 142px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 13px 0 9px 0;">
                      <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                        <tr>
                          <td bgcolor="#f0c000" height="4" style="height: 4px; line-height: 4px; font-size: 0; background-color: #f0c000;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 12px; font-weight: 600; line-height: 18px; padding: 0;">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 31px 32px 28px 32px; color: #243834; direction: rtl; text-align: right; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; background-color: #f7f3e7;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0 0 8px 0; color: #11676a; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: 700; line-height: 34px;">הוזמנת ל-Ten10!</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">הוזמנת להצטרף לניהול המעשרות והתקציב ב-Ten10.</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 24px 0; color: #4a5955; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px;">לחץ על הכפתור למטה כדי לקבל את ההזמנה וליצור את החשבון שלך:</td>
                  </tr>
                  <tr>
                    <td style="padding: 0;">
                      <a href="{{ .ConfirmationURL }}" style="display: block; background-color: #11676a; color: #fffdf8 !important; border-radius: 8px; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 700; line-height: 20px; padding: 15px 22px; text-align: center; text-decoration: none;">קבל הזמנה</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#efebdf" style="padding: 19px 24px; background-color: #efebdf; border-top: 1px solid #ded9ca; color: #6b7471; font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 18px;">© 2025 Ten10. כל הזכויות שמורות.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```
