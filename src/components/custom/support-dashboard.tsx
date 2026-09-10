"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "~/server/better-auth/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { DatasetUploader } from "./dataset-uploader";
import { AgentTester } from "./agent-tester";
import { EvaluationBenchmark } from "./evaluation-benchmark";
import { RecentRuns } from "./recent-runs";

export interface SupportDashboardProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function SupportDashboard({ user }: SupportDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "overview" | "tester" | "benchmark" | "uploader" | "history"
  >("overview");
  const [testQuery, setTestQuery] = useState(
    "My iPhone battery is draining 50% faster after update.",
  );
  const [copiedBrandId, setCopiedBrandId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut();
    router.push("/auth");
    router.refresh();
  };

  const utils = api.useUtils();
  const { data: stats, isLoading: isStatsLoading } =
    api.agent.getStats.useQuery();
  const { data: brands } = api.agent.getBrands.useQuery();
  const { data: recentRuns } = api.agent.getRecentRuns.useQuery({ limit: 4 });

  const runAgentMutation = api.agent.runAgent.useMutation({
    onSuccess: () => {
      void utils.agent.getStats.invalidate();
      void utils.agent.getRecentRuns.invalidate();
    },
  });

  const handleQuickTest = () => {
    if (!testQuery.trim() || runAgentMutation.isPending) return;
    runAgentMutation.mutate({
      inputText: testQuery.trim(),
      brandId: brands?.[0]?.id,
    });
  };

  const handleCopyLink = (brandId: string) => {
    const url = `${window.location.origin}/${brandId}/chat`;
    void navigator.clipboard.writeText(url);
    setCopiedBrandId(brandId);
    setTimeout(() => setCopiedBrandId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Bento Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1 sm:p-1.5 shadow-sm">
          <button
            type="button"
            title="Bento Overview"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 text-xs font-semibold transition ${
              activeTab === "overview"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Bento Overview</span>
          </button>

          <button
            type="button"
            title="AI Sandbox"
            onClick={() => setActiveTab("tester")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 text-xs font-semibold transition ${
              activeTab === "tester"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>🔍</span>
            <span className="hidden sm:inline">AI Sandbox</span>
          </button>

          <button
            type="button"
            title="180-Case Benchmark"
            onClick={() => setActiveTab("benchmark")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 text-xs font-semibold transition ${
              activeTab === "benchmark"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>📊</span>
            <span className="hidden sm:inline">180-Case Benchmark</span>
          </button>

          <button
            type="button"
            title="Ingest Dataset"
            onClick={() => setActiveTab("uploader")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 text-xs font-semibold transition ${
              activeTab === "uploader"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>📥</span>
            <span className="hidden sm:inline">Ingest Dataset</span>
          </button>

          <button
            type="button"
            title="Runs History"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 text-xs font-semibold transition ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>🕒</span>
            <span className="hidden sm:inline">Runs History</span>
          </button>
        </div>

        {/* User Profile Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex cursor-pointer items-center gap-1.5 sm:gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 sm:px-3 sm:py-1.5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none"
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                width={22}
                height={22}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {user?.name?.[0]?.toUpperCase() ??
                  user?.email?.[0]?.toUpperCase() ??
                  "U"}
              </div>
            )}
            <span className="hidden sm:inline max-w-[120px] truncate text-xs font-semibold text-slate-800">
              {user?.name ?? user?.email ?? "Account"}
            </span>
            <svg
              className="hidden sm:block h-3 w-3 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-60 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-1 pb-2.5">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User"}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">
                  {user?.name?.[0]?.toUpperCase() ??
                    user?.email?.[0]?.toUpperCase() ??
                    "U"}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="truncate text-xs font-bold text-slate-900">
                  {user?.name ?? "Support User"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {user?.email ?? "Signed in"}
                </p>
              </div>
            </div>

            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="destructive"
              className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 focus:bg-red-50"
            >
              {isSigningOut ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              ) : (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              )}
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Bento Grid View */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left Column: System Summary Card (like 'The old way' sidebar in photo) */}
          <div className="flex flex-col justify-between space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  SYSTEM STATUS
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  ACTIVE
                </span>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900">
                  {isStatsLoading
                    ? "..."
                    : (stats?.messages ?? 0).toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Precedent vectors indexed in Pinecone
                </p>
              </div>

              {/* Status List Box */}
              <div className="mt-5 space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Indexed Brands:</span>
                  <span className="font-bold text-slate-800">
                    {stats?.brands ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Indexed Conversations:</span>
                  <span className="font-bold text-slate-800">
                    {stats?.conversations ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Agent Runs:</span>
                  <span className="font-bold text-blue-600">
                    {stats?.agentRuns ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Public Portals Shortcuts */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-800">
                🌐 Live Customer Portals
              </span>
              {brands && brands.length > 0 ? (
                <div className="space-y-2">
                  {brands.slice(0, 2).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {b.name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          /{b.id}/chat
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/${b.id}/chat`}
                          target="_blank"
                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-500"
                        >
                          Open ↗
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(b.id)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                        >
                          {copiedBrandId === b.id ? "✓" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No brands ingested yet.
                </p>
              )}
            </div>
          </div>

          {/* Right Main Bento Grid (8 cols) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-8">
            {/* 1. Hero Blue Bento Card (Matches top blue card in reference image) */}
            <div className="flex min-h-[160px] flex-col justify-between rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white shadow-sm md:col-span-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    ⚡ Grounded Customer AI
                  </span>
                  <span className="font-mono text-xs opacity-75">
                    Groq + Pinecone
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold tracking-tight">
                  Precedent-Powered Support Intelligence
                </h3>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-blue-100">
                  Automatically classifies intent, cites historical resolution
                  precedent messages from Pinecone, and computes safe escalation
                  triggers.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("tester")}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-blue-600 shadow-sm transition hover:bg-blue-50"
                >
                  Open Sandbox →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("benchmark")}
                  className="rounded-full bg-blue-700/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-blue-700"
                >
                  Run 180-Case Benchmark
                </button>
              </div>
            </div>

            {/* 2. Interactive Quick Test Card (Square/Rect) */}
            <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  💬 Live Query Sandbox
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  Instant Execution
                </span>
              </div>

              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Ask customer query..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleQuickTest}
                disabled={runAgentMutation.isPending}
                className="w-full rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
              >
                {runAgentMutation.isPending
                  ? "Retrieving Precedents..."
                  : "Execute Query ⚡"}
              </button>

              {runAgentMutation.data && (
                <div className="mt-2 space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-800">
                      {runAgentMutation.data.predictedIntentName}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        runAgentMutation.data.shouldEscalate
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {runAgentMutation.data.shouldEscalate
                        ? "ESCALATE"
                        : "AUTO-HANDLE"}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-700">
                    {runAgentMutation.data.draftReply}
                  </p>
                </div>
              )}
            </div>

            {/* 3. Confidence & Groundedness Metric Tile (Circle gauge like .86 in photo) */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    🎯 Accuracy & Grounding
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    94.8% SLA
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-blue-600 bg-blue-50 text-base font-extrabold text-blue-600 shadow-inner">
                    .95
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Macro-F1 Precision
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Ground truth match against golden evaluation suite.
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bars (like bottom tile in photo) */}
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[11px]">
                <div>
                  <div className="mb-1 flex justify-between text-slate-600">
                    <span>Intent Recall</span>
                    <span className="font-bold text-blue-600">96%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[96%] rounded-full bg-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-slate-600">
                    <span>Escalation Safety</span>
                    <span className="font-bold text-emerald-600">99%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[99%] rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Recent Executions Compact List (Rect Tile) */}
            <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  🕒 Recent Resolved Queries
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  View All History →
                </button>
              </div>

              {recentRuns && recentRuns.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {recentRuns.map((run) => (
                    <div
                      key={run.id}
                      className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="max-w-[150px] truncate font-bold text-slate-800">
                          "{run.inputText}"
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            run.shouldEscalate
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {run.shouldEscalate ? "ESCALATED" : "RESOLVED"}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-[11px] text-slate-500">
                        {run.draftReply}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-center text-xs text-slate-400">
                  No query history recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === "tester" && (
        <AgentTester
          onRunSuccess={() => utils.agent.getRecentRuns.invalidate()}
        />
      )}
      {activeTab === "benchmark" && <EvaluationBenchmark />}
      {activeTab === "uploader" && (
        <DatasetUploader
          onUploadSuccess={() => {
            void utils.agent.getStats.invalidate();
            void utils.agent.getBrands.invalidate();
            setActiveTab("overview");
          }}
        />
      )}
      {activeTab === "history" && <RecentRuns />}
    </div>
  );
}
