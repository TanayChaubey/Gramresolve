# Grievance API

Base path: `/api/grievances`

## Citizen

### POST `/`
Creates a grievance and automatically runs AI triage.

### PATCH `/:id/verify`
The reporting citizen verifies or rejects an official resolution.
```json
{
  "verified": true,
  "note": "The pipeline has been repaired and the water is flowing normally."
}
```
A verification changes the status to `resolved`; a rejection reopens the grievance and records the reason.

## Panchayat

### GET `/`
Lists visible grievances. Supports `status`, `severity`, and `category` filters. SLA state is refreshed on every read.

### PATCH `/:id/assign`
Assign a grievance to a worker and/or department. Assignment moves a new grievance into `assigned` status.

### PATCH `/:id/status`
Change workflow status. Optional `note` is added to the timeline.

### PATCH `/:id/resolve`
Submit a resolution note and optional evidence. The grievance enters `resolved` with `citizenVerification: pending` until the reporting citizen verifies it.

### PATCH `/:id/triage`
Override AI classification when an official disagrees.

## Accountability

Every assignment, status change, resolution submission and citizen verification is recorded in the grievance timeline. SLA state is `on_track`, `due_soon`, `overdue`, or `resolved`; overdue grievances are automatically escalated.
