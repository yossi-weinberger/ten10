# Feature Overview: Contact Us

This document outlines the architecture and implementation of the "Contact Us" feature, which provides a unified entry point for users to contact the Halacha Rabbi or the development team across both web and desktop platforms.

## Core Components & Logic

The feature is composed of several key parts that work together:

- **`ContactFAB.tsx`**: A global Floating Action Button that serves as the main entry point. It's rendered in `App.tsx` and is always visible.
- **Platform-Specific UI**: The FAB uses the `usePlatform` hook to render a different experience for web and desktop users.
- **`contact.service.ts`**: A service layer that encapsulates the logic for communicating with the backend (Supabase).
- **Supabase Backend**:
  - **`contact_messages` Table**: Stores all incoming messages with relevant metadata.
  - **`verify-captcha` Edge Function**: A dedicated, secure function to validate Cloudflare Turnstile CAPTCHA tokens.
  - **`send-contact-email` Edge Function**: A function triggered by a database webhook to send email notifications.
- **Tauri Commands (`platform_commands.rs`)**: Rust functions (`get_platform_info`, `copy_to_clipboard`) that securely expose desktop-native functionalities to the frontend.

---

## Platform-Specific Workflows

The user experience and technical flow are tailored for each platform.

### 1. Web Platform

The web flow is designed for a seamless, in-app experience.

#### User Flow:

1.  User clicks the **Contact FAB**.
2.  A **`ContactModal`** opens, presenting two tabs: "Contact Rabbi" and "Contact Dev Team".
3.  The user fills out the unified **`ContactForm`** component, which conditionally shows the "Severity" field for the dev team.
4.  The integrated, invisible Cloudflare Turnstile widget generates a CAPTCHA token in the background.
5.  Upon submission, the user receives a success or error toast notification.

#### Technical Flow & Rationale:

The architecture is designed to be robust, secure, and decoupled.

1.  **CAPTCHA First**: `contact.service.ts` first calls the `verify-captcha` Edge Function.
    - **Why?**: This prevents bots from writing to the database. The check is done on the server-side for security.
2.  **Direct Database Insert**: If CAPTCHA is valid, the service performs a direct `supabase.from('contact_messages').insert(...)`.
    - **Why?**: This aligns with the project's existing pattern for simple data writes and completely avoids the CORS issues that arise from `invoke()` calls from the browser. It's a reliable and fast way to confirm to the user that their message has been saved.
3.  **Webhook-Triggered Email**: An insert into the `contact_messages` table automatically triggers a **Database Webhook**.
    - **Why?**: This decouples the core action (saving the user's message) from a secondary action (sending an email). If the email service has a temporary issue, the user's message is still saved securely, and the email can be resent. It also provides a faster UI response to the user.
4.  **Email Sending**: The webhook invokes the `send-contact-email` function, which formats a detailed HTML email (with separate, localized templates for the Rabbi and Devs) and sends it via AWS SES.

### 2. Desktop Platform (Tauri)

The desktop flow is designed to work offline and integrate with the user's native environment without forcing the use of a specific email client.

#### User Flow:

1.  User clicks the **Contact FAB**.
2.  A native-style **`Dialog`** opens.
3.  The dialog displays the email addresses for the Rabbi and the Dev Team in separate, read-only input fields.
4.  It also displays pre-formatted technical information (App Version, OS, Language) in a read-only text area.
5.  The user can easily copy the email address or the technical info to their clipboard using dedicated "Copy" buttons.
6.  The user then pastes this information into their own email client to send the message.

#### Technical Flow & Rationale:

This flow leverages Tauri's secure bridge between the frontend and the Rust backend.

1.  **Detect Platform**: The `ContactFAB` uses `usePlatform()` to identify it's running in a desktop environment.
2.  **Invoke Rust Commands**:
    - When the dialog opens, it calls `invoke('get_platform_info')` to fetch the app version and OS details from the Rust backend.
    - When a user clicks a copy button, it calls `invoke('copy_to_clipboard', { text: '...' })`.
    - **Why?**: This is the secure and correct way to access native OS features. The logic is written in Rust and only a minimal, secure API is exposed to the frontend. This prevents web-based code from trying to access desktop-only APIs.
3.  **Why Not `mailto:`?**: The initial plan was to use a `mailto:` link. This was changed for several reasons:
    - **User Experience**: Many users may not have a default email client configured, leading to a broken experience.
    - **Reliability**: The copy-paste method ensures the user can always send the email, regardless of their setup.
    - **Data Integrity**: It guarantees that the crucial diagnostic information is provided to the user in a clear, copyable format, increasing the chances it will be included in the support request.

---

## Internationalization (i18n) & UI Polish

- **Dynamic Positioning (RTL/LTR)**: The `ContactFAB` is positioned on the `right` in LTR languages (like English) and on the `left` in RTL languages (like Hebrew) using `i18n.dir()` and Tailwind variants. This prevents it from overlapping with the sidebar.
- **Text Alignment**: All labels and text within the web forms use `className="text-start"` to automatically align left or right based on the current language, ensuring a native feel.
- **Email Templates**: The `send-contact-email` function contains two separate HTML templates. The template for the Rabbi is fully RTL and in Hebrew. The template for the dev team is LTR and in English.
