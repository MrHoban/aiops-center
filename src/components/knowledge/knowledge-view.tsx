"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: { name: string | null };
  updatedAt: string;
}

export function KnowledgeView() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ items: Article[] }>({
    queryKey: ["knowledge", search],
    queryFn: () =>
      fetch(`/api/knowledge?q=${encodeURIComponent(search)}`).then((r) => r.json()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">Runbooks, SOPs, and troubleshooting guides with semantic search</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search knowledge base..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : data?.items.length === 0 ? (
          <p className="text-muted-foreground">No articles found</p>
        ) : (
          data?.items.map((article) => (
            <Card key={article.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{article.title}</CardTitle>
                  <Badge variant="outline">{article.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{article.content}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
