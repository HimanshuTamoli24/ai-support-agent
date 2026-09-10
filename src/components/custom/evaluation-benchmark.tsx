"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import type { EvaluationBenchmarkReport } from "~/server/services/evaluation-service";

export function EvaluationBenchmark() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [filterFailureType, setFilterFailureType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: datasets } = api.agent.getDatasets.useQuery();

  const runBenchmarkMutation = api.agent.runBenchmark.useMutation();
  const [report, setReport] = useState<EvaluationBenchmarkReport | null>(null);

  const handleRunBenchmark = async () => {
    try {
      const result = await runBenchmarkMutation.mutateAsync({
        datasetId: selectedDatasetId || undefined,
      });
      setReport(result);
    } catch (error) {
      console.error("Benchmark error:", error);
    }
  };

  const filteredFailures = report?.failures.filter((f) => {
    if (filterFailureType !== "ALL" && f.failureType !== filterFailureType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.text.toLowerCase().includes(q) ||
        f.expectedIntent.toLowerCase().includes(q) ||
        f.predictedIntent.toLowerCase().includes(q) ||
        f.details.toLowerCase().includes(q)
      );
    }
    return true;
  }) ?? [];

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-100">
              📊
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Scientific Evaluation & Benchmarking Suite
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Empirical validation against 180 golden customer support test cases. Compares the Proposed
            Evidence-Grounded Agent with 2 baselines across Macro-F1, Escalation Safety, Groundedness, and Latency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {datasets && datasets.length > 0 && (
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All / Global Namespace</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.status})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleRunBenchmark}
            disabled={runBenchmarkMutation.isPending}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
          >
            {runBenchmarkMutation.isPending ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Evaluating 180 Cases...
              </>
            ) : (
              <>⚡ Run 180-Case Benchmark</>
            )}
          </button>
        </div>
      </div>

      {/* Benchmark Results */}
      {report ? (
        <div className="space-y-6">
          {/* Comparative Metrics Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>🏆 Empirical System Benchmark ({report.datasetSize} Golden Test Cases)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Executed: {new Date(report.timestamp).toLocaleTimeString()}
              </span>
            </h3>

            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-white text-[11px] font-semibold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Metric</th>
                  <th className="py-2.5 px-3 text-blue-700 font-bold bg-blue-50/70 rounded-t-lg">
                    ✨ Proposed Agent (RAG)
                  </th>
                  <th className="py-2.5 px-3 text-slate-500">Baseline 1 (Zero-Shot LLM)</th>
                  <th className="py-2.5 px-3 text-slate-500">Baseline 2 (Keyword Rules)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-mono text-xs">
                <tr>
                  <td className="py-2.5 px-3 font-sans text-slate-600">Intent Macro-F1</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold bg-blue-50/30">
                    {(report.systems.proposedAgent.intentMacroF1 * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {(report.systems.zeroShotLLM.intentMacroF1 * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {(report.systems.keywordHeuristic.intentMacroF1 * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans text-slate-600">Intent Accuracy</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold bg-blue-50/30">
                    {(report.systems.proposedAgent.intentAccuracy * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {(report.systems.zeroShotLLM.intentAccuracy * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {(report.systems.keywordHeuristic.intentAccuracy * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans text-slate-600">Escalation Precision</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold bg-blue-50/30">
                    {(report.systems.proposedAgent.escalationPrecision * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {(report.systems.zeroShotLLM.escalationPrecision * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {(report.systems.keywordHeuristic.escalationPrecision * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans text-slate-600">Escalation Recall</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold bg-blue-50/30">
                    {(report.systems.proposedAgent.escalationRecall * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {(report.systems.zeroShotLLM.escalationRecall * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {(report.systems.keywordHeuristic.escalationRecall * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans text-slate-600">
                    ⚠️ Under-Escalation Rate <span className="text-[10px] text-red-600">(Safety Risk)</span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold bg-blue-50/30">
                    {(report.systems.proposedAgent.underEscalationRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-red-600 font-bold">
                    {(report.systems.zeroShotLLM.underEscalationRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-amber-600">
                    {(report.systems.keywordHeuristic.underEscalationRate * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans text-slate-600">
                    Groundedness Score
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold bg-blue-50/30">
                    {(report.systems.proposedAgent.averageGroundednessScore * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {(report.systems.zeroShotLLM.averageGroundednessScore * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {(report.systems.keywordHeuristic.averageGroundednessScore * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans text-slate-600">Average Latency</td>
                  <td className="py-2.5 px-3 text-blue-700 font-bold bg-blue-50/30">
                    {report.systems.proposedAgent.avgLatencyMs} ms
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{report.systems.zeroShotLLM.avgLatencyMs} ms</td>
                  <td className="py-2.5 px-3 text-slate-500">{report.systems.keywordHeuristic.avgLatencyMs} ms</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Intent Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-xs font-bold text-slate-800">
              📑 Intent Breakdown (Proposed System)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {Object.entries(report.intentBreakdown).map(([intent, data]) => (
                <div
                  key={intent}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <p className="text-xs font-bold text-slate-800 truncate">{intent}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>F1: <strong className="text-emerald-600">{(data.f1 * 100).toFixed(0)}%</strong></span>
                    <span>P: {(data.precision * 100).toFixed(0)}%</span>
                    <span>R: {(data.recall * 100).toFixed(0)}%</span>
                    <span>N: {data.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Failure Analysis Table */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  🔍 Failure Analysis & Diagnostics ({filteredFailures.length} issues)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Systematic categorization of prediction errors and edge cases.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search failed query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />

                <select
                  value={filterFailureType}
                  onChange={(e) => setFilterFailureType(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Failures</option>
                  <option value="UNDER_ESCALATION">Under-Escalation (Safety)</option>
                  <option value="OVER_ESCALATION">Over-Escalation</option>
                  <option value="MISSED_INTENT">Missed Intent</option>
                  <option value="UNGROUNDED_REPLY">Ungrounded Reply</option>
                </select>
              </div>
            </div>

            {filteredFailures.length > 0 ? (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Query</th>
                      <th className="py-2 px-3">Expected vs Predicted</th>
                      <th className="py-2 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredFailures.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {f.failureType === "UNDER_ESCALATION" && (
                            <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              🚨 Under-Escalation
                            </span>
                          )}
                          {f.failureType === "OVER_ESCALATION" && (
                            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              ⚠️ Over-Escalation
                            </span>
                          )}
                          {f.failureType === "MISSED_INTENT" && (
                            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              ℹ️ Missed Intent
                            </span>
                          )}
                          {f.failureType === "UNGROUNDED_REPLY" && (
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              📜 Ungrounded
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate font-sans text-slate-800">
                          {f.text}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-500">{f.expectedIntent}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="text-blue-700 font-bold">{f.predictedIntent}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">
                          {f.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                🎉 No failure cases found matching filter.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-xs font-bold text-slate-800">
            Ready to Run Empirical Benchmark
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Click &quot;Run 180-Case Benchmark&quot; to test against the golden dataset and view side-by-side Macro-F1, Escalation Safety, and Groundedness scores.
          </p>
        </div>
      )}
    </div>
  );
}
