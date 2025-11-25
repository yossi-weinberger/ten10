# Feature Overview: Contact Us

This document outlines the architecture and implementation of the "Contact Us" feature, which provides a unified entry point for users to contact the Halacha Rabbi or the development team across both web and desktop platforms. The feature includes file upload capabilities for attachments (screenshots, documents, etc.).

## Core Components & Logic

The feature is composed of several key parts that work together:

- **`ContactFAB.tsx`**: A global Floating Action Button that serves as the main entry point. It's rendered in `App.tsx` and is **only visible to authenticated users** (checked via `useAuth` hook).
- **Platform-Specific UI**: The FAB uses the `usePlatform` hook to render a different experience for web and desktop users.
- **`ContactForm.tsx`**: A unified, generic form component that handles both "rabbi" and "dev" channels. It includes:
  - Subject and body fields (required for both channels)
  - Severity field (only for "dev" channel)
  - File upload component (available for both channels)
  - Cloudflare Turnstile CAPTCHA integration
- **`FileUpload.tsx`**: A reusable UI component (`src/components/ui/file-upload.tsx`) that provides drag-and-drop file upload functionality with:
  - File validation (size, type)
  - Visual feedback for selected files
  - File removal capability
  - Full i18n support (Hebrew/English)
- **`contact.service.ts`**: A service layer that encapsulates the logic for:
  - CAPTCHA verification
  - File upload to Supabase Storage (with ASCII-safe filename generation)
  - Direct database insert
- **Supabase Backend**:
  - **`contact_messages` Table**: Stores all incoming messages with relevant metadata, including an `attachments` JSONB column that stores file paths and original names.
  - **`contact-attachments` Storage Bucket**: A dedicated Supabase Storage bucket for uploaded files. Configured with RLS policies allowing only authenticated users to upload (`INSERT` permission for `authenticated` role).
  - **`verify-captcha` Edge Function**: A dedicated, secure function to validate Cloudflare Turnstile CAPTCHA tokens.
  - **`send-contact-email` Edge Function**: A function triggered by a database webhook to send email notifications with signed URLs for attachments.
- **Tauri Commands (`platform_commands.rs`)**: Rust functions (`get_platform_info`, `copy_to_clipboard`) that securely expose desktop-native functionalities to the frontend.

---

## Platform-Specific Workflows

The user experience and technical flow are tailored for each platform.

### 1. Web Platform

The web flow is designed for a seamless, in-app experience.

#### User Flow:

1. User clicks the **Contact FAB** (only visible when authenticated).
2. A **`ContactModal`** opens, presenting two tabs: "Contact Rabbi" and "Contact Dev Team".
3. The user fills out the unified **`ContactForm`** component, which conditionally shows:
   - The "Severity" field for the dev team
   - The file upload component for both channels (allows up to 3 files, max 5MB each)
4. The integrated, invisible Cloudflare Turnstile widget generates a CAPTCHA token in the background.
5. Upon submission, files are uploaded to Supabase Storage first, then the message is saved to the database.
6. The user receives a success or error toast notification with a ticket ID.

#### Technical Flow & Rationale:

The architecture is designed to be robust, secure, and decoupled.

1. **CAPTCHA First**: `contact.service.ts` first calls the `verify-captcha` Edge Function.
   - **Why?**: This prevents bots from writing to the database. The check is done on the server-side for security.
2. **File Upload**: If files are present, they are uploaded to Supabase Storage before database insertion.
   - **Filename Sanitization**: Files with non-ASCII characters (e.g., Hebrew filenames) are sanitized. The Storage path uses a safe ASCII-only format (`timestamp-randomstring.extension`), while the original filename is preserved in the database metadata for display in emails.
   - **Why?**: Supabase Storage requires ASCII-only filenames. The original name is stored separately so it can be displayed correctly in email notifications.
3. **Direct Database Insert**: If CAPTCHA is valid, the service performs a direct `supabase.from('contact_messages').insert(...)` with the attachment metadata.
   - **Why?**: This aligns with the project's existing pattern for simple data writes and completely avoids the CORS issues that arise from `invoke()` calls from the browser. It's a reliable and fast way to confirm to the user that their message has been saved.
4. **Webhook-Triggered Email**: An insert into the `contact_messages` table automatically triggers a **Database Webhook**.
   - **Why?**: This decouples the core action (saving the user's message) from a secondary action (sending an email). If the email service has a temporary issue, the user's message is still saved securely, and the email can be resent. It also provides a faster UI response to the user.
5. **Email Sending**: The webhook invokes the `send-contact-email` function, which:
   - Generates signed URLs (valid for 7 days) for all attachments
   - Formats a detailed HTML email with separate, localized templates for the Rabbi (Hebrew, RTL) and Devs (English, LTR)
   - Displays attachments prominently in a highlighted box immediately after the message body (before metadata)
   - Sends the email via AWS SES with proper Reply-To headers

### 2. Desktop Platform (Tauri)

The desktop flow is designed to work offline and integrate with the user's native environment without forcing the use of a specific email client.

#### User Flow:

1. User clicks the **Contact FAB** (only visible when authenticated).
2. A native-style **`Dialog`** opens.
3. The dialog displays the email addresses for the Rabbi and the Dev Team in separate, read-only input fields.
4. It also displays pre-formatted technical information (App Version, OS, Language) in a read-only text area.
5. The user can easily copy the email address or the technical info to their clipboard using dedicated "Copy" buttons.
6. The user then pastes this information into their own email client to send the message.

#### Technical Flow & Rationale:

This flow leverages Tauri's secure bridge between the frontend and the Rust backend.

1. **Detect Platform**: The `ContactFAB` uses `usePlatform()` to identify it's running in a desktop environment.
2. **Invoke Rust Commands**:
   - When the dialog opens, it calls `invoke('get_platform_info')` to fetch the app version and OS details from the Rust backend.
   - When a user clicks a copy button, it calls `invoke('copy_to_clipboard', { text: '...' })`.
   - **Why?**: This is the secure and correct way to access native OS features. The logic is written in Rust and only a minimal, secure API is exposed to the frontend. This prevents web-based code from trying to access desktop-only APIs.
3. **Why Not `mailto:`?**: The initial plan was to use a `mailto:` link. This was changed for several reasons:
   - **User Experience**: Many users may not have a default email client configured, leading to a broken experience.
   - **Reliability**: The copy-paste method ensures the user can always send the email, regardless of their setup.
   - **Data Integrity**: It guarantees that the crucial diagnostic information is provided to the user in a clear, copyable format, increasing the chances it will be included in the support request.

---

## File Upload Implementation

### Storage Configuration

- **Bucket Name**: `contact-attachments`
- **RLS Policy**: Only authenticated users can upload files (`INSERT` permission for `authenticated` role). No public read access - files are accessed via signed URLs generated by the Edge Function.
- **File Naming**: Files are stored with ASCII-safe names (`timestamp-randomstring.extension`) to avoid issues with non-ASCII characters. The original filename is preserved in the database metadata.

### File Upload Component

- **Location**: `src/components/ui/file-upload.tsx`
- **Library**: Uses `react-dropzone` for drag-and-drop functionality
- **Features**:
  - Drag-and-drop or click to select
  - File validation (max 3 files, 5MB each by default)
  - Visual feedback for selected files with size display
  - File removal before submission
  - Full i18n support (all text comes from translation files)

### File Upload Service Logic

- **Location**: `src/lib/data-layer/contact.service.ts` - `uploadFile` function
- **Process**:
  1. Extract original filename and extension
  2. Generate safe ASCII filename: `timestamp-randomstring.extension`
  3. Upload to Supabase Storage bucket `contact-attachments`
  4. Return both the Storage path (for retrieval) and original name (for display)

---

## Internationalization (i18n) & UI Polish

- **Dynamic Positioning (RTL/LTR)**: The `ContactFAB` is positioned on the `right` in LTR languages (like English) and on the `left` in RTL languages (like Hebrew) using `i18n.dir()` and Tailwind variants. This prevents it from overlapping with the sidebar.
- **Text Alignment**: All labels and text within the web forms use `className="text-start"` to automatically align left or right based on the current language, ensuring a native feel.
- **Email Templates**: The `send-contact-email` function contains two separate HTML templates:
  - **Rabbi Template**: Fully RTL, Hebrew, with attachments displayed prominently after the message body
  - **Dev Team Template**: LTR, English, with attachments displayed prominently after the message body
- **Translation Files**: All UI text is stored in:
  - `public/locales/he/contact.json` (Hebrew)
  - `public/locales/en/contact.json` (English)
- **Translation Keys**: The feature uses the following translation namespace structure:
  - `contact:fabTooltip` - FAB tooltip text
  - `contact:modal.*` - Modal titles and descriptions
  - `contact:forms.*` - Form field labels, placeholders, errors, and messages
  - `contact:forms.attachments.*` - File upload component text (dropActive, dropInactive, limits, removeFile)
  - `contact:desktop.*` - Desktop-specific dialog text

---

## Security Considerations

### Authentication

- **FAB Visibility**: The Contact FAB is only rendered when a user is authenticated (`user` exists in `AuthContext`). This prevents unauthenticated users from accessing the contact feature.
- **RLS on Storage**: The `contact-attachments` Storage bucket has RLS policies that only allow authenticated users to upload files. No public read access is granted.

### CAPTCHA

- **Cloudflare Turnstile**: All form submissions require CAPTCHA verification via the `verify-captcha` Edge Function before any database writes occur.
- **Test Keys**: For development, Cloudflare's official test keys are used (`1x00000000000000000000AA` for site key).

### Data Privacy

- **User Information**: The form automatically includes user metadata (name, email) from the authenticated session.
- **Reply-To Headers**: Email notifications use the user's email as the Reply-To address, enabling direct responses.
- **Signed URLs**: File attachments are accessed via signed URLs with 7-day expiration, ensuring secure, time-limited access.

---

## Database Schema

### `contact_messages` Table

```sql
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  channel TEXT NOT NULL CHECK (channel IN ('halacha', 'dev')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'med', 'high')),
  attachments JSONB, -- Array of { path: string, name: string }
  client_platform TEXT NOT NULL,
  app_version TEXT,
  locale TEXT,
  ip TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_email TEXT,
  user_agent TEXT,
  verified_captcha BOOLEAN DEFAULT false
);
```

### Storage Bucket

- **Name**: `contact-attachments`
- **Public**: `false` (private bucket)
- **RLS Policy**: `Allow authenticated uploads to contact-attachments` - allows `INSERT` for `authenticated` role only

---

## Edge Functions

### `verify-captcha`

- **Purpose**: Validates Cloudflare Turnstile CAPTCHA tokens
- **Input**: `{ captchaToken: string }`
- **Output**: `{ success: boolean, message?: string }`
- **CORS**: Configured with proper headers for browser requests

### `send-contact-email`

- **Purpose**: Sends email notifications when a new contact message is inserted
- **Trigger**: Database Webhook on `contact_messages` table `INSERT` events
- **Process**:
  1. Receives webhook payload with inserted record
  2. Generates signed URLs for attachments (7-day validity)
  3. Formats HTML email with localized template (Hebrew/RTL for Rabbi, English/LTR for Dev)
  4. Sends email via AWS SES using `SimpleEmailService` class
  5. Includes Reply-To header with user's email
  6. For Rabbi channel: sends to `torat.maaser@gmail.com` with CC to `halacha@ten10-app.com`
  7. For Dev channel: sends to `dev@ten10-app.com`
- **Email Sender**: `contact-form@ten10-app.com` (configured in AWS SES)

---

## Key Files

### Frontend

- `src/components/layout/ContactFAB.tsx` - Floating Action Button component
- `src/components/features/contact/ContactModal.tsx` - Modal wrapper with tabs
- `src/components/features/contact/ContactForm.tsx` - Unified form component
- `src/components/ui/file-upload.tsx` - File upload component
- `src/lib/data-layer/contact.service.ts` - Service layer for form submission and file uploads
- `src/lib/schemas.ts` - Zod validation schemas for contact forms
- `src/App.tsx` - Renders ContactFAB conditionally based on authentication

### Backend

- `supabase/functions/verify-captcha/index.ts` - CAPTCHA verification Edge Function
- `supabase/functions/send-contact-email/index.ts` - Email notification Edge Function
- `supabase/functions/_shared/simple-email-service.ts` - AWS SES email sending utility
- `supabase/functions/_shared/cors.ts` - CORS headers utility

### Translations

- `public/locales/he/contact.json` - Hebrew translations
- `public/locales/en/contact.json` - English translations

---

## Future Improvements

- [ ] Add file type restrictions (currently allows images and PDFs)
- [ ] Add file size validation feedback before upload
- [ ] Add progress indicators for file uploads
- [ ] Add ability to preview images before submission
- [ ] Consider adding file compression for large images
- [ ] Add email template customization options
- [ ] Consider adding admin dashboard for viewing contact messages
