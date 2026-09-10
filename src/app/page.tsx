import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { SupportDashboard } from "~/components/custom/support-dashboard";

export const metadata = {
  title: "AI Resolve - Intelligence Dashboard",
  description: "Evidence-grounded customer support intelligence platform",
};

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  const { user } = session;

  return (
    <main className="min-h-screen bg-[#F4F6FB] text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Bento Main Container (No Navbar) */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <SupportDashboard user={user} />
      </div>
    </main>
  );
}
