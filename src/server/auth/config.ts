import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { getPrisma } from "@/server/db/client";
import { getAuthEnvironment } from "@/server/auth/env";
import { claimAnonymousAttemptsForUser } from "@/server/attempts/claim";

const environment = getAuthEnvironment();

export const auth = betterAuth({
  appName: "NEET Prep",
  baseURL: environment.baseURL,
  secret: environment.secret,
  database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
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
