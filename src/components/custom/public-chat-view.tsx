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
          text: `Hello! 👋 Welcome to ${brand.name} Support. How can I help you today?`,
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
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FB] text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium">Connecting to {brandId} Support Agent...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F6FB] px-4 text-center text-slate-800">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm max-w-md">
          <h1 className="text-xl font-bold text-red-600">Brand Not Found</h1>
          <p className="mt-2 text-xs text-slate-500">
            The support agent for brand ID{" "}
            <code className="text-blue-600 font-mono font-semibold">{brandId}</code> does not exist.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#F4F6FB] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm">
            {brand.name[0]?.toUpperCase() ?? "B"}
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 sm:text-base">
              {brand.name} Support Agent
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500">
                Grounded Pinecone Precedent Intelligence
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          ← Dashboard
        </Link>
      </header>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "USER" ? "items-end" : "items-start"
              }`}
            >
              <div className="mb-1 text-[10px] text-slate-400">
                {msg.sender === "USER" ? "You" : `${brand.name} AI Agent`} •{" "}
                {msg.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <div
                className={`relative max-w-[85%] rounded-3xl p-4 text-xs sm:text-sm shadow-sm ${
                  msg.sender === "USER"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap font-normal">
                  {msg.text}
                </p>

                {/* Intent & Escalation Tag */}
                {msg.sender === "AGENT" &&
                  (msg.intent || msg.shouldEscalate) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                      {msg.intent && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                          Intent: {msg.intent}
                        </span>
                      )}

                      {msg.shouldEscalate && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                          🚨 Escalated to Human Team
                        </span>
                      )}

                      {msg.latencyMs && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ⚡ {msg.latencyMs}ms
                        </span>
                      )}
                    </div>
                  )}

                {/* Escalation note */}
                {msg.escalationReason && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-100">
                    <strong>Escalation reason:</strong> {msg.escalationReason}
                  </p>
                )}

                {/* Retrieved Pinecone Evidence Accordion */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <details className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                    <summary className="cursor-pointer font-bold text-slate-600 hover:text-slate-900">
                      📚 Referenced Precedents ({msg.evidence.length} historical records)
                    </summary>
                    <div className="mt-2 space-y-2 border-t border-slate-200/60 pt-2">
                      {msg.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-slate-200 bg-white p-2.5 text-[11px]"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className={`rounded px-1.5 py-0.5 font-bold ${
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
                          <p className="text-slate-600 italic">"{ev.text}"</p>
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
              <div className="mb-1 text-[10px] text-slate-400">
                {brand.name} Agent is analyzing...
              </div>
              <div className="flex items-center gap-2.5 rounded-3xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 shadow-sm">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span>
                  Searching vector precedents & formulating grounded response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Quick Prompts (if chat is short) */}
      {messages.length <= 2 && (
        <div className="border-t border-slate-200/60 bg-white/60 px-6 py-2">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Quick ask:</span>
            {[
              "Where is my package? Tracking link says pending",
              "I need to return an item, what is the policy?",
              "My app crashes on login page after update",
            ].map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(suggestion)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-blue-300 hover:text-blue-600 shadow-2xs"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-200/80 bg-white p-3.5 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="mx-auto flex max-w-3xl items-center gap-2.5"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask ${brand.name} support anything...`}
            disabled={runAgentMutation.isPending}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={runAgentMutation.isPending || !inputMessage.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
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
