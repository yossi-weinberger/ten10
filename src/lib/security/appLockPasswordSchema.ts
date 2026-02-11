import { z } from "zod";

export type PasswordValidationError = "too_short" | "mismatch";

export const MIN_PASSWORD_LENGTH = 1;

export const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH);

export const passwordPairSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "password_mismatch",
  });

export const changePasswordSchema = z
  .object({
    oldPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "password_mismatch",
  });

function hasTooShortIssue(error: z.ZodError): boolean {
  return error.issues.some(
    (issue) =>
      issue.code === "too_small" && issue.minimum === MIN_PASSWORD_LENGTH,
  );
}

export function validatePasswordPair(input: {
  password: string;
  confirmPassword: string;
}):
  | { success: true }
  | { success: false; error: PasswordValidationError } {
  const result = passwordPairSchema.safeParse(input);
  if (result.success) return { success: true };
  return {
    success: false,
    error: hasTooShortIssue(result.error) ? "too_short" : "mismatch",
  };
}

export function validateChangePassword(input: {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}):
  | { success: true }
  | { success: false; error: PasswordValidationError } {
  const result = changePasswordSchema.safeParse(input);
  if (result.success) return { success: true };
  return {
    success: false,
    error: hasTooShortIssue(result.error) ? "too_short" : "mismatch",
  };
}
