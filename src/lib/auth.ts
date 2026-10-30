import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/" },
  callbacks: {
    jwt({ token, profile }) {
      // Google's stable subject id is the user key for every D1 row.
      if (profile?.sub) token.uid = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = (token.uid as string) ?? token.sub ?? "";
      return session;
    },
  },
});

export type AppUser = { id: string; name: string; image: string | null };

/** E2E/local shortcut. Never honoured in production builds. */
function bypassUser(): AppUser | null {
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_BYPASS === "1") {
    return { id: "local-dev-user", name: "Local Dev", image: null };
  }
  return null;
}

export async function currentUser(): Promise<AppUser | null> {
  const bypass = bypassUser();
  if (bypass) return bypass;
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, name: session.user.name ?? "", image: session.user.image ?? null };
}
