"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const SAMPLE_DATASET = [
  {
    brandName: "AppleSupport",
    conversationTwitterId: "tw_conv_101",
    customer: {
      twitterId: "tw_cust_201",
      username: "tech_enthusiast",
    },
    messages: [
      {
        twitterId: "tw_msg_301",
        authorId: "tw_cust_201",
        username: "tech_enthusiast",
        text: "My iPhone 15 Pro battery is draining from 100% to 20% in less than 3 hours after updating to iOS 18.",
        role: "CUSTOMER" as const,
        createdAt: new Date().toISOString(),
      },
      {
        twitterId: "tw_msg_302",
        authorId: "apple_rep",
        username: "AppleSupport",
        text: "We understand your concern with battery life! Please go to Settings > Battery to see if a specific app is utilizing high background activity, and try restarting your device.",
        role: "BRAND" as const,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    brandName: "DeltaSupport",
    conversationTwitterId: "tw_conv_102",
    customer: {
      twitterId: "tw_cust_202",
      username: "traveler_dan",
    },
    messages: [
      {
        twitterId: "tw_msg_303",
        authorId: "tw_cust_202",
        username: "traveler_dan",
        text: "Flight DL452 was cancelled without any notification. I am stuck at JFK and need a hotel voucher immediately!",
        role: "CUSTOMER" as const,
        createdAt: new Date().toISOString(),
      },
      {
        twitterId: "tw_msg_304",
        authorId: "delta_rep",
        username: "DeltaSupport",
        text: "We are truly sorry for this disruption. Please DM us your 6-letter confirmation code and full name so our gate assistance team can issue your accommodation voucher.",
        role: "BRAND" as const,
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

export function DatasetUploader({
  onUploadSuccess,
}: {
  onUploadSuccess?: () => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [brandName, setBrandName] = useState("AppleSupport");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const ingestMutation = api.agent.ingestDataset.useMutation({
    onSuccess: (data) => {
      setUploadStatus(
        `✅ Successfully ingested: ${data.conversationsCount} conversations, ${data.messagesCount} messages (${data.pineconeIndexedCount} indexed in Pinecone)!`,
      );
      onUploadSuccess?.();
    },
    onError: (err) => {
      setUploadStatus(`❌ Ingestion failed: ${err.message}`);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(SAMPLE_DATASET, null, 2));
  };

  const handleIngest = () => {
    if (!jsonText.trim()) {
      setUploadStatus("❌ Please paste or upload a JSON dataset first.");
      return;
    }

    setUploadStatus(null);
    ingestMutation.mutate({
      defaultBrandName: brandName,
      jsonData: jsonText,
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">
            1. Ingest Twitter Dataset (JSON)
          </h2>
          <p className="text-xs text-zinc-400">
            Upload or paste historical customer support conversations to
            populate PostgreSQL & Pinecone Vector DB.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSample}
          className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-blue-500 hover:bg-zinc-700 hover:text-white"
        >
          Load Sample Dataset
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Default Brand Name
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-100 transition focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Upload JSON File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="w-full text-xs text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-zinc-200 hover:file:bg-zinc-700"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          JSON Dataset Content
        </label>
        <textarea
          rows={6}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`[\n  {\n    "brandName": "AppleSupport",\n    "messages": [\n      { "text": "Help with battery...", "role": "CUSTOMER" },\n      { "text": "Check Settings...", "role": "BRAND" }\n    ]\n  }\n]`}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 font-mono text-xs text-zinc-200 placeholder-zinc-600 transition focus:border-blue-500 focus:outline-none"
        />
      </div>

      {uploadStatus && (
        <div
          className={`mb-4 rounded-xl p-3 text-xs font-medium ${
            uploadStatus.startsWith("✅")
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {uploadStatus}
        </div>
      )}

      <button
        type="button"
        onClick={handleIngest}
        disabled={ingestMutation.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
      >
        {ingestMutation.isPending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Ingesting to Database & Pinecone...</span>
          </>
        ) : (
          <span>Ingest & Index in Pinecone</span>
        )}
      </button>
    </div>
  );
}
