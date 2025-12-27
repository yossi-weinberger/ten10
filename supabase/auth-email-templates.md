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
<html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8fafc;
        margin: 0;
        padding: 0;
        direction: rtl;
        text-align: right;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border-top: 6px solid #0d9488;
      }
      .header {
        background-color: #ffffff;
        padding: 40px 20px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
      }
      .logo {
        height: 60px;
        width: auto;
        margin-bottom: 10px;
      }
      .slogan {
        color: #0d9488;
        font-size: 14px;
        margin: 0;
        font-weight: 500;
      }
      .content {
        padding: 40px 30px;
        color: #374151;
        font-size: 16px;
        line-height: 1.6;
      }
      .title {
        color: #111827;
        font-size: 24px;
        font-weight: 700;
        margin-top: 0;
        margin-bottom: 20px;
      }
      .button {
        background-color: #0d9488;
        color: #ffffff;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        display: inline-block;
        font-weight: 600;
        font-size: 16px;
        margin: 20px 0;
      }
      .footer {
        background-color: #f9fafb;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img
          src="https://ten10-app.com/logo/logo-wide.png"
          alt="Ten10 Logo"
          class="logo"
        />
        <p class="slogan">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</p>
      </div>
      <div class="content">
        <h2 class="title">ברוכים הבאים ל-Ten10!</h2>
        <p>שמחים שהצטרפת אלינו.</p>
        <p>
          כדי להתחיל להשתמש במערכת, אנא אשר את כתובת האימייל שלך על ידי לחיצה על
          הכפתור למטה:
        </p>
        <div style="text-align: center;">
          <a href="{{ .ConfirmationURL }}" class="button">אשר הרשמה</a>
        </div>
        <p>אם לא נרשמת ל-Ten10, ניתן להתעלם ממייל זה.</p>
      </div>
      <div class="footer">
        <p>© 2025 Ten10. כל הזכויות שמורות.</p>
      </div>
    </div>
  </body>
</html>
```

---

### 2. Reset Password (איפוס סיסמה)

**נושא (Subject):** איפוס סיסמה ל-Ten10

**קוד HTML:**

```html
<!DOCTYPE html>
<html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8fafc;
        margin: 0;
        padding: 0;
        direction: rtl;
        text-align: right;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border-top: 6px solid #0d9488;
      }
      .header {
        background-color: #ffffff;
        padding: 40px 20px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
      }
      .logo {
        height: 60px;
        width: auto;
        margin-bottom: 10px;
      }
      .slogan {
        color: #0d9488;
        font-size: 14px;
        margin: 0;
        font-weight: 500;
      }
      .content {
        padding: 40px 30px;
        color: #374151;
        font-size: 16px;
        line-height: 1.6;
      }
      .title {
        color: #111827;
        font-size: 24px;
        font-weight: 700;
        margin-top: 0;
        margin-bottom: 20px;
      }
      .button {
        background-color: #0d9488;
        color: #ffffff;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        display: inline-block;
        font-weight: 600;
        font-size: 16px;
        margin: 20px 0;
      }
      .footer {
        background-color: #f9fafb;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img
          src="https://ten10-app.com/logo/logo-wide.png"
          alt="Ten10 Logo"
          class="logo"
        />
        <p class="slogan">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</p>
      </div>
      <div class="content">
        <h2 class="title">איפוס סיסמה</h2>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
        <p>לחץ על הכפתור למטה כדי לבחור סיסמה חדשה:</p>
        <div style="text-align: center;">
          <a href="{{ .ConfirmationURL }}" class="button">אפס סיסמה</a>
        </div>
        <p>אם לא ביקשת לאפס את הסיסמה, ניתן להתעלם ממייל זה בבטחה.</p>
      </div>
      <div class="footer">
        <p>© 2025 Ten10. כל הזכויות שמורות.</p>
      </div>
    </div>
  </body>
</html>
```

---

### 3. Magic Link (כניסה ללא סיסמה)

**נושא (Subject):** קישור כניסה ל-Ten10

**קוד HTML:**

```html
<!DOCTYPE html>
<html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8fafc;
        margin: 0;
        padding: 0;
        direction: rtl;
        text-align: right;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border-top: 6px solid #0d9488;
      }
      .header {
        background-color: #ffffff;
        padding: 40px 20px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
      }
      .logo {
        height: 60px;
        width: auto;
        margin-bottom: 10px;
      }
      .slogan {
        color: #0d9488;
        font-size: 14px;
        margin: 0;
        font-weight: 500;
      }
      .content {
        padding: 40px 30px;
        color: #374151;
        font-size: 16px;
        line-height: 1.6;
      }
      .title {
        color: #111827;
        font-size: 24px;
        font-weight: 700;
        margin-top: 0;
        margin-bottom: 20px;
      }
      .button {
        background-color: #0d9488;
        color: #ffffff;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        display: inline-block;
        font-weight: 600;
        font-size: 16px;
        margin: 20px 0;
      }
      .footer {
        background-color: #f9fafb;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img
          src="https://ten10-app.com/logo/logo-wide.png"
          alt="Ten10 Logo"
          class="logo"
        />
        <p class="slogan">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</p>
      </div>
      <div class="content">
        <h2 class="title">התחברות ל-Ten10</h2>
        <p>ביקשת להיכנס למערכת באמצעות קישור קסם.</p>
        <p>לחץ על הכפתור למטה כדי להתחבר מיד:</p>
        <div style="text-align: center;">
          <a href="{{ .ConfirmationURL }}" class="button">התחבר עכשיו</a>
        </div>
        <p>אם לא ביקשת להתחבר, ניתן להתעלם ממייל זה.</p>
      </div>
      <div class="footer">
        <p>© 2025 Ten10. כל הזכויות שמורות.</p>
      </div>
    </div>
  </body>
</html>
```

---

### 4. Invite User (הזמנת משתמש)

**נושא (Subject):** הוזמנת להצטרף ל-Ten10

**קוד HTML:**

```html
<!DOCTYPE html>
<html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8fafc;
        margin: 0;
        padding: 0;
        direction: rtl;
        text-align: right;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border-top: 6px solid #0d9488;
      }
      .header {
        background-color: #ffffff;
        padding: 40px 20px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
      }
      .logo {
        height: 60px;
        width: auto;
        margin-bottom: 10px;
      }
      .slogan {
        color: #0d9488;
        font-size: 14px;
        margin: 0;
        font-weight: 500;
      }
      .content {
        padding: 40px 30px;
        color: #374151;
        font-size: 16px;
        line-height: 1.6;
      }
      .title {
        color: #111827;
        font-size: 24px;
        font-weight: 700;
        margin-top: 0;
        margin-bottom: 20px;
      }
      .button {
        background-color: #0d9488;
        color: #ffffff;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        display: inline-block;
        font-weight: 600;
        font-size: 16px;
        margin: 20px 0;
      }
      .footer {
        background-color: #f9fafb;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img
          src="https://ten10-app.com/logo/logo-wide.png"
          alt="Ten10 Logo"
          class="logo"
        />
        <p class="slogan">ניהול מעשרות ותקציב פיננסי פשוט ומדויק</p>
      </div>
      <div class="content">
        <h2 class="title">הוזמנת ל-Ten10!</h2>
        <p>הוזמנת להצטרף לניהול המעשרות והתקציב ב-Ten10.</p>
        <p>לחץ על הכפתור למטה כדי לקבל את ההזמנה וליצור את החשבון שלך:</p>
        <div style="text-align: center;">
          <a href="{{ .ConfirmationURL }}" class="button">קבל הזמנה</a>
        </div>
      </div>
      <div class="footer">
        <p>© 2025 Ten10. כל הזכויות שמורות.</p>
      </div>
    </div>
  </body>
</html>
```
