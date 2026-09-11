# Grievance API

All grievance endpoints require a valid `Authorization: Bearer <token>` header.

## Create grievance

`POST /api/grievances`

```json
{
  "title": "Broken handpump near school",
  "description": "The public handpump has stopped working and residents have no nearby water source.",
  "panchayatId": "pan_example",
  "location": {
    "latitude": 28.60,
    "longitude": 77.30,
    "address": "Near primary school"
  },
  "evidence": ["https://example.com/photo.jpg"]
}
```

The backend automatically produces category, severity, responsible department, summary and duplicate signals through the GramResolve triage engine. The AI result is advisory and can be overridden by an authorized Panchayat official.

## List grievances

`GET /api/grievances`

Optional query parameters: `status`, `category`, `severity`.

Citizens only see their own grievances. Officials only see grievances belonging to their Panchayat.

## Get one grievance

`GET /api/grievances/:id`

## Update status

`PATCH /api/grievances/:id/status`

```json
{
  "status": "in_progress",
  "note": "Repair team assigned to inspect the handpump."
}
```

## Override AI triage

`PATCH /api/grievances/:id/triage`

```json
{
  "category": "water",
  "severity": "high",
  "department": "Water & Sanitation"
}
```

Supported statuses: `submitted`, `under_review`, `assigned`, `in_progress`, `resolved`, `reopened`, `escalated`.
