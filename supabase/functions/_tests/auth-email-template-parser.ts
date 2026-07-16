import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface AuthTemplate {
  name: "confirm-signup" | "reset-password" | "magic-link" | "invite";
  subject: string;
  html: string;
}

export const CONFIRMATION_URL_TEMPLATE_VARIABLE = "{{ .ConfirmationURL }}";
export const SYNTHETIC_CONFIRMATION_URL_BASE =
  "http://localhost:54321/auth/synthetic-confirmation";

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(CURRENT_DIRECTORY, "../../..");
const AUTH_TEMPLATES_PATH = resolve(
  REPOSITORY_ROOT,
  "supabase/auth-email-templates.md",
);

function templateNameFromHeading(heading: string): AuthTemplate["name"] {
  if (heading.startsWith("Confirm Your Signup")) return "confirm-signup";
  if (heading.startsWith("Reset Password")) return "reset-password";
  if (heading.startsWith("Magic Link")) return "magic-link";
  if (heading.startsWith("Invite User")) return "invite";

  throw new Error(`Unknown Auth template heading: ${heading}`);
}

export function parseAuthTemplates(markdown: string): AuthTemplate[] {
  return Array.from(
    markdown.matchAll(/### \d+\. ([^\n]+)\n([\s\S]*?)(?=\n---\n\n### |\s*$)/g),
    (match) => {
      const heading = match[1];
      const section = match[2];
      const subjectMatch = section.match(/\*\*נושא \(Subject\):\*\* (.+)/);
      const htmlMatch = section.match(/```html\n([\s\S]*?)\n```/);

      if (!subjectMatch || !htmlMatch) {
        throw new Error(`Could not parse Auth template section: ${heading}`);
      }

      return {
        name: templateNameFromHeading(heading),
        subject: subjectMatch[1].trim(),
        html: htmlMatch[1],
      };
    },
  );
}

export function readRepositoryAuthTemplates(): AuthTemplate[] {
  return parseAuthTemplates(readFileSync(AUTH_TEMPLATES_PATH, "utf8"));
}

export function renderAuthTemplatePreview(template: AuthTemplate): string {
  return template.html.replace(
    CONFIRMATION_URL_TEMPLATE_VARIABLE,
    `${SYNTHETIC_CONFIRMATION_URL_BASE}/${template.name}`,
  );
}
