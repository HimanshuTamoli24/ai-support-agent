"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

export function AgentTester({ onRunSuccess }: { onRunSuccess?: () => void }) {
  const [inputText, setInputText] = useState(
    "My iPhone battery is dropping from 100% to 15% within 2 hours. Is this a known defect?",
  );
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [copiedBrandId, setCopiedBrandId] = useState<string | null>(null);

  const { data: brands } = api.agent.getBrands.useQuery();

  const runMutation = api.agent.runAgent.useMutation({
    onSuccess: () => {
      onRunSuccess?.();
    },
  });

  const handleRun = (customText?: string) => {
    const text = customText ?? inputText;
    if (!text.trim()) return;
    runMutation.mutate({
      inputText: text.trim(),
      brandId: selectedBrandId || undefined,
    });
  };

  const handleCopyLink = (brandId: string) => {
    const url = `${window.location.origin}/${brandId}/chat`;
    void navigator.clipboard.writeText(url);
    setCopiedBrandId(brandId);
    setTimeout(() => setCopiedBrandId(null), 2000);
  };

  const activeBrandForChat =
    selectedBrandId || (brands && brands.length > 0 ? brands[0]?.id : "");

  const quickPrompts = [
    "Battery dropping from 100% to 15% within 2 hours after update.",
    "My package is 4 days late, tracking link says pending.",
    "I want to return an opened product, what is the refund window?",
    "Device battery is physically swollen, is it safe to charge?",
  ];

  const result = runMutation.data;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
      {/* Header & Live Portals Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              🔍
            </span>
            <h2 className="text-base font-bold text-slate-900">
              AI Support Agent Sandbox
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Simulate real-time Pinecone vector search, intent classification, calibrated escalation analysis, and grounded response drafting.
          </p>
        </div>

        {/* Live Portals Shortcut Pills */}
        {brands && brands.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Live Portals:
            </span>
            {brands.slice(0, 3).map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs shadow-2xs"
              >
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-800">{b.name}</span>
                <Link
                  href={`/${b.id}/chat`}
                  target="_blank"
                  title="Open live portal in new window"
                  className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white transition hover:bg-blue-500"
                >
                  Chat ↗
                </Link>
                <button
                  type="button"
                  title="Copy direct portal link"
                  onClick={() => handleCopyLink(b.id)}
                  className="text-[10px] font-medium text-slate-500 hover:text-slate-800"
                >
                  {copiedBrandId === b.id ? "✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query Config Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Target Brand Filter
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            <option value="">All Ingested Brands</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {activeBrandForChat && (
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Portal Link:</span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${activeBrandForChat}/chat`}
                  target="_blank"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Open Chat ↗
                </Link>
                <button
                  type="button"
                  onClick={() => handleCopyLink(activeBrandForChat)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  {copiedBrandId === activeBrandForChat ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Incoming Customer Query
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type customer question here..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
            />

            {/* Quick Sample Query Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Prompts:
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(p);
                    handleRun(p);
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-0.5 text-[11px] text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {p.length > 38 ? `${p.slice(0, 38)}...` : p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleRun()}
        disabled={runMutation.isPending || !inputText.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
      >
        {runMutation.isPending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Searching Pinecone Vectors & Formulating Response...</span>
          </>
        ) : (
          <span>Execute Support Agent ⚡</span>
        )}
      </button>

      {/* Results Output */}
      {result && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 shadow-2xs">
          {/* Status Headers */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Predicted Intent:</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                {result.predictedIntentName ?? "General Inquiry"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Escalation Status:</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold border ${
                  result.shouldEscalate
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {result.shouldEscalate
                  ? "🚨 Requires Human Escalation"
                  : "✅ Auto-Handled by Agent"}
              </span>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              ⚡ {result.latencyMs}ms ({result.model})
            </span>
          </div>

          {result.escalationReason && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-800">
              <strong>Escalation Reason:</strong> {result.escalationReason}
            </div>
          )}

          {/* Draft Reply */}
          <div>
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Generated Grounded Draft Reply
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs sm:text-sm leading-relaxed text-slate-800 shadow-2xs">
              {result.draftReply}
            </div>
          </div>

          {/* Retrieved Pinecone Evidence */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Retrieved Precedents ({result.evidence.length} historical vector matches from Pinecone)
            </h3>
            <div className="space-y-2">
              {result.evidence.length > 0 ? (
                result.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          ev.role === "BRAND"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ev.role}
                      </span>
                      <span className="font-mono text-blue-600 font-bold">
                        {(ev.relevanceScore * 100).toFixed(0)}% vector match
                      </span>
                    </div>
                    <p className="text-slate-700 italic leading-relaxed">"{ev.text}"</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  No direct vector matches retrieved above threshold. Response formulated with general policy rules.
                </p>
              )}
            </div>
          </div>

          {/* Live Customer Portal Bridge */}
          {activeBrandForChat && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs">
              <div className="flex items-center gap-2 text-blue-900">
                <span>💬</span>
                <span>
                  Want to test the full multi-turn conversation experience as an end-customer?
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${activeBrandForChat}/chat`}
                  target="_blank"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 font-bold text-white shadow-2xs transition hover:bg-blue-500"
                >
                  <span>Open Customer Chat Portal</span>
                  <span>↗</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleCopyLink(activeBrandForChat)}
                  className="rounded-xl border border-blue-200 bg-white px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50"
                >
                  {copiedBrandId === activeBrandForChat ? "✓ Copied" : "Copy Link"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
