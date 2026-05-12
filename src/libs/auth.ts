// /Users/safeconnection/Downloads/drivecrm/src/libs/auth.ts
import type { Session } from "next-auth";
import { NextAuthOptions } from "next-auth";
import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_REMEMBER_MAX_AGE_SECONDS,
} from "@/lib/sessionMaxAge";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectMongoDB } from "./dbConfig";
import User from "@/models/User";
import { APP_DISPLAY_NAME } from "@/lib/emailAuthBranding";
import { hasActiveEmailVerificationInvite } from "@/lib/authEmailVerificationWindow";
import {
  CRED_EMAIL_VERIFY_EXPIRED_ADMIN,
  CRED_EMAIL_VERIFY_EXPIRED_AGENT,
  CRED_EMAIL_VERIFY_PENDING_ADMIN,
  CRED_EMAIL_VERIFY_PENDING_AGENT,
} from "@/lib/credentialsEmailVerifyErrors";
import { findUserForCredentialLoginByEmail } from "@/lib/authEmailUserLookup";
import { getPasswordChangedAtUnixCached } from "@/lib/authPasswordVersion";
import { tryConsumeCaptchaSignatureOnce } from "@/lib/captchaConsumeStore";
import {
  captchaConsumeTtlMs,
  captchaUserMessage,
  evaluateCaptchaCookie,
} from "@/lib/serverCaptcha";
import { getCookieHeaderFromNextAuthReq } from "@/lib/nextAuthCookieHeader";
import { getSuperAdminEmails } from "@/lib/notificationQuery";
import type { JWT } from "next-auth/jwt";

function applySuperAdminToToken(token: JWT): JWT {
  const id = typeof token.id === "string" ? token.id : "";
  const emails = getSuperAdminEmails();
  const email = typeof token.email === "string" ? token.email.trim() : "";
  if (!id || token.role !== "ADMIN" || !email || emails.length === 0) {
    return { ...token, isSuperAdmin: false };
  }
  return { ...token, isSuperAdmin: emails.includes(email) };
}

// Extend the built-in session types
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
    status: string;
    phoneNumber: string;
    country: string;
    adminId?: string;
    canViewPhoneNumbers?: boolean;
    /** Set by `authorize` from the "Remember me" checkbox; consumed once in the jwt callback. */
    rememberMe?: boolean;
  }

  interface Session {
    expires?: string; // ISO date string from token.exp; used by AuthGuard for expiry check
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      permissions: string[];
      status: string;
      phoneNumber: string;
      country: string;
      adminId?: string;
      canViewPhoneNumbers?: boolean;
      /** Platform super admin (SUPER_ADMIN_EMAILS); only meaningful when role is ADMIN. */
      isSuperAdmin?: boolean;
    };
  }
}

// Extend the built-in JWT types
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    permissions: string[];
    status: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    country: string;
    adminId?: string;
    canViewPhoneNumbers?: boolean;
    exp?: number; // Token expiration timestamp
    loginTimestamp?: number; // Absolute timestamp of initial login
    /** Effective session lifetime in seconds chosen at login (default vs "Remember me"). */
    maxAgeSec?: number;
    email?: string;
    isSuperAdmin?: boolean;
  }
}

/**
 * Agents under a verified tenant admin may sign in without their own
 * `emailVerified` flag (invited accounts often share the org’s trust).
 */
async function isTenantAdminEmailVerifiedForAgent(user: {
  role: string;
  adminId?: { toString: () => string } | null;
  createdBy?: { toString: () => string } | null;
}): Promise<boolean> {
  if (user.role !== "AGENT") return false;
  const raw = user.adminId ?? user.createdBy;
  if (!raw) return false;
  const adminUser = await User.findById(raw.toString())
    .select("role emailVerified")
    .lean<{ role?: string; emailVerified?: boolean } | null>();
  if (!adminUser || adminUser.role !== "ADMIN") return false;
  return adminUser.emailVerified === true;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captcha: { label: "Captcha", type: "text" },
        // "true"/"false" string from the SignInForm checkbox. Used in the jwt
        // callback to extend session lifetime when the user opts in.
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password");
        }

        const captcha =
          typeof credentials.captcha === "string"
            ? credentials.captcha.trim()
            : "";
        const cookieHeader = getCookieHeaderFromNextAuthReq(
          req as { headers?: unknown; cookies?: unknown } | null | undefined,
        );
        const captchaEval = evaluateCaptchaCookie(cookieHeader, captcha, "login");
        if (!captchaEval.ok) {
          throw new Error(captchaUserMessage(captchaEval.reason));
        }
        const captchaSig = captchaEval.sig;

        try {
          await connectMongoDB();
          const normalizedEmail = credentials.email.trim().toLowerCase();

          // ADMIN-first explicit lookup; falls back to any matching row.
          const user = await findUserForCredentialLoginByEmail(normalizedEmail);

          // --- DEBUG: remove after investigation ---
          if (!user) {
            const User = (await import("@/models/User")).default;
            const allMatches = await User.find({ email: normalizedEmail })
              .select("_id email role status adminId createdBy")
              .lean();
            console.error(
              "[AUTH DEBUG] No user found for login.",
              JSON.stringify({
                inputEmail: normalizedEmail,
                rawInput: credentials.email,
                matchesInDb: allMatches,
              }, null, 2),
            );
            throw new Error("Invalid email or password");
          }

          // Check if user is active
          if (user.status === "INACTIVE") {
            throw new Error(
              "Account is inactive. Please contact administrator."
            );
          }

          // Check if user has password
          if (!user.password) {
            throw new Error("Invalid email or password");
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) {
            throw new Error("Invalid email or password");
          }

          // Tenant admins (self-service signups): must have verified email when
          // using password login. AGENT accounts keep legacy behavior below.
          if (user.role === "ADMIN" && user.emailVerified !== true) {
            throw new Error(
              hasActiveEmailVerificationInvite(user)
                ? CRED_EMAIL_VERIFY_PENDING_ADMIN
                : CRED_EMAIL_VERIFY_EXPIRED_ADMIN,
            );
          }
          if (user.role === "AGENT" && user.emailVerified === false) {
            const waivedByVerifiedAdmin =
              await isTenantAdminEmailVerifiedForAgent(user);
            if (!waivedByVerifiedAdmin) {
              throw new Error(
                hasActiveEmailVerificationInvite(user)
                  ? CRED_EMAIL_VERIFY_PENDING_AGENT
                  : CRED_EMAIL_VERIFY_EXPIRED_AGENT,
              );
            }
          }

          // Consume captcha only after credentials succeed (wrong password does
          // not burn the code). Distributed via Mongo / optional Upstash.
          if (
            !(await tryConsumeCaptchaSignatureOnce(
              captchaSig,
              captchaConsumeTtlMs(),
            ))
          ) {
            throw new Error(captchaUserMessage("replay"));
          }

          // Update last login time
          await User.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } },
          );

          const rememberMe =
            typeof credentials.remember === "string" &&
            credentials.remember.toLowerCase() === "true";

          return {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            permissions: user.permissions || [],
            status: user.status,
            phoneNumber: user.phoneNumber || "",
            country: user.country || "",
            adminId: user.adminId?.toString(),
            canViewPhoneNumbers: user.canViewPhoneNumbers ?? false,
            rememberMe,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Cookie/JWT must live up to the LONGEST possible lifetime (Remember me).
    // The jwt() callback enforces the actual per-token lifetime using
    // `token.maxAgeSec`, so non-remembered sessions still expire at 12h.
    maxAge: SESSION_REMEMBER_MAX_AGE_SECONDS,
    updateAge: 60 * 60, // Ignored for JWT
  },
  jwt: {
    maxAge: SESSION_REMEMBER_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
    error: "/login?error=true",
    newUser: "/signup",
  },
  // Cookie configuration for Vercel/production.
  // Use `||` (not `??`): when NEXTAUTH_URL is `http://...` the left side is
  // `false` (defined) and `??` would skip the production fallback entirely.
  useSecureCookies:
    process.env.NEXTAUTH_URL?.startsWith("https://") ||
    process.env.NODE_ENV === "production",
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Ensure we only allow redirects to the same domain
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
    async jwt({ token, user, trigger, session }) {
      const nowTimestamp = Math.floor(Date.now() / 1000);

      if (user) {
        // New token - set user data (user just logged in)
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.permissions = user.permissions;
        token.status = user.status;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.phoneNumber = user.phoneNumber;
        token.country = user.country;
        token.adminId = user.adminId;
        token.canViewPhoneNumbers = user.canViewPhoneNumbers;

        // "Remember me" picks the longer lifetime; the chosen value is
        // pinned on the JWT so middleware/session checks honor it.
        const effectiveMaxAge = user.rememberMe
          ? SESSION_REMEMBER_MAX_AGE_SECONDS
          : SESSION_MAX_AGE_SECONDS;
        token.maxAgeSec = effectiveMaxAge;

        // Set expiration time ONLY on initial login
        token.exp = nowTimestamp + effectiveMaxAge;

        // Store the original expiration time in loginTimestamp to prevent sliding sessions extending it
        token.loginTimestamp = nowTimestamp;

        // Always reset iat on fresh login.
        // If we keep an old iat from a previous expired token, the next jwt() pass
        // can immediately mark this brand-new login as expired.
        token.iat = nowTimestamp;
      } else if (token) {
        // Existing token - check if it's expired. Don't throw (causes 500 on Netlify/serverless);
        // strip id so session callback can return null (empty id still counts as "authenticated" on the client).
        const currentTime = Math.floor(Date.now() / 1000);
        const effectiveMaxAge =
          typeof token.maxAgeSec === "number" && token.maxAgeSec > 0
            ? token.maxAgeSec
            : SESSION_MAX_AGE_SECONDS;
        const expiredByExp =
          typeof token.exp === "number" &&
          token.exp > 0 &&
          token.exp < currentTime;

        // Check our absolute loginTimestamp to prevent infinite sliding sessions
        const expiredByLogin =
          typeof token.loginTimestamp === "number" &&
          currentTime - token.loginTimestamp > effectiveMaxAge;

        const expiredByIat =
          typeof token.iat === "number" &&
          currentTime - token.iat > effectiveMaxAge;

        if (expiredByExp || expiredByIat || expiredByLogin) {
          return { ...token, id: "", exp: 0 };
        }

        // Password reset after this JWT was issued — invalidate session (JWT has no server store).
        if (typeof token.id === "string" && token.id.length > 0) {
          try {
            const changedAt = await getPasswordChangedAtUnixCached(token.id);
            const iat =
              typeof token.iat === "number" && token.iat > 0
                ? token.iat
                : typeof token.loginTimestamp === "number"
                  ? token.loginTimestamp
                  : 0;
            if (changedAt > iat) {
              return { ...token, id: "", exp: 0 };
            }
          } catch (e) {
            // Soft-fail: a transient Mongo error must not invalidate every
            // active session. The downside (stolen JWT surviving a password
            // rotation while the DB is unreachable) is bounded by how long
            // the DB is down — and during that window the rest of the app
            // is unusable anyway. Crucially, fail-closing here would also
            // turn the post-signin /api/auth/session call into an instant
            // "Session Expired" bounce on any DB blip, which is worse UX
            // than the security gain.
            console.error("jwt passwordChangedAt check:", e);
          }
        }
      }

      // Handle session updates (but don't change expiration).
      // Only apply defined user fields so we never clobber required token values
      // (e.g. token.id) with undefined during client update() calls.
      if (trigger === "update" && session?.user) {
        const nextToken = { ...token };
        const userPatch = session.user as Partial<{
          id: string;
          email: string;
          role: string;
          permissions: string[];
          status: string;
          firstName: string;
          lastName: string;
          phoneNumber: string;
          country: string;
          adminId: string;
          canViewPhoneNumbers: boolean;
        }>;

        if (typeof userPatch.id === "string" && userPatch.id.length > 0) {
          nextToken.id = userPatch.id;
        }
        if (typeof userPatch.email === "string") {
          nextToken.email = userPatch.email;
        }
        if (typeof userPatch.role === "string") {
          nextToken.role = userPatch.role;
        }
        if (Array.isArray(userPatch.permissions)) {
          nextToken.permissions = userPatch.permissions;
        }
        if (typeof userPatch.status === "string") {
          nextToken.status = userPatch.status;
        }
        if (typeof userPatch.firstName === "string") {
          nextToken.firstName = userPatch.firstName;
        }
        if (typeof userPatch.lastName === "string") {
          nextToken.lastName = userPatch.lastName;
        }
        if (typeof userPatch.phoneNumber === "string") {
          nextToken.phoneNumber = userPatch.phoneNumber;
        }
        if (typeof userPatch.country === "string") {
          nextToken.country = userPatch.country;
        }
        if (typeof userPatch.adminId === "string") {
          nextToken.adminId = userPatch.adminId;
        }
        if (typeof userPatch.canViewPhoneNumbers === "boolean") {
          nextToken.canViewPhoneNumbers = userPatch.canViewPhoneNumbers;
        }

        return applySuperAdminToToken(nextToken);
      }

      return applySuperAdminToToken(token);
    },
    async session({ session, token }) {
      const nowSec = Math.floor(Date.now() / 1000);
      const effectiveMaxAge =
        typeof token.maxAgeSec === "number" && token.maxAgeSec > 0
          ? token.maxAgeSec
          : SESSION_MAX_AGE_SECONDS;
      const expiredByExp =
        typeof token.exp === "number" &&
        token.exp > 0 &&
        token.exp < nowSec;
      const expiredByIat =
        typeof token.iat === "number" &&
        nowSec - token.iat > effectiveMaxAge;
      const expiredByLogin =
        typeof token.loginTimestamp === "number" &&
        nowSec - token.loginTimestamp > effectiveMaxAge;
      const invalid =
        !token?.id ||
        token.exp === 0 ||
        expiredByExp ||
        expiredByIat ||
        expiredByLogin;

      // Invalid JWT: must not return null — the client runs Object.keys(data) on the JSON body and
      // throws "Cannot convert undefined or null to object" when data is null. Empty {} is treated as no session.
      if (invalid) {
        return {} as typeof session;
      }

      // Credentials/JWT: ensure user exists (NextAuth can omit session.user for some strategies).
      if (!session.user) {
        session.user = {} as Session["user"];
      }
      session.user.id = token.id;
      session.user.role = token.role ?? "";
      session.user.permissions = token.permissions ?? [];
      session.user.status = token.status ?? "";
      session.user.firstName = token.firstName ?? "";
      session.user.lastName = token.lastName ?? "";
      session.user.phoneNumber = token.phoneNumber ?? "";
      session.user.country = token.country ?? "";
      session.user.adminId = token.adminId ?? undefined;
      session.user.canViewPhoneNumbers = token.canViewPhoneNumbers ?? false;
      session.user.email =
        typeof token.email === "string"
          ? token.email
          : (session.user.email ?? "");
      session.user.isSuperAdmin = Boolean(token.isSuperAdmin);

      if (token.loginTimestamp) {
        session.expires = new Date(
          ((token.loginTimestamp as number) + effectiveMaxAge) * 1000,
        ).toISOString();
      } else if (token.exp) {
        session.expires = new Date(token.exp * 1000).toISOString();
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
