"use client";

import { api } from "~/trpc/react";

export function RecentRuns() {
  const { data: recentRuns, isLoading } = api.agent.getRecentRuns.useQuery({ limit: 10 });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center text-xs text-slate-400">
        Loading recent agent runs...
      </div>
    );
  }

  if (!recentRuns || recentRuns.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center text-xs text-slate-400">
        No recent agent runs recorded yet. Execute a query in the test console to see history.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-slate-900">
        Agent Execution History & Citations
      </h2>

      <div className="space-y-3">
        {recentRuns.map((run) => (
          <div
            key={run.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs space-y-2 transition hover:border-slate-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800">
                "{run.inputText}"
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    run.shouldEscalate
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {run.shouldEscalate ? "ESCALATED" : "AUTO-HANDLED"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(run.createdAt).toLocaleTimeString()} ({run.latencyMs}ms)
                </span>
              </div>
            </div>

            {run.draftReply && (
              <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800">Draft:</span> {run.draftReply}
              </p>
            )}

            {run.evidence && run.evidence.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                <span className="font-medium">Cited Precedents:</span>
                {run.evidence.map((ev) => (
                  <span
                    key={ev.id}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-700"
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
