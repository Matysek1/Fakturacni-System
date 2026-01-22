import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import EmailProvider from "next-auth/providers/email";

import { db } from "~/server/db";

/**
 * 🔹 Module augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: number;
    } & DefaultSession["user"];
  }
}

/**
 * 🔹 NextAuth config
 */
export const authConfig = {
  adapter: PrismaAdapter(db),

  session: {
    strategy: "database",
  },

  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      const existingUser = await db.user.findUnique({
        where: { email: user.email ?? "" },
        select: { id: true },
      });

      return !!existingUser;
    },

    async session({ session, user }) {
      if (!session.user) return session;

      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { roleId: true },
      });

      session.user.id = user.id;
      session.user.role = dbUser?.roleId ?? 1;

      return session;
    },
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
} satisfies NextAuthConfig;
