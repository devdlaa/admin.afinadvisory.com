import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { authenticator } from "otplib";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP Code", type: "text" },
      },

      async authorize(credentials) {
        const { email, password, totpCode } = credentials;

        if (!email || !password || !totpCode) {
          throw new Error("Invalid login details");
        }

        try {
          // ✅ Fetch user with direct permissions (NOT via roles anymore)
          const user = await prisma.adminUser.findUnique({
            where: { email },
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
              departments: {
                include: {
                  department: true,
                },
              },
            },
          });

          // existence validation
          if (!user) throw new Error("Invalid login details");

          // soft delete block
          if (user.deleted_at) throw new Error("Invalid login details");

          // must be active
          if (user.status !== "ACTIVE") {
            throw new Error(
              "Account is not active. Please contact administrator."
            );
          }

          // must have set password (completed onboarding)
          if (!user.password) {
            throw new Error("Please complete your onboarding first.");
          }

          if (!user.onboarding_completed) {
            throw new Error("Please complete your onboarding first.");
          }

          // password check
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) throw new Error("Invalid login details");

          // require configured 2FA
          if (!user.is_2fa_enabled || !user.totp_secret) {
            throw new Error(
              "Two-factor authentication not set up. Please contact administrator."
            );
          }

          // validate submitted TOTP
          const isValidTotp = authenticator.check(totpCode, user.totp_secret);
          if (!isValidTotp) {
            throw new Error("Invalid two-factor authentication code");
          }

          // ✅ Extract direct permissions (user → permission)
          const permissions = user.permissions.map(({ permission }) => ({
            id: permission.id,
            code: permission.code,
          }));

          // ✅ Extract departments
          const departments = user.departments.map(({ department }) => ({
            id: department.id,
            name: department.name,
          }));

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            user_code: user.user_code,

            phone: user.phone,
            alternate_phone: user.alternate_phone,

            address_line1: user.address_line1,
            address_line2: user.address_line2,
            city: user.city,
            state: user.state,
            pincode: user.pincode,

            status: user.status,
            date_of_joining: user.date_of_joining?.toISOString(),

            is_2fa_enabled: user.is_2fa_enabled,
            two_fa_verified_at: user.two_fa_verified_at?.toISOString(),

            
            admin_role: user.admin_role,

            // collections
            departments,
            permissions,

            auth_provider: user.auth_provider,

            created_by: user.created_by,
            updated_at: new Date().toISOString(),

            // UI lock flag
            isDashboardLocked: false,
          };
        } catch (err) {
          console.error("Authorize error:", err);
          throw new Error(err.message || "Invalid login details");
        }
      },
    }),
  ],

  trustedHosts: ["admin.afinadvisory.com"],

  session: {
    strategy: "jwt",
    maxAge: 2 * 24 * 60 * 60,
  },

  jwt: {
    maxAge: 2 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) Object.assign(token, user);

      if (trigger === "update" && session?.isDashboardLocked !== undefined) {
        token.isDashboardLocked = session.isDashboardLocked;
      }

      return token;
    },

    async session({ session, token }) {
      session.user = { ...token };
      session.isDashboardLocked = token.isDashboardLocked || false;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// unchanged: unlock dashboard TOTP verifier
export async function verifyTotpForUnlock(userId, code) {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        totp_secret: true,
        is_2fa_enabled: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      return false;
    }

    if (!user.is_2fa_enabled || !user.totp_secret) {
      return false;
    }

    return authenticator.check(code, user.totp_secret);
  } catch (err) {
    console.error("Verify TOTP for unlock error:", err);
    return false;
  }
}
