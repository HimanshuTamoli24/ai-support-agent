"use client";

import { api } from "~/trpc/react";
import { DatasetUploader } from "./dataset-uploader";
import { AgentTester } from "./agent-tester";
import { RecentRuns } from "./recent-runs";
import Link from "next/link";
import { useState } from "react";

export function SupportDashboard() {
  const utils = api.useUtils();
  const { data: stats, isLoading } = api.agent.getStats.useQuery();
  const { data: brands, isLoading: isBrandsLoading } = api.agent.getBrands.useQuery();
  const [copiedBrandId, setCopiedBrandId] = useState<string | null>(null);

  const handleRefresh = () => {
    void utils.agent.getStats.invalidate();
    void utils.agent.getRecentRuns.invalidate();
    void utils.agent.getBrands.invalidate();
  };

  const handleCopyLink = (brandId: string) => {
    const url = `${window.location.origin}/${brandId}/chat`;
    void navigator.clipboard.writeText(url);
    setCopiedBrandId(brandId);
    setTimeout(() => setCopiedBrandId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Real-time System Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
          <p className="text-xs text-zinc-400">Brands</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-100">
            {isLoading ? "-" : (stats?.brands ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
          <p className="text-xs text-zinc-400">Customers</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-100">
            {isLoading ? "-" : (stats?.customers ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
          <p className="text-xs text-zinc-400">Conversations</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-100">
            {isLoading ? "-" : (stats?.conversations ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
          <p className="text-xs text-zinc-400">Indexed Messages</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-400">
            {isLoading ? "-" : (stats?.messages ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
          <p className="text-xs text-zinc-400">Agent Runs</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-400">
            {isLoading ? "-" : (stats?.agentRuns ?? 0)}
          </p>
        </div>
      </div>

      {/* Brand Public Chat Portals */}
      {brands && brands.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                🌐 Public Customer Support Portals
              </h2>
              <p className="text-xs text-zinc-400">
                Share these public links with customers so they can talk with your AI Support Agent on{" "}
                <code className="text-blue-300">/[brandId]/chat</code>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 transition hover:border-zinc-700"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100">{brand.name}</span>
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                      {brand._count.conversations} convs
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500 font-mono truncate">
                    ID: {brand.id}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-zinc-800/60">
                  <Link
                    href={`/${brand.id}/chat`}
                    target="_blank"
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    Open Public Chat ↗
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(brand.id)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                  >
                    {copiedBrandId === brand.id ? "Copied! ✓" : "Copy Link"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Feature Sections */}
      <div className="space-y-8">
        <DatasetUploader onUploadSuccess={handleRefresh} />
        <AgentTester onRunSuccess={handleRefresh} />
        <RecentRuns />
      </div>
    </div>
  );
}
