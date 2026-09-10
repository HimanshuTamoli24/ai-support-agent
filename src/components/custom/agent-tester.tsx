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
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          2. AI Support Agent & Semantic Precedent Search
        </h2>
        <p className="text-xs text-slate-500">
          Test real-time Pinecone vector search, intent classification, escalation analysis, and draft response formulation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Select Brand (Optional)
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
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
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Incoming Customer Query
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type customer question here..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={runMutation.isPending || !inputText.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
      >
        {runMutation.isPending ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Searching Vector Precedents...</span>
          </>
        ) : (
          <span>Execute Support Agent ⚡</span>
        )}
      </button>

      {/* Results Output */}
      {result && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
          {/* Status Headers */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Predicted Intent:</span>
              <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                {result.predictedIntentName ?? "Unclassified"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Escalation:</span>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold border ${
                  result.shouldEscalate
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {result.shouldEscalate ? "🚨 Requires Human Escalation" : "✅ Auto-Handled"}
              </span>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              ⚡ {result.latencyMs}ms ({result.model})
            </span>
          </div>

          {result.escalationReason && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Escalation Reason:</strong> {result.escalationReason}
            </div>
          )}

          {/* Draft Reply */}
          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Generated Draft Reply
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs sm:text-sm leading-relaxed text-slate-800 shadow-2xs">
              {result.draftReply}
            </div>
          </div>

          {/* Retrieved Pinecone Evidence */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Retrieved Precedents ({result.evidence.length} matches from Pinecone)
            </h3>
            <div className="space-y-2">
              {result.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-xs"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        ev.role === "BRAND"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ev.role}
                    </span>
                    <span className="font-mono text-blue-600 font-bold">
                      {(ev.relevanceScore * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <p className="text-slate-700 italic">"{ev.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
