# AIOps Center — API Reference

Base URL: `/api`  
Authentication: Session cookie (Auth.js) on all endpoints except `/api/auth/*`

## Authentication

### POST `/api/auth/register`

Register a new organization and administrator account.

```json
{
  "email": "admin@company.com",
  "password": "securepassword",
  "name": "Admin User",
  "organizationName": "Acme MSP"
}
```

### POST `/api/auth/[...nextauth]`

Auth.js credential sign-in. Use the `/login` page or `signIn("credentials", ...)`.

---

## Dashboard

### GET `/api/dashboard`

**Permission:** `dashboard:read`

Returns aggregated metrics: alerts, device health, cloud status, automation history, SLA compliance, AI risk summary.

---

## Assets

### GET `/api/assets`

**Permission:** `assets:read`

Query params: `page`, `limit`, `search`, `type`

### POST `/api/assets`

**Permission:** `assets:write`

```json
{
  "name": "DC-01",
  "type": "SERVER",
  "ipAddress": "10.0.1.10",
  "operatingSystem": "Windows Server 2022",
  "healthScore": 95
}
```

### GET `/api/assets/:id`

**Permission:** `assets:read`

### PATCH `/api/assets/:id`

**Permission:** `assets:write`

### DELETE `/api/assets/:id`

**Permission:** `assets:delete`

---

## Alerts

### GET `/api/alerts`

**Permission:** `alerts:read`

Query params: `page`, `limit`, `severity`, `status`

### POST `/api/alerts`

**Permission:** `alerts:write`

```json
{
  "title": "Disk space critical",
  "description": "C: drive at 94%",
  "severity": "CRITICAL",
  "source": "MANUAL",
  "assetId": "clx..."
}
```

### GET `/api/alerts/:id`

**Permission:** `alerts:read`

### PATCH `/api/alerts/:id`

**Permission:** `alerts:write`

Actions: `acknowledge`, `suppress`, `resolve`, `escalate`

```json
{ "action": "acknowledge" }
```

```json
{ "action": "suppress", "suppressMinutes": 60 }
```

---

## Automations

### GET `/api/automations`

**Permission:** `automations:read`

### POST `/api/automations`

**Permission:** `automations:write`

```json
{
  "name": "Clear Temp Files",
  "language": "POWERSHELL",
  "script": "Get-ChildItem $env:TEMP | Remove-Item -Force",
  "requiresApproval": false
}
```

### POST `/api/automations/:id/execute`

**Permission:** `automations:execute`

```json
{ "parameters": { "DaysOld": 7 } }
```

---

## Knowledge Base

### GET `/api/knowledge`

**Permission:** `knowledge:read`

Query params: `q`, `category`, `page`, `limit`

### POST `/api/knowledge`

**Permission:** `knowledge:write`

```json
{
  "title": "Disk Remediation Runbook",
  "content": "Step-by-step instructions...",
  "category": "RUNBOOK",
  "tags": ["disk", "windows"]
}
```

---

## Cloud Resources

### GET `/api/cloud`

**Permission:** `cloud:read`

### POST `/api/cloud`

**Permission:** `cloud:write`

Upserts a cloud resource by provider + resourceId.

---

## Reports

### GET `/api/reports`

**Permission:** `reports:read`

### POST `/api/reports`

**Permission:** `reports:generate`

```json
{
  "name": "Q2 Asset Report",
  "type": "ASSET",
  "format": "CSV"
}
```

Types: `ASSET`, `COMPLIANCE`, `ALERT`, `EXECUTIVE`  
Formats: `PDF`, `CSV`, `EXCEL`

---

## AI Assistant

### GET `/api/ai/chat`

**Permission:** `ai:use`

Returns conversation history for the current user.

### POST `/api/ai/chat`

**Permission:** `ai:use`

```json
{
  "message": "Explain the critical alert on DC-01",
  "conversationId": "optional-existing-id",
  "context": { "alertId": "clx..." }
}
```

Response includes assistant message and knowledge base citations.

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 401 | Not authenticated |
| 403 | Missing RBAC permission |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, etc.) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Rate Limiting

Default: 100 requests per minute per IP. Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.
