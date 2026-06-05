"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Automation {
  id: string;
  name: string;
  language: string;
  version: number;
  requiresApproval: boolean;
  isActive: boolean;
  runs: Array<{ status: string; createdAt: string }>;
}

export function AutomationsView() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ items: Automation[] }>({
    queryKey: ["automations"],
    queryFn: () => fetch("/api/automations").then((r) => r.json()),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/automations/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => {
        if (!r.ok) throw new Error("Execution failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation queued");
    },
    onError: () => toast.error("Execution failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation Center</h1>
        <p className="text-muted-foreground">PowerShell, Bash, and Python script execution</p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No automations</TableCell></TableRow>
            ) : (
              data?.items.map((auto) => (
                <TableRow key={auto.id}>
                  <TableCell className="font-medium">{auto.name}</TableCell>
                  <TableCell><Badge variant="outline">{auto.language}</Badge></TableCell>
                  <TableCell>v{auto.version}</TableCell>
                  <TableCell>{auto.requiresApproval ? "Required" : "Auto"}</TableCell>
                  <TableCell>{auto.runs[0]?.status ?? "Never"}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!auto.isActive || executeMutation.isPending}
                      onClick={() => executeMutation.mutate(auto.id)}
                    >
                      <Play className="mr-1 h-3 w-3" />Run
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
