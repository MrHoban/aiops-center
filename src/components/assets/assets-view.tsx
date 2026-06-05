"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  ipAddress: string | null;
  healthScore: number;
  operatingSystem: string | null;
}

export function AssetsView() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ items: Asset[]; total: number }>({
    queryKey: ["assets", search],
    queryFn: () =>
      fetch(`/api/assets?search=${encodeURIComponent(search)}`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create asset");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setOpen(false);
      toast.success("Asset created");
    },
    onError: () => toast.error("Failed to create asset"),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name") as string,
      type: form.get("type") as string,
      ipAddress: form.get("ipAddress") as string,
      operatingSystem: form.get("operatingSystem") as string,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} managed assets</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Asset</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
              <div>
                <Label>Type</Label>
                <Select name="type" defaultValue="SERVER">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SERVER", "WORKSTATION", "NETWORK_DEVICE", "CLOUD_RESOURCE", "APPLICATION", "VIRTUAL_MACHINE"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="ipAddress">IP Address</Label><Input id="ipAddress" name="ipAddress" /></div>
              <div><Label htmlFor="operatingSystem">OS</Label><Input id="operatingSystem" name="operatingSystem" /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>OS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No assets found</TableCell></TableRow>
            ) : (
              data?.items.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell><Badge variant="outline">{asset.type.replace("_", " ")}</Badge></TableCell>
                  <TableCell>{asset.status}</TableCell>
                  <TableCell className="font-mono text-sm">{asset.ipAddress ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={asset.healthScore < 70 ? "destructive" : "secondary"}>
                      {asset.healthScore}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{asset.operatingSystem ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
