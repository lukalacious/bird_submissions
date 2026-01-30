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
    // JWT: store id in the token at sign-in
    async jwt({ token, user }) {
      if (user && "id" in user) {
        token.id = user.id as string;
      }
      // Always refresh role/username from DB to ensure role changes take effect immediately
      if (typeof token.id === "string") {
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
