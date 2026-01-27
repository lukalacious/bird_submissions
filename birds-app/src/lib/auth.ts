import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";

// Validate required environment variables
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing AUTH_SECRET or NEXTAUTH_SECRET environment variable');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing Google OAuth credentials');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    // JWT: store id, role, and username in the token at sign-in
    async jwt({ token, user, trigger }) {
      if (user && "id" in user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "USER";
        token.username = (user as { username?: string | null }).username ?? null;
      }
      // Refresh role/username from DB when session is updated OR if role is missing
      if (typeof token.id === "string" && (trigger === "update" || !token.role)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { username: true, role: true },
        });
        if (dbUser) {
          token.username = dbUser.username;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    // Session: copy id, role, and username from token (no DB read on every request)
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        if (token.role === "USER" || token.role === "ADMIN") session.user.role = token.role;
        session.user.username = typeof token.username === "string" ? token.username : null;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
});
