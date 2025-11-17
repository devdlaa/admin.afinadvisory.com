import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import admin from "@/lib/firebase-admin";
import { authenticator } from "otplib";

const db = admin.firestore();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
        totpCode: { label: "TOTP Code", type: "text" },
      },
      async authorize(credentials) {
        const { idToken, totpCode } = credentials;
        if (!idToken || !totpCode) throw new Error("Invalid login details");

        try {
          // ✅ Verify Firebase ID token
          const decoded = await admin.auth().verifyIdToken(idToken);
          const firebaseUser = await admin.auth().getUser(decoded.uid);

          const userQuery = await db
            .collection("admin_users")
            .where("firebaseAuthUid", "==", firebaseUser.uid)
            .limit(1)
            .get();

            console.log("userQuery",userQuery);
          if (userQuery.empty) throw new Error("Invalid login details");

          const doc = userQuery.docs[0];
          const data = doc.data();

          if (!data || data.status !== "active")
            throw new Error("Invalid login details");

          // ✅ Verify TOTP during login
          const isValid = authenticator.check(totpCode, data.totpSecret);
          if (!isValid) throw new Error("Invalid login details");

          // ✅ Build user object + default lock flag
          return {
            id: doc.id,
            uid: firebaseUser.uid,
            firebaseAuthUid: data.firebaseAuthUid,
            email: data.email || firebaseUser.email,
            name: data.name,
            role: data.role,
            status: data.status,
            department: data.department,
            phone: data.phone,
            alternatePhone: data.alternatePhone,
            address: data.address,
            permissions: data.permissions || [],
            userCode: data.userCode,
            twoFactorEnabled: data.twoFactorEnabled,
            totpVerifiedAt:
              data?.totpVerifiedAt?.toDate?.()?.toISOString() ||
              data?.totpVerifiedAt,
            updatedAt:
              data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
            createdAt:
              data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
            dateOfJoining:
              data?.dateOfJoining?.toDate?.()?.toISOString() ||
              data?.dateOfJoining,
            lastInvitationSentAt:
              data?.lastInvitationSentAt?.toDate?.()?.toISOString() ||
              data?.lastInvitationSentAt,
            isInvitationLinkResent: data?.isInvitationLinkResent,
            invitedBy: data?.invitedBy,
            inviteExpiresAt:
              data?.inviteExpiresAt?.toDate?.()?.toISOString() ||
              data?.inviteExpiresAt,
            // 🔒 Dashboard lock flag
            isDashboardLocked: false,
          };
        } catch (err) {
          console.error("Authorize error:", err);
          throw new Error("Invalid login details");
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

export async function verifyTotpForUnlock(userId, code) {
  const doc = await db.collection("admin_users").doc(userId).get();
  if (!doc.exists) return false;
  const secret = doc.data()?.totpSecret;
  return authenticator.check(code, secret);
}
