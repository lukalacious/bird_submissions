import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/identity";
import type { Role } from "@/generated/prisma/enums";

// Role/username are re-read from the DB at most this often per session
// (v1 re-read on every auth() call)
const ROLE_REFRESH_MS = 10 * 60 * 1000;

const baseAdapter = PrismaAdapter(db as never) as Adapter;

const adapter: Adapter = {
  ...baseAdapter,
  // Every user gets emailNormalized at creation — duplicate detection keys on it
  async createUser(user) {
    const created = await db.user.create({
      data: {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        emailNormalized: normalizeEmail(user.email),
      },
    });
    return created as AdapterUser;
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  providers: [Google],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.id = user.id;

      const stale = !token.refreshedAt || Date.now() - token.refreshedAt > ROLE_REFRESH_MS;
      if (token.id && (user || trigger === "update" || stale)) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, username: true },
        });
        // User deleted (e.g. merged into another player) — end the session
        if (!dbUser) return null;
        token.role = dbUser.role;
        token.username = dbUser.username;
        token.refreshedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.role = token.role ?? "USER";
      session.user.username = token.username ?? null;
      return session;
    },
  },
  trustHost: true,
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      username: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    username?: string | null;
    refreshedAt?: number;
  }
}
