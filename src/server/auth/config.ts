import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { getPrisma } from "@/server/db/client";
import { getAuthEnvironment } from "@/server/auth/env";
import { claimAnonymousAttemptsForUser } from "@/server/attempts/claim";
import { sendPasswordResetEmail } from "@/server/email/transactional";

const environment = getAuthEnvironment();

export const auth = betterAuth({
  appName: "NEET Prep",
  baseURL: environment.baseURL,
  trustedOrigins: [environment.baseURL],
  secret: environment.secret,
  database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, resetUrl: url });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      role: {
        type: ["STUDENT", "ADMIN"],
        required: true,
        defaultValue: "STUDENT",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: "neet-prep",
    useSecureCookies: environment.useSecureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: environment.useSecureCookies,
      path: "/",
    },
    backgroundTasks: {
      handler: (promise) => {
        try {
          after(promise);
        } catch {
          // Standalone integration tests do not have a Next.js request scope.
          void promise.catch(() => undefined);
        }
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session, context) => {
          if (!context?.request?.headers) return;
          try {
            await claimAnonymousAttemptsForUser({
              userId: session.userId,
              requestHeaders: context.request.headers,
            });
          } catch {
            // Authentication must still succeed if an optional attempt claim fails.
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
