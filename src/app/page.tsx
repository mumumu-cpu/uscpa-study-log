import { currentUser, signIn, signOut } from "@/lib/auth";
import App from "@/components/App";
import SignIn from "@/components/SignIn";

export const runtime = "edge";

export default async function Page() {
  const user = await currentUser();
  if (!user) {
    async function google() {
      "use server";
      await signIn("google", { redirectTo: "/" });
    }
    return <SignIn action={google} />;
  }
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }
  return <App signOutAction={process.env.AUTH_BYPASS === "1" ? undefined : logout} />;
}
