// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      firstName: string;
      lastName: string;
      email: string;
      permissions: string[];
      status: string;
      /** True when ADMIN email is listed in SUPER_ADMIN_EMAILS. */
      isSuperAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    permissions: string[];
    firstName: string;
    lastName: string;
    status: string;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    permissions: string[];
    firstName: string;
    lastName: string;
    status: string;
    isSuperAdmin?: boolean;
  }
}

export interface CustomSession {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
    status: string;
    isSuperAdmin?: boolean;
  };
}
