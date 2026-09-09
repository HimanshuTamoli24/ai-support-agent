import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { LoginForm } from "./_components/login-form";

export const metadata = {
  title: "Sign In - AI Code Reviewer",
  description: "Sign in to access AI Code Reviewer",
};

export default async function LoginPage() {
  const session = await getSession();

  // If already authenticated, redirect to home
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 text-zinc-100">
      {/* Background glowing gradient circles */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />

      <LoginForm />
    </main>
  );
}
