"use client";

import { useQuery } from "@tanstack/react-query";
import { Cloud, DollarSign, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CloudResource {
  id: string;
  provider: string;
  name: string;
  resourceType: string;
  region: string | null;
  status: string;
  monthlyCost: string | null;
}

export function CloudView() {
  const { data, isLoading } = useQuery<{
    items: CloudResource[];
    costSummary: Array<{ provider: string; _sum: { monthlyCost: string | null }; _count: number }>;
    securityFindingsCount: number;
  }>({
    queryKey: ["cloud"],
    queryFn: () => fetch("/api/cloud").then((r) => r.json()),
  });

  const totalCost = data?.costSummary.reduce(
    (sum, c) => sum + Number(c._sum.monthlyCost ?? 0),
    0,
  ) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cloud Management</h1>
        <p className="text-muted-foreground">Azure, AWS, and GCP resource inventory</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Cloud className="h-4 w-4" />Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.items.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />Monthly Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCost.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />Security Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.securityFindingsCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost/mo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No cloud resources synced</TableCell></TableRow>
            ) : (
              data?.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline">{r.provider}</Badge></TableCell>
                  <TableCell>{r.resourceType}</TableCell>
                  <TableCell>{r.region ?? "—"}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>${Number(r.monthlyCost ?? 0).toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
