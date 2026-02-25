# Incident Response Runbook

## Scope
- API and Web incidents related to data exposure, authentication abuse, malware, or service disruption.

## Severity Levels
- `SEV-1`: Data leak, active account takeover, ransomware, production unavailable.
- `SEV-2`: Suspicious access with partial impact, repeated auth abuse, critical dependency CVE.
- `SEV-3`: Low-impact anomaly with no confirmed breach.

## First 15 Minutes
1. Open incident channel and assign Incident Commander.
2. Freeze deploys to production.
3. Capture current context:
   - active alerts
   - affected tenants and routes
   - first-seen timestamp in UTC
4. Rotate high-risk secrets immediately:
   - `JWT_SECRET` (and move previous to `JWT_PREVIOUS_SECRETS` during grace period)
   - `RESEND_API_KEY`
5. Apply containment:
   - block offending IP ranges at edge/WAF
   - tighten throttling for affected endpoints

## Investigation
1. Query auth anomalies from logs:
   - failed login bursts
   - refresh token mismatches
   - CSRF validation failures
2. Validate tenant isolation:
   - test cross-tenant read/write for critical endpoints
3. Preserve forensic artifacts:
   - app logs
   - reverse proxy logs
   - DB snapshots

## Recovery
1. Patch and deploy fix with rollback plan.
2. Force session invalidation for impacted users:
   - increment `sessionVersion`.
3. Re-enable traffic gradually and monitor error/abuse metrics.

## Postmortem (within 72h)
1. Root cause and blast radius.
2. What controls failed or were missing.
3. Concrete actions with owners and deadlines.
