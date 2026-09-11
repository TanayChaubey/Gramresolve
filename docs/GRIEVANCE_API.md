# Grievance API

All grievance endpoints require a valid `Authorization: Bearer <token>` header.

## Create grievance

`POST /api/grievances`

```json
{
  "title": "Broken handpump near school",
  "description": "The public handpump has stopped working and residents have no nearby water source.",
  "category": "water",
  "location": {
    "latitude": 28.60,
    "longitude": 77.30,
    "address": "Near primary school"
  },
  "evidence": ["https://example.com/photo.jpg"]
}
```

## List grievances

`GET /api/grievances`

Optional query parameters: `status`, `category`.

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

Supported statuses: `submitted`, `under_review`, `assigned`, `in_progress`, `resolved`, `reopened`, `escalated`.
