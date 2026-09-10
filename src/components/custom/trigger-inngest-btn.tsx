"use client";

import { api } from "~/trpc/react";
import { useState } from "react";

export function TriggerInngestBtn() {
  const [status, setStatus] = useState<string | null>(null);

  const { mutateAsync: triggerTask, isPending } =
    api.inngest.triggerTask.useMutation({
      onSuccess: (data) => {
        setStatus(`✅ Event dispatched! ID: ${data.ids?.[0] ?? "OK"}`);
        setTimeout(() => setStatus(null), 4000);
      },
      onError: (err) => {
        setStatus(`❌ Error: ${err.message}`);
      },
    });

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => triggerTask({ taskId: "test-task-123" })}
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Sending to Inngest...</span>
          </>
        ) : (
          <span>Trigger Inngest Run ⚡</span>
        )}
      </button>

      {status && (
        <span className="animate-fade-in text-xs font-medium text-zinc-300">
          {status}
        </span>
      )}
    </div>
  );
}
