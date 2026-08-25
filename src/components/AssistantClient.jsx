"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  Send,
  Square,
  RotateCcw,
  ArrowDown,
  ChefHat,
  ShoppingCart,
  TriangleAlert,
} from "lucide-react";

const SUGGESTIONS = [
  {
    Icon: ChefHat,
    label: "What can I cook?",
    prompt: "What can I cook with what I have right now?",
  },
  {
    Icon: ShoppingCart,
    label: "What should I buy?",
    prompt: "Based on my inventory and what's running low, what should I buy next?",
  },
  {
    Icon: TriangleAlert,
    label: "Running low",
    prompt: "Which items are running low and need restocking?",
  },
];

const SCROLL_THRESHOLD = 80;

export default function AssistantClient() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [nearBottom, setNearBottom] = useState(true);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const endRef = useRef(null);

  const hasMessages = messages.length > 0;

  // Auto-scroll only while the user is already near the bottom,
  // so reading history isn't interrupted by new tokens.
  useEffect(() => {
    if (nearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, streaming, nearBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setNearBottom(
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD,
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setNearBottom(true);
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setNearBottom(true);
  }, []);

  const send = useCallback(
    async (rawText) => {
      const question = (typeof rawText === "string" ? rawText : input).trim();
      if (!question || streaming) return;

      setInput("");
      requestAnimationFrame(resizeTextarea);

      const history = [...messages, { role: "user", content: question }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setStreaming(true);
      setNearBottom(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const setLast = (patch) =>
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            ...(typeof patch === "string" ? { content: patch } : patch),
          };
          return copy;
        });

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let msg = "Something went wrong. Please try again.";
          try {
            const data = await res.json();
            if (data?.error) msg = data.error;
          } catch {}
          setLast({ content: msg, error: true });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setLast(acc);
        }
        if (!acc.trim()) {
          setLast({ content: "(The assistant returned an empty answer.)" });
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setLast({ content: "Connection lost. Please try again.", error: true });
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [input, messages, streaming, resizeTextarea],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)]">
      {/* Chat header */}
      <div className="flex items-center gap-3 bg-white border rounded-xl px-3 py-2.5 mb-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">Assistant</p>
          <p className="text-xs text-zinc-400 truncate">
            Knows your inventory — cooking, buying & restocking
          </p>
        </div>
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon"
            onClick={newChat}
            disabled={streaming}
            aria-label="Start a new conversation"
            title="Start a new conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Conversation area */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-label="Conversation with the assistant"
          className="h-full overflow-y-auto flex flex-col gap-2.5 px-0.5 py-1"
        >
          {!hasMessages ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-bold">Your inventory assistant</h3>
              <p className="text-sm text-zinc-400 mt-1 mb-6 max-w-[16rem]">
                Ask about meals you can make, what to buy next, or what needs restocking.
              </p>
              <div className="grid gap-2 w-full max-w-xs">
                {SUGGESTIONS.map(({ Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => send(prompt)}
                    className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3 text-left
                               hover:border-green-400 hover:bg-green-50/50 transition-colors
                               focus-visible:outline-none focus-visible:border-green-500"
                  >
                    <Icon className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => {
              const isTyping =
                m.role === "assistant" && !m.content && streaming && i === messages.length - 1;
              return (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "self-end max-w-[85%] bg-green-600 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-sm whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-1 duration-200"
                      : `self-start max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                          m.error
                            ? "bg-red-50 border border-red-200 text-red-700"
                            : "bg-white border"
                        }`
                  }
                >
                  {isTyping ? <TypingDots /> : m.content}
                </div>
              );
            })
          )}
          <div ref={endRef} className="h-px" />
        </div>

        {/* Scroll-to-bottom affordance */}
        {hasMessages && !nearBottom && (
          <button
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            className="absolute bottom-3 right-2 w-8 h-8 rounded-full bg-white border shadow-md
                       flex items-center justify-center text-zinc-500 hover:text-zinc-700
                       transition-colors animate-in fade-in zoom-in duration-150"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="shrink-0 mt-3 flex items-end gap-2 bg-white border rounded-2xl p-1.5 shadow-sm
                   focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask about your inventory…"
          disabled={streaming}
          aria-label="Ask the AI assistant"
          className="border-0 rounded-xl min-h-9 max-h-[7.5rem] resize-none py-2 focus-visible:ring-0 focus-visible:border-0 bg-transparent"
        />
        {streaming ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={stop}
            aria-label="Stop generating"
            title="Stop generating"
            className="rounded-xl size-9 shrink-0"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            aria-label="Send message"
            title="Send message"
            className="rounded-xl size-9 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
