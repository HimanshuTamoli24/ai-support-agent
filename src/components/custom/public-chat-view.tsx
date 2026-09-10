"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

interface ChatMessage {
  id: string;
  sender: "USER" | "AGENT";
  text: string;
  createdAt: Date;
  intent?: string;
  shouldEscalate?: boolean;
  escalationReason?: string | null;
  evidence?: Array<{
    messageId: string;
    text: string;
    role: "CUSTOMER" | "BRAND";
    relevanceScore: number;
    reason: string;
  }>;
  latencyMs?: number;
}

export function PublicChatView({ brandId }: { brandId: string }) {
  const [inputMessage, setInputMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: brand, isLoading: isBrandLoading } =
    api.agent.getBrandById.useQuery({ brandId }, { retry: false });

  const runAgentMutation = api.agent.runAgent.useMutation({
    onSuccess: (data) => {
      const agentMsg: ChatMessage = {
        id: data.id,
        sender: "AGENT",
        text:
          data.draftReply ??
          "Thank you for reaching out. How else can I assist you?",
        createdAt: new Date(),
        intent: data.predictedIntentName,
        shouldEscalate: data.shouldEscalate,
        escalationReason: data.escalationReason,
        evidence: data.evidence,
        latencyMs: data.latencyMs,
      };

      setMessages((prev) => [...prev, agentMsg]);
    },
    onError: (err) => {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "AGENT",
        text: `Sorry, an error occurred while generating a response: ${err.message}`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, runAgentMutation.isPending]);

  // Initial welcome message
  useEffect(() => {
    if (brand && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "AGENT",
          text: `Hello! 👋 Welcome to ${brand.name} Customer Support. How can I assist you today?`,
          createdAt: new Date(),
        },
      ]);
    }
  }, [brand, messages.length]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend ?? inputMessage;
    if (!text.trim() || runAgentMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "USER",
      text: text.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");

    runAgentMutation.mutate({
      inputText: text.trim(),
      brandId,
      conversationId,
    });
  };

  if (isBrandLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm">Connecting to Brand Support Agent...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-300">
        <h1 className="text-2xl font-bold text-red-400">Brand Not Found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          The support agent for brand ID{" "}
          <code className="text-zinc-200">{brandId}</code> does not exist.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col bg-zinc-950 text-zinc-100">
      {/* Background glow */}
      <div className="pointer-events-none fixed -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[140px]" />

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white shadow-md shadow-blue-500/20">
            {brand.name[0]?.toUpperCase() ?? "B"}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
              {brand.name} Support Agent
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[11px] text-zinc-400">
                Live AI Copilot • Powered by Pinecone Vector Search
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
        >
          Brand Admin Dashboard
        </Link>
      </header>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "USER" ? "items-end" : "items-start"
              }`}
            >
              <div className="mb-1 text-[10px] text-zinc-500">
                {msg.sender === "USER" ? "You" : `${brand.name} AI Agent`} •{" "}
                {msg.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <div
                className={`relative max-w-[85%] rounded-2xl p-4 text-sm sm:max-w-[75%] ${
                  msg.sender === "USER"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10"
                    : "border border-zinc-800 bg-zinc-900/90 text-zinc-200 shadow-lg backdrop-blur-md"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </p>

                {/* Intent & Escalation Tag */}
                {msg.sender === "AGENT" &&
                  (msg.intent || msg.shouldEscalate) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-2.5">
                      {msg.intent && (
                        <span className="rounded-md border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                          Intent: {msg.intent}
                        </span>
                      )}

                      {msg.shouldEscalate && (
                        <span className="rounded-md border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                          🚨 Escalated to Human Team
                        </span>
                      )}

                      {msg.latencyMs && (
                        <span className="text-[10px] text-zinc-500">
                          ⚡ {msg.latencyMs}ms
                        </span>
                      )}
                    </div>
                  )}

                {/* Escalation note */}
                {msg.escalationReason && (
                  <p className="mt-2 text-xs text-amber-300">
                    <strong>Escalation reason:</strong> {msg.escalationReason}
                  </p>
                )}

                {/* Retrieved Pinecone Evidence Accordion */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <details className="mt-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-xs">
                    <summary className="cursor-pointer font-medium text-zinc-400 hover:text-zinc-200">
                      📚 Referenced Evidence ({msg.evidence.length} historical
                      tweets)
                    </summary>
                    <div className="mt-2 space-y-2 border-t border-zinc-800/60 pt-2">
                      {msg.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-zinc-800/60 bg-zinc-900/80 p-2 text-[11px]"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className={`rounded px-1.5 py-0.5 font-bold ${
                                ev.role === "BRAND"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-blue-500/20 text-blue-300"
                              }`}
                            >
                              {ev.role}
                            </span>
                            <span className="font-mono text-emerald-400">
                              {(ev.relevanceScore * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <p className="text-zinc-300 italic">"{ev.text}"</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}

          {/* Thinking / Searching Loader */}
          {runAgentMutation.isPending && (
            <div className="flex flex-col items-start">
              <div className="mb-1 text-[10px] text-zinc-500">
                {brand.name} AI Agent is researching...
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-xs text-zinc-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span>
                  Searching Pinecone historical knowledge & formulating
                  response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Quick Prompts (if chat is short) */}
      {messages.length <= 2 && (
        <div className="border-t border-zinc-800/40 bg-zinc-950/40 px-6 py-2">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <span className="text-[11px] text-zinc-500">Suggested:</span>
            {[
              "My battery is draining quickly after update",
              "Flight got cancelled, need refund",
              "How to reset account password?",
            ].map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(suggestion)}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-zinc-800/80 bg-zinc-950/90 p-4 backdrop-blur-xl sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="mx-auto flex max-w-3xl items-center gap-3"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask ${brand.name} support anything...`}
            disabled={runAgentMutation.isPending}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={runAgentMutation.isPending || !inputMessage.trim()}
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
