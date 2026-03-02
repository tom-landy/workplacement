import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { assertNotCoolingDown, checkAndRecordFailure, clearFailures } from "@/lib/rate-limit";
import { writeAuditEvent } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const rateKey = `login:${email}`;
        await assertNotCoolingDown(rateKey);

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.isActive) {
          await checkAndRecordFailure(rateKey);
          await writeAuditEvent({
            action: "auth.login.failure",
            entityType: "User",
            entityId: user?.id ?? "unknown",
            summary: `Login failed for ${email}`,
            actorUserId: user?.id ?? null
          });
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!valid) {
          await checkAndRecordFailure(rateKey);
          await prisma.authEvent.create({
            data: { userId: user.id, type: "LOGIN_FAILURE", metadataJson: { reason: "bad_password" } }
          });
          await writeAuditEvent({
            action: "auth.login.failure",
            entityType: "User",
            entityId: user.id,
            summary: `Login failure for ${email}`,
            actorUserId: user.id
          });
          return null;
        }

        await clearFailures(rateKey);
        await prisma.authEvent.create({ data: { userId: user.id, type: "LOGIN_SUCCESS" } });
        await writeAuditEvent({
          action: "auth.login.success",
          entityType: "User",
          entityId: user.id,
          summary: `Login success for ${email}`,
          actorUserId: user.id
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};

export const handler = NextAuth(authOptions);
