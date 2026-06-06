"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Cloud,
  Shield,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts";

interface DashboardData {
  alerts: {
    critical: number;
    warning: number;
    informational: number;
    recent: Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      asset?: { name: string } | null;
    }>;
  };
  deviceHealth: Array<{ id: string; name: string; healthScore: number; type: string }>;
  cloudStatus: Array<{ provider: string; status: string; _count: number }>;
  automationHistory: Array<{
    id: string;
    status: string;
    createdAt: string;
    automation: { name: string };
  }>;
  openIncidents: number;
  slaCompliance: number;
  riskSummary: string;
}

export function DashboardView() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const alertChartData = [
    { name: "Critical", count: data.alerts.critical, fill: "hsl(var(--destructive))" },
    { name: "Warning", count: data.alerts.warning, fill: "hsl(38 92% 50%)" },
    { name: "Info", count: data.alerts.informational, fill: "hsl(var(--primary))" },
  ];

  const healthChartData = data.deviceHealth.slice(0, 6).map((d) => ({
    name: d.name.slice(0, 12),
    score: d.healthScore,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
        <p className="text-muted-foreground">Real-time infrastructure health and AI insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Critical Alerts"
          value={data.alerts.critical}
          icon={AlertTriangle}
          variant="destructive"
        />
        <MetricCard title="Open Incidents" value={data.openIncidents} icon={Bell} />
        <MetricCard title="SLA Compliance" value={`${data.slaCompliance}%`} icon={Shield} />
        <MetricCard
          title="Automations (24h)"
          value={data.automationHistory.length}
          icon={Zap}
        />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            AI Risk Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{data.riskSummary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alert Distribution</CardTitle>
            <CardDescription>Active alerts by severity</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Alerts" } }} className="h-[200px] w-full">
              <BarChart data={alertChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Health Scores</CardTitle>
            <CardDescription>Lowest scoring assets</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ score: { label: "Health" } }} className="h-[200px] w-full">
              <AreaChart data={healthChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active alerts</p>
            ) : (
              data.alerts.recent.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.asset?.name ?? "No asset"}</p>
                  </div>
                  <Badge variant={alert.severity === "CRITICAL" ? "destructive" : "secondary"}>
                    {alert.severity}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Cloud & Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.cloudStatus.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{c.provider} — {c.status}</span>
                <Badge variant="outline">{c._count} resources</Badge>
              </div>
            ))}
            <Separator />
            {data.automationHistory.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{run.automation.name}</span>
                <Badge variant="outline">{run.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  variant,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "destructive";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === "destructive" ? "text-destructive" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Separator() {
  return <div className="my-2 h-px bg-border" />;
}
