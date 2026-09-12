const SLA_GRACE_MS = 1000 * 60 * 15;

export function getSlaState(grievance, now = Date.now()) {
  if (grievance.status === 'resolved') return { state: 'resolved', overdue: false, remainingMs: 0 };
  const due = new Date(grievance.slaDueAt).getTime();
  const remainingMs = due - now;
  if (remainingMs < -SLA_GRACE_MS) return { state: 'overdue', overdue: true, remainingMs };
  if (remainingMs <= 1000 * 60 * 60 * 6) return { state: 'due_soon', overdue: false, remainingMs };
  return { state: 'on_track', overdue: false, remainingMs };
}

export function applySlaCheck(grievance, now = Date.now()) {
  const sla = getSlaState(grievance, now);
  if (sla.overdue && grievance.status !== 'escalated') {
    grievance.status = 'escalated';
    grievance.updatedAt = new Date(now).toISOString();
    grievance.timeline ??= [];
    grievance.timeline.push({
      id: `event_${now}`,
      type: 'sla_escalation',
      message: 'SLA breached — grievance automatically escalated for Panchayat review',
      actor: 'system',
      createdAt: new Date(now).toISOString(),
    });
  }
  return sla;
}
