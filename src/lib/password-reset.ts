export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function validatePasswordResetEmail(email: string) {
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}

export function safeResetToken(token: string | null | undefined, error: string | null | undefined) {
  if (error || !token || !RESET_TOKEN_PATTERN.test(token)) return null;
  return token;
}
