import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo MSP",
      slug: "demo-org",
    },
  });

  const adminPassword = hashPassword("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.aiops.local" },
    update: {},
    create: {
      email: "admin@demo.aiops.local",
      name: "Demo Administrator",
      passwordHash: adminPassword,
      role: "ADMINISTRATOR",
      organizationId: org.id,
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: "engineer@demo.aiops.local" },
    update: {},
    create: {
      email: "engineer@demo.aiops.local",
      name: "Demo Engineer",
      passwordHash: hashPassword("Engineer123!"),
      role: "ENGINEER",
      organizationId: org.id,
    },
  });

  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        organizationId: org.id,
        name: "DC-01",
        type: "SERVER",
        status: "ACTIVE",
        ipAddress: "10.0.1.10",
        hostname: "dc-01.demo.local",
        operatingSystem: "Windows Server 2022",
        ownerId: admin.id,
        healthScore: 92,
        serialNumber: "SN-DC-001",
      },
    }),
    prisma.asset.create({
      data: {
        organizationId: org.id,
        name: "WS-Finance-01",
        type: "WORKSTATION",
        status: "ACTIVE",
        ipAddress: "10.0.2.45",
        operatingSystem: "Windows 11",
        ownerId: engineer.id,
        healthScore: 68,
      },
    }),
    prisma.asset.create({
      data: {
        organizationId: org.id,
        name: "Core-Switch-01",
        type: "NETWORK_DEVICE",
        status: "ACTIVE",
        ipAddress: "10.0.0.1",
        healthScore: 85,
      },
    }),
  ]);

  await prisma.alert.createMany({
    data: [
      {
        organizationId: org.id,
        title: "Disk space critical on DC-01",
        description: "C: drive at 94% capacity. Immediate cleanup required.",
        severity: "CRITICAL",
        status: "OPEN",
        source: "SCHEDULED",
        assetId: assets[0].id,
        createdById: admin.id,
      },
      {
        organizationId: org.id,
        title: "High CPU on WS-Finance-01",
        description: "Sustained CPU usage above 90% for 15 minutes.",
        severity: "WARNING",
        status: "OPEN",
        source: "API",
        assetId: assets[1].id,
      },
      {
        organizationId: org.id,
        title: "Scheduled maintenance window",
        description: "Patch Tuesday maintenance scheduled for tonight.",
        severity: "INFORMATIONAL",
        status: "OPEN",
        source: "MANUAL",
        createdById: admin.id,
      },
    ],
  });

  const automation = await prisma.automation.create({
    data: {
      organizationId: org.id,
      name: "Clear Temp Files",
      description: "Removes temp files older than 7 days",
      language: "POWERSHELL",
      script: `# Clear temp files\nGet-ChildItem $env:TEMP -Recurse | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force -Recurse`,
      createdById: admin.id,
      parameters: [{ name: "DaysOld", type: "number", required: false, default: 7 }],
    },
  });

  await prisma.automationVersion.create({
    data: {
      automationId: automation.id,
      version: 1,
      script: automation.script,
      parameters: automation.parameters as object,
      changelog: "Initial version",
    },
  });

  await prisma.knowledgeArticle.createMany({
    data: [
      {
        organizationId: org.id,
        title: "Disk Space Remediation Runbook",
        content: "1. Identify largest folders using WinDirStat\n2. Clear Windows Update cache\n3. Move logs to archive storage\n4. Expand volume if needed",
        category: "RUNBOOK",
        tags: ["disk", "windows", "remediation"],
        authorId: admin.id,
      },
      {
        organizationId: org.id,
        title: "High CPU Troubleshooting SOP",
        content: "1. Check Task Manager for top processes\n2. Review Event Viewer for errors\n3. Scan for malware\n4. Restart problematic services",
        category: "SOP",
        tags: ["cpu", "performance"],
        authorId: engineer.id,
      },
    ],
  });

  await prisma.cloudResource.createMany({
    data: [
      {
        organizationId: org.id,
        provider: "AZURE",
        resourceId: "/subscriptions/demo/resourceGroups/prod/providers/Microsoft.Compute/virtualMachines/web-01",
        name: "web-01",
        resourceType: "Microsoft.Compute/virtualMachines",
        region: "eastus",
        status: "running",
        monthlyCost: 145.5,
        securityFindings: [{ severity: "medium", title: "NSG allows RDP from internet" }],
      },
      {
        organizationId: org.id,
        provider: "AWS",
        resourceId: "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123",
        name: "api-server-prod",
        resourceType: "ec2:instance",
        region: "us-east-1",
        status: "running",
        monthlyCost: 89.0,
      },
    ],
  });

  await prisma.escalationPolicy.create({
    data: {
      organizationId: org.id,
      name: "Critical Alert Escalation",
      description: "Escalate critical alerts after 30 minutes",
      steps: [
        { delayMinutes: 0, action: "notify", target: "on-call" },
        { delayMinutes: 30, action: "escalate", target: "manager" },
        { delayMinutes: 60, action: "escalate", target: "director" },
      ],
    },
  });

  console.log("Seed complete:");
  console.log("  Admin: admin@demo.aiops.local / Admin123!");
  console.log("  Engineer: engineer@demo.aiops.local / Engineer123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
