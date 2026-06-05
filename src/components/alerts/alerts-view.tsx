"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  title: string;
  severity: string;
  status: string;
  source: string;
  createdAt: string;
  asset?: { name: string } | null;
}

const severityVariant = (s: string) =>
  s === "CRITICAL" ? "destructive" : s === "WARNING" ? "secondary" : "outline";

export function AlertsView() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ items: Alert[] }>({
    queryKey: ["alerts"],
    queryFn: () => fetch("/api/alerts").then((r) => r.json()),
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert acknowledged");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert resolved");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alert Management</h1>
        <p className="text-muted-foreground">Monitor, acknowledge, and resolve infrastructure alerts</p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No alerts</TableCell></TableRow>
            ) : (
              data?.items.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {alert.severity === "CRITICAL" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      <span className="font-medium">{alert.title}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge></TableCell>
                  <TableCell>{alert.status}</TableCell>
                  <TableCell>{alert.asset?.name ?? "—"}</TableCell>
                  <TableCell>{alert.source}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {alert.status === "OPEN" && (
                        <Button size="sm" variant="outline" onClick={() => ackMutation.mutate(alert.id)}>
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      {["OPEN", "ACKNOWLEDGED"].includes(alert.status) && (
                        <Button size="sm" variant="ghost" onClick={() => resolveMutation.mutate(alert.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
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
