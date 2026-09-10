"use client";

import { api } from "~/trpc/react";

export function RecentRuns() {
  const { data: recentRuns, isLoading } = api.agent.getRecentRuns.useQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-xs text-zinc-500">
        Loading recent agent runs...
      </div>
    );
  }

  if (!recentRuns || recentRuns.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-xs text-zinc-500">
        No recent agent runs recorded yet. Execute a query in the test console above to see history.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
      <h2 className="mb-4 text-lg font-bold text-zinc-100">
        3. Agent Runs & Evidence History
      </h2>

      <div className="space-y-3">
        {recentRuns.map((run) => (
          <div
            key={run.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs transition hover:border-zinc-700"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-zinc-200">
                "{run.inputText}"
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    run.shouldEscalate
                      ? "bg-red-500/20 text-red-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {run.shouldEscalate ? "ESCALATED" : "RESOLVED"}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(run.createdAt).toLocaleTimeString()} ({run.latencyMs}ms)
                </span>
              </div>
            </div>

            {run.draftReply && (
              <p className="text-zinc-400">
                <span className="font-medium text-zinc-300">Draft:</span> {run.draftReply}
              </p>
            )}

            {run.evidence && run.evidence.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-zinc-800/60 pt-2 text-[11px] text-zinc-500">
                <span>Retrieved {run.evidence.length} evidence messages:</span>
                {run.evidence.map((ev) => (
                  <span
                    key={ev.id}
                    className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300"
                  >
                    {ev.message?.role ?? "MSG"} ({(Number(ev.relevanceScore ?? 0) * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
