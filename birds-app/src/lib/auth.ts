import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Required for invite-only: we pre-create Users; link the new OAuth Account to that User
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    // Invite-only: only allow sign in if user exists in database
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (!existingUser) {
            return "/auth/error?error=AccessDenied";
          }
        } catch {
          return "/auth/error?error=Configuration";
        }
        return true;
      }
      return true;
    },

    // JWT: store id and role in the token at sign-in
    async jwt({ token, user }) {
      if (user && "id" in user && "role" in user) {
        token.id = user.id as string;
        token.role = user.role as string;
      }
      return token;
    },

    // Session: copy id and role from token (no DB read on every request)
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        if (token.role === "USER" || token.role === "ADMIN") session.user.role = token.role;
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
