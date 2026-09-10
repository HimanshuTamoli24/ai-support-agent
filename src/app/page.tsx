import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

import Image from "next/image";
import { SignOutButton } from "~/components/custom/sign-out-button";
import { SupportDashboard } from "~/components/custom/support-dashboard";

export const metadata = {
  title: "AI Customer Support Agent - Dashboard",
  description: "Twitter support conversation retrieval and AI agent console",
};

export default async function HomePage() {
  const session = await getSession();

  // Route protection: If not logged in, redirect to /login
  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <main className="relative min-h-screen bg-zinc-950 text-zinc-100">
      {/* Background glowing gradients */}
      <div className="pointer-events-none fixed -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[150px]" />
      <div className="pointer-events-none fixed top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[150px]" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
                AI Customer Support Agent
              </h1>
              <p className="text-[11px] text-zinc-400">
                PostgreSQL + Pinecone Vector Search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User"}
                  width={32}
                  height={32}
                  className="rounded-full border border-zinc-700 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-blue-400">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <span className="text-xs font-medium text-zinc-300">
                {user.name ?? user.email}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SupportDashboard />
      </div>
    </main>
  );
}
