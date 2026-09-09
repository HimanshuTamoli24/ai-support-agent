import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { SignOutButton } from "./_components/sign-out-button";
import Image from "next/image";

export default async function HomePage() {
  const session = await getSession();

  // Route protection: If not logged in, do not allow visiting / and redirect to /login
  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 text-zinc-100">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[140px]" />

      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header Badge */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Authenticated Session
            </span>
          </div>
          <SignOutButton />
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "User avatar"}
              width={56}
              height={56}
              className="rounded-full border border-zinc-700 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-lg font-bold text-blue-400">
              {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {user.name || "Anonymous User"}
            </h2>
            <p className="text-sm text-zinc-400">{user.email}</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            User ID
          </p>
          <code className="mt-1 block overflow-x-auto text-xs text-blue-300">
            {user.id}
          </code>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-400">
            🎉 Protected route access granted. You are ready to start building the code review workspace!
          </p>
        </div>
      </div>
    </main>
  );
}
