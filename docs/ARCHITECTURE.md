# GramResolve Architecture

## Product roles

### Citizen
- Create a grievance with text, optional voice/media evidence, and location.
- See AI-understood category and urgency before submission.
- Track status, assigned authority, SLA, and resolution evidence.
- Verify a resolution or reopen the grievance.

### Panchayat
- View and filter incoming grievances.
- Review AI triage and override it when needed.
- Assign the responsible worker/department.
- Track SLA deadlines and escalations.
- Review resolution evidence and operational analytics.

## AI accountability layer

The AI layer is intentionally isolated behind backend services. It will eventually produce structured outputs such as:

```json
{
  "category": "water",
  "severity": "high",
  "department": "water_supply",
  "summary": "Community handpump is not working",
  "duplicateSignal": 0.12,
  "reasoning": "The report indicates loss of access to a shared drinking-water source."
}
```

AI suggestions are advisory. Panchayat users retain the ability to correct classification and assignment.

## Core state machine

`SUBMITTED → TRIAGED → ASSIGNED → IN_PROGRESS → RESOLUTION_PENDING → VERIFIED`

Alternative paths:

- `TRIAGED → ESCALATED`
- `IN_PROGRESS → ESCALATED`
- `RESOLUTION_PENDING → REOPENED → ASSIGNED`

## Planned data domains

- Users and roles
- Panchayats and departments
- Grievances
- Evidence/media
- Assignments and SLA events
- AI triage results
- Resolution attempts
- Citizen verification
- Audit events

## Rural-first constraints

- Low bandwidth and intermittent connectivity
- Mobile-first interaction
- Simple language and multilingual support
- Evidence capture that works on basic devices
- Clear status information instead of bureaucratic terminology
