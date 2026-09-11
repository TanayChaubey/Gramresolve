# GramResolve

AI-powered rural grievance redressal and Panchayat accountability platform.

## Vision

GramResolve helps villagers report local civic problems and helps Panchayats triage, assign, track, resolve, and verify those grievances through a transparent workflow.

## Core workflow

```text
Citizen report
      ↓
AI grievance understanding
(category • severity • department • duplicate signal)
      ↓
Panchayat dashboard
      ↓
Assignment + SLA tracking
      ↓
Resolution evidence
      ↓
Citizen verification
      ↓
Resolved / Reopened / Escalated
```

## Planned stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite for local development, with a clean path to PostgreSQL
- Authentication: JWT with role-based access
- AI layer: provider-agnostic service boundary
- Maps/media: designed for geotagged evidence and low-bandwidth use

## Repository structure

```text
gramresolve/
├── client/       # React web application
├── server/       # Express API
├── docs/         # Architecture and product documentation
└── .github/      # CI and repository configuration
```

## Development status

This repository is being built incrementally as a working hackathon MVP. Features are added as separate milestones so the implementation history remains understandable.

## Product principles

1. Rural-first UX and low-bandwidth tolerance.
2. Human-readable AI decisions rather than black-box labels.
3. Accountability through ownership, SLAs, and escalation.
4. Resolution must be supported by evidence and citizen verification.
5. Privacy-conscious handling of citizen data.
