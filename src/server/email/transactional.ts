import { getAuthEnvironment } from "@/server/auth/env";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailTransport = {
  send(message: TransactionalEmail): Promise<void>;
};

type ResendEmailEnvironment = {
  from: string;
  apiKey: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_EMAIL_API_URL = "https://api.resend.com/emails";
let testingTransport: EmailTransport | null = null;

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

function requiredEmailEnvironment(name: "EMAIL_FROM" | "RESEND_API_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new EmailDeliveryError(`Transactional email is not configured: ${name} is required.`);
  return value;
}

function validSender(value: string) {
  if (value.length > 320 || /[\r\n]/.test(value)) return false;
  const namedSender = value.match(/^[^<>]{1,128}\s<([^<>]+)>$/);
  return EMAIL_PATTERN.test(namedSender?.[1] ?? value);
}

export function getResendEmailEnvironment(): ResendEmailEnvironment {
  const from = requiredEmailEnvironment("EMAIL_FROM");
  const apiKey = requiredEmailEnvironment("RESEND_API_KEY");
  if (!validSender(from)) {
    throw new EmailDeliveryError("Transactional email is not configured: EMAIL_FROM is invalid.");
  }
  if (!apiKey.startsWith("re_") || apiKey.length < 16) {
    throw new EmailDeliveryError("Transactional email is not configured: RESEND_API_KEY is invalid.");
  }

  return { from, apiKey };
}

function resendTransport(): EmailTransport {
  return {
    async send(message) {
      const environment = getResendEmailEnvironment();
      let response: Response;
      try {
        response = await fetch(RESEND_EMAIL_API_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${environment.apiKey}`,
          },
          body: JSON.stringify({ from: environment.from, ...message }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new EmailDeliveryError("Transactional email delivery failed.");
      }
      if (!response.ok) throw new EmailDeliveryError("Transactional email delivery failed.");
    },
  };
}

export function setEmailTransportForTesting(transport: EmailTransport | null) {
  if (process.env.NODE_ENV === "production") {
    throw new EmailDeliveryError("A test email transport cannot be installed in production.");
  }
  testingTransport = transport;
}

export function sendTransactionalEmail(message: TransactionalEmail) {
  return (testingTransport ?? resendTransport()).send(message);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createPasswordResetEmail(resetUrl: string): TransactionalEmail {
  const url = new URL(resetUrl);
  const authEnvironment = getAuthEnvironment();
  if (
    url.origin !== authEnvironment.baseURL
    || !url.pathname.startsWith("/api/auth/reset-password/")
  ) {
    throw new EmailDeliveryError("The generated password-reset URL is invalid.");
  }
  const safeUrl = escapeHtml(url.toString());
  return {
    to: "",
    subject: "Reset your NEET Prep password",
    text: [
      "A password reset was requested for your NEET Prep account.",
      "",
      `Reset your password: ${url.toString()}`,
      "",
      "This link expires in 1 hour and can be used only once.",
      "If you did not request this reset, you can safely ignore this email.",
    ].join("\n"),
    html: [
      "<p>A password reset was requested for your <strong>NEET Prep</strong> account.</p>",
      `<p><a href="${safeUrl}">Reset your password</a></p>`,
      "<p>This link expires in 1 hour and can be used only once.</p>",
      "<p>If you did not request this reset, you can safely ignore this email.</p>",
    ].join(""),
  };
}

export async function sendPasswordResetEmail(input: { to: string; resetUrl: string }) {
  const message = createPasswordResetEmail(input.resetUrl);
  await sendTransactionalEmail({ ...message, to: input.to });
}
