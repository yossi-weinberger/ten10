# Password Reset (Web) — Supabase Auth

This guide documents the web password reset flow implemented in the app and how it connects to Supabase Auth emails.

---

## Routes / Pages

- `/login` (`src/pages/LoginPage.tsx`)
  - Includes a "Forgot password?" / "שכחת סיסמה?" link to `/forgot-password`.
- `/forgot-password` (`src/pages/ForgotPasswordPage.tsx`)
  - Sends a reset email using `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- `/reset-password` (`src/pages/ResetPasswordPage.tsx`)
  - Lets the user set a new password using `supabase.auth.updateUser({ password })`.
  - Supports modern PKCE links by calling `supabase.auth.exchangeCodeForSession(code)` when `?code=...` is present.

---

## Supabase URL Configuration (Local Testing)

If you are developing locally and the reset email redirects to production, it usually means the local URL is not in Supabase **Allowed Redirect URLs**.

In the Supabase Dashboard:

- Authentication → URL Configuration
- Add:
  - `http://localhost:5173`
  - `http://localhost:5173/reset-password`

Then send the reset email again.

---

## Translations

Strings are defined under the `auth` namespace:

- `public/locales/he/auth.json`
- `public/locales/en/auth.json`

Keys added:

- `login.forgotPassword`
- `forgotPassword.*`
- `resetPassword.*`

---

## Notes

- The reset flow is **web-only** (desktop shows a message).
- `ResetPasswordPage` requires a valid session (set from the recovery link) before allowing password update.
