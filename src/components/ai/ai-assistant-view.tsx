"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  role: string;
  content: string;
  citations?: Array<{ id: string; title: string; category: string; score: number }>;
}

interface ChatResponse {
  conversationId: string;
  message: Message;
  citations: Array<{ id: string; title: string; category: string; score: number }>;
}

export function AIAssistantView() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: () => fetch("/api/ai/chat").then((r) => r.json()),
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      }).then((r) => {
        if (!r.ok) throw new Error("Chat failed");
        return r.json() as Promise<ChatResponse>;
      }),
    onSuccess: (data, message) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "USER", content: message },
        data.message,
      ]);
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input.trim());
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="hidden w-64 shrink-0 flex-col gap-2 md:flex">
        <h2 className="text-sm font-semibold text-muted-foreground">Conversations</h2>
        <ScrollArea className="flex-1">
          {conversations?.items?.map((c: { id: string; title: string }) => (
            <button
              key={c.id}
              className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${conversationId === c.id ? "bg-muted" : ""}`}
              onClick={() => setConversationId(c.id)}
            >
              {c.title}
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col rounded-lg border">
        <div className="border-b px-4 py-3">
          <h1 className="flex items-center gap-2 font-semibold">
            <Bot className="h-5 w-5 text-primary" />
            AIOps Assistant
          </h1>
          <p className="text-xs text-muted-foreground">
            Explain alerts, recommend remediation, generate scripts
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Bot className="h-12 w-12 opacity-30" />
              <p className="text-sm">Ask about alerts, assets, or request a remediation script</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "USER" ? "justify-end" : ""}`}>
                  {msg.role !== "USER" && <Bot className="mt-1 h-6 w-6 shrink-0 text-primary" />}
                  <Card className={`max-w-[80%] p-3 ${msg.role === "USER" ? "bg-primary text-primary-foreground" : ""}`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        <p className="text-xs font-medium opacity-70">Sources</p>
                        {msg.citations.map((c) => (
                          <Badge key={c.id} variant="outline" className="mr-1 text-xs">
                            {c.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                  {msg.role === "USER" && <User className="mt-1 h-6 w-6 shrink-0" />}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask the AI assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              className="resize-none"
            />
            <Button onClick={handleSend} disabled={chatMutation.isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
