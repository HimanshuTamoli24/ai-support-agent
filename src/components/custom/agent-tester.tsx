"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function AgentTester({ onRunSuccess }: { onRunSuccess?: () => void }) {
  const [inputText, setInputText] = useState(
    "My iPhone battery is dropping from 100% to 15% within 2 hours. Is this a known defect?",
  );
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  const { data: brands } = api.agent.getBrands.useQuery();

  const runMutation = api.agent.runAgent.useMutation({
    onSuccess: () => {
      onRunSuccess?.();
    },
  });

  const handleRun = () => {
    if (!inputText.trim()) return;
    runMutation.mutate({
      inputText,
      brandId: selectedBrandId || undefined,
    });
  };

  const result = runMutation.data;

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-zinc-100">
          2. AI Support Agent & Semantic Retrieval
        </h2>
        <p className="text-xs text-zinc-400">
          Test real-time Pinecone vector search, intent classification, escalation analysis, and draft response formulation.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Select Brand (Optional)
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-100 transition focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Incoming Customer Query / Tweet
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type customer question here..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-100 transition focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={runMutation.isPending || !inputText.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
      >
        {runMutation.isPending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Searching Pinecone & Generating AI Response...</span>
          </>
        ) : (
          <span>Execute Support Agent</span>
        )}
      </button>

      {/* Results Output */}
      {result && (
        <div className="mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
          {/* Status Headers */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Predicted Intent:</span>
              <span className="rounded-lg bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/30">
                {result.predictedIntentName ?? "Unclassified"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Escalation:</span>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  result.shouldEscalate
                    ? "border-red-500/30 bg-red-500/15 text-red-400"
                    : "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                }`}
              >
                {result.shouldEscalate ? "🚨 Requires Human Escalation" : "✅ AI Resolved"}
              </span>
            </div>

            <span className="text-xs text-zinc-500">
              ⚡ {result.latencyMs}ms ({result.model})
            </span>
          </div>

          {result.escalationReason && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <strong>Escalation Reason:</strong> {result.escalationReason}
            </div>
          )}

          {/* Draft Reply */}
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Generated Draft Reply
            </h3>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 text-sm leading-relaxed text-zinc-200">
              {result.draftReply}
            </div>
          </div>

          {/* Retrieved Pinecone Evidence */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Retrieved Historical Evidence ({result.evidence.length} matches from Pinecone)
            </h3>
            <div className="space-y-2">
              {result.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 text-xs"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        ev.role === "BRAND"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {ev.role}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {(ev.relevanceScore * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-zinc-300 italic">"{ev.text}"</p>
                  {ev.reason && (
                    <p className="mt-1.5 text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-1">
                      💡 {ev.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
