// auth.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/utils/server/db";
import { compareSync } from "bcrypt";
import { authenticator } from "otplib";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const { email, password, totpCode } = credentials;

          if (!email || !password) {
            return null;
          }

          // Fetch user with permissions
          const user = await prisma.adminUser.findUnique({
            where: { email },
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          });

          if (!user) {
            return null;
          }

          // Check if user is deleted
          if (user.deleted_at) {
            return null;
          }

          // Check if user is suspended
          if (user.status === "SUSPENDED") {
            return null;
          }

          // For inactive users, reject login
          if (user.status === "INACTIVE" && !user.onboarding_completed) {
            return null;
          }

          // Verify password exists
          if (!user.password) {
            return null;
          }

          // Verify password
          const isPasswordValid = compareSync(password, user.password);

          if (!isPasswordValid) {
            return null;
          }

        
          // If 2FA is enabled, verify TOTP code
          // if (user.is_2fa_enabled) {
          //   // TOTP code must be provided
          //   if (!totpCode) {
          //     return null;
          //   }

          //   if (!user.totp_secret) {
          //     return null;
          //   }

          //   // Verify TOTP code
          //   const isValidTotp = authenticator.verify({
          //     token: totpCode,
          //     secret: user.totp_secret,
          //   });

          //   if (!isValidTotp) {
          //     return null;
          //   }

          //   // Update 2FA verification timestamp
          //   await prisma.adminUser.update({
          //     where: { id: user.id },
          //     data: {
          //       two_fa_verified_at: new Date(),
          //       last_login_at: new Date(),
          //     },
          //   });
          // } else {
          //   // Update last login for non-2FA users
          //   await prisma.adminUser.update({
          //     where: { id: user.id },
          //     data: { last_login_at: new Date() },
          //   });
          // }

          // Extract permission codes
          const permissionCodes = user.permissions.map(
            (up) => up.permission.code,
          );

          // Return user object for JWT/session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.admin_role,
            admin_role: user.admin_role,
            userCode: user.user_code,
            phone: user.phone,
            alternatePhone: user.alternate_phone,
            status: user.status,
            permissions: permissionCodes,
            onboardingCompleted: user.onboarding_completed,
            is2faEnabled: user.is_2fa_enabled,
            dateOfJoining: user.date_of_joining,
            addressLine1: user.address_line1,
            addressLine2: user.address_line2,
            city: user.city,
            state: user.state,
            pincode: user.pincode,
            isDashboardLocked: false,
          };
        } catch (error) {
          console.error("Authorization error:");
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.admin_role = user.role;
        token.userCode = user.userCode;
        token.phone = user.phone;
        token.alternatePhone = user.alternatePhone;
        token.status = user.status;
        token.permissions = user.permissions;
        token.onboardingCompleted = user.onboardingCompleted;
        token.is2faEnabled = user.is2faEnabled;
        token.dateOfJoining = user.dateOfJoining;
        token.addressLine1 = user.addressLine1;
        token.addressLine2 = user.addressLine2;
        token.city = user.city;
        token.state = user.state;
        token.pincode = user.pincode;
      }

      if (trigger === "update" && session?.isDashboardLocked !== undefined) {
        token.isDashboardLocked = session.isDashboardLocked;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.admin_role = token.admin_role;
        session.user.userCode = token.userCode;
        session.user.phone = token.phone;
        session.user.alternatePhone = token.alternatePhone;
        session.user.status = token.status;
        session.user.permissions = token.permissions || [];
        session.user.onboardingCompleted = token.onboardingCompleted;
        session.user.is2faEnabled = token.is2faEnabled;
        session.user.dateOfJoining = token.dateOfJoining;
        session.user.addressLine1 = token.addressLine1;
        session.user.addressLine2 = token.addressLine2;
        session.user.city = token.city;
        session.user.state = token.state;
        session.user.pincode = token.pincode;
      }
      session.isDashboardLocked = token.isDashboardLocked || false;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});

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
