// /Users/safeconnection/Downloads/drivecrm/src/libs/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectMongoDB } from "./dbConfig";
import mongoose from "mongoose";

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
  }

  interface Session {
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
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password");
        }

        try {
          await connectMongoDB();

          // Use direct MongoDB collection access like the debug endpoints
          const db = mongoose.connection.db;
          if (!db) {
            throw new Error("Database connection not available");
          }

          // Try to find user with exact email first
          let user = await db.collection("users").findOne({
            email: credentials.email,
          });

          // If not found, try with lowercase
          if (!user) {
            user = await db.collection("users").findOne({
              email: credentials.email.toLowerCase(),
            });
          }

          // If still not found, try with uppercase
          if (!user) {
            user = await db.collection("users").findOne({
              email: credentials.email.toUpperCase(),
            });
          }

          if (!user) {
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

          // Update last login time
          await db
            .collection("users")
            .updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

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
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour - refresh session every hour if user is active
  },
  pages: {
    signIn: "/login",
    error: "/login?error=true",
    // Don't protect these pages
    newUser: "/signup",
    verifyRequest: "/forgot-password",
  },
  // Cookie configuration for Vercel/production
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production",
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
      const maxAge = 24 * 60 * 60; // 24 hours
      
      if (user) {
        // New token - set user data (user just logged in)
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.status = user.status;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.phoneNumber = user.phoneNumber;
        token.country = user.country;
        token.adminId = user.adminId;
        token.canViewPhoneNumbers = user.canViewPhoneNumbers;
        
        // Set expiration time ONLY on initial login
        token.exp = nowTimestamp + maxAge;
        
        // Store the original expiration time in iat (issued at) if not already set
        if (!token.iat) {
          token.iat = nowTimestamp;
        }
      } else if (token) {
        // Existing token - check if it's expired. Don't throw (causes 500 on Netlify/serverless); invalidate by returning token without user id so session is null.
        const currentTime = Math.floor(Date.now() / 1000);
        if (token.exp && token.exp < currentTime) {
          return { ...token, id: undefined, exp: 0 };
        }
      }

      // Handle session updates (but don't change expiration)
      if (trigger === "update" && session) {
        // Preserve the original expiration time when updating
        const originalExp = token.exp;
        const updatedToken = { ...token, ...session.user };
        updatedToken.exp = originalExp; // Restore original expiration
        return updatedToken;
      }

      return token;
    },
    async session({ session, token }) {
      // If token was invalidated (e.g. expired - we set id to undefined in jwt callback), return no session
      if (!token?.id) {
        return { ...session, user: null as unknown as typeof session.user };
      }
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
        session.user.status = token.status;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.phoneNumber = token.phoneNumber;
        session.user.country = token.country;
        session.user.adminId = token.adminId;
        session.user.canViewPhoneNumbers = token.canViewPhoneNumbers;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
