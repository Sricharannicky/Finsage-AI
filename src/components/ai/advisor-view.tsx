"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Bot, Send, Sparkles, Trash2, Loader2, User, MessageCircle, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/constants";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/types";

const SUGGESTED_QUESTIONS = [
  "Can I afford an iPhone this month?",
  "Why am I overspending?",
  "How can I save ₹5000 every month?",
  "What should be my grocery budget?",
  "What expenses should I reduce?",
  "What will happen if my salary increases by 20%?",
  "Am I on track to reach my savings goals?",
  "How is my financial health compared to last month?",
];

export function AdvisorView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await api.get<{ messages: ChatMessage[] }>("/api/ai/chat");
      setMessages(res.messages);
    } catch (err: any) {
      toast.error(err.message || "Failed to load chat history");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);

    // Optimistic user message
    const tempUser: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: "",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const res = await api.post<{ response: string; messageId: string; createdAt: string }>("/api/ai/chat", { message: content });
      const assistantMsg: ChatMessage = {
        id: res.messageId,
        userId: "",
        role: "assistant",
        content: res.response,
        createdAt: res.createdAt,
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUser.id), assistantMsg]);
    } catch (err: any) {
      toast.error(err.message || "AI response failed");
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    try {
      await api.delete("/api/ai/chat");
      setMessages([]);
      toast.success("Chat history cleared");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear");
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <PageHeader
        title="AI Financial Advisor"
        subtitle="Ask anything about your finances — FinSage knows your data"
        icon={Bot}
        actions={
          messages.length > 0 ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={clearChat}>
              <Trash2 className="size-3.5" /> Clear
            </Button>
          ) : undefined
        }
      />

      <Card className="shadow-sm flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center shadow-md shadow-emerald-500/20 relative">
                <Bot className="size-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  FinSage AI
                  <Badge variant="outline" className="text-[10px] py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <Sparkles className="size-2.5 mr-0.5" /> Context-aware
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">Powered by your real financial data</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={loadMessages} title="Refresh">
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 min-h-0">
          <div ref={scrollRef} className="h-full overflow-y-auto scrollbar-thin p-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="size-10 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="size-16 rounded-2xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
                    <Bot className="size-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg">Hi! I'm FinSage, your AI financial advisor</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    I analyze your income, expenses, budgets, and goals to give you personalized financial advice. Ask me anything!
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => sendMessage(q)}
                      className="text-left p-3 rounded-xl border bg-card hover:bg-accent/50 hover:border-emerald-500/30 transition-all text-sm group"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="size-3.5 text-emerald-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span>{q}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-muted text-foreground"
                        : "gradient-emerald text-white shadow-md shadow-emerald-500/20"
                    }`}>
                      {msg.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                    </div>
                    <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="markdown-content">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <div className="size-8 rounded-lg gradient-emerald flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                      <Bot className="size-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 typing-dot" />
                      <span className="size-2 rounded-full bg-emerald-500 typing-dot" />
                      <span className="size-2 rounded-full bg-emerald-500 typing-dot" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </CardContent>

        {/* Input */}
        <div className="border-t p-3">
          {messages.length > 0 && messages.length <= 2 && (
            <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-thin pb-1">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs whitespace-nowrap px-2.5 py-1 rounded-full border bg-card hover:bg-accent hover:border-emerald-500/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask FinSage anything about your money..."
              className="h-11 flex-1"
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !input.trim()} className="h-11 px-4 gradient-emerald text-white border-0">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            FinSage analyzes your real data. Never provides investment guarantees. Always explains reasoning.
          </p>
        </div>
      </Card>
    </div>
  );
}
