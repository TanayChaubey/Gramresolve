# Grievance API

Base path: `/api/grievances`

## Citizen

### POST `/`
Creates a grievance and automatically runs AI triage.

Required body:
```json
{
  "title": "Broken water pipeline",
  "description": "A major leak is flooding the lane and families cannot get clean water.",
  "location": "Ward 4, near the government school",
  "panchayatId": "panchayat_..."
}
```

The response includes `category`, `severity`, `assignedDepartment`, `slaDueAt`, `sla`, `aiTriage`, and `timeline`.

## Panchayat

### GET `/`
Lists grievances visible to the authenticated user. Supports `status`, `severity`, and `category` filters. SLA state is refreshed on every read.

### PATCH `/:id/assign`
Assign a grievance to a worker and/or department:
```json
{
  "assignedTo": "worker-12",
  "department": "Water & Sanitation"
}
```

An assignment moves a new grievance into `assigned` status.

### PATCH `/:id/status`
Change workflow status. Supported statuses include `assigned`, `in_progress`, `resolved`, `reopened`, and `escalated`. Optional `note` is added to the timeline.

### PATCH `/:id/triage`
Override AI classification when an official disagrees:
```json
{
  "category": "water",
  "severity": "high",
  "department": "Water & Sanitation",
  "reason": "The contamination risk is higher than the initial assessment."
}
```

## Accountability

Every assignment and status change is added to the grievance timeline. SLA state is `on_track`, `due_soon`, `overdue`, or `resolved`. A read that finds a grievance more than 15 minutes past its SLA automatically changes it to `escalated` and records the escalation event.
