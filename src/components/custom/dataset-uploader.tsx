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

  const uploadMutation = api.agent.uploadDataset.useMutation({
    onSuccess: (data) => {
      setUploadStatus(
        data.status === "READY"
          ? `✅ Dataset "${data.name}" normalized and indexed into Pinecone & PostgreSQL successfully! (${data.conversationsCount} conversations).`
          : `✅ Dataset "${data.name}" queued! ID: ${data.datasetId} (${data.conversationsCount} conversations). Inngest background indexing started.`,
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
    uploadMutation.mutate({
      name: brandName,
      jsonData: jsonText,
    });
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            1. Ingest Support Dataset (JSON)
          </h2>
          <p className="text-xs text-slate-500">
            Upload or paste customer support conversations to normalize in PostgreSQL and index into Pinecone vector storage.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSample}
          className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Load Sample JSON
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Default Brand Name
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Upload JSON File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
          Raw Dataset JSON
        </label>
        <textarea
          rows={6}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`[\n  {\n    "brandName": "AppleSupport",\n    "messages": [...]\n  }\n]`}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleIngest}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
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
              Queueing Indexing...
            </>
          ) : (
            <>⚡ Ingest & Index Dataset</>
          )}
        </button>

        {uploadStatus && (
          <p className="text-xs text-slate-700 max-w-md truncate font-medium">{uploadStatus}</p>
        )}
      </div>
    </div>
  );
}
