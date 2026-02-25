# Backup and Restore Drill

## Objective
- Prove backups are restorable and RPO/RTO targets are met.

## Frequency
- Weekly restore drill in staging.
- Monthly full disaster simulation.

## Backup Policy
- PostgreSQL full backup: daily.
- WAL/incremental: every 15 minutes.
- Retention: 35 days hot, 180 days cold.

## Drill Procedure
1. Select latest backup artifact and verify checksum.
2. Restore into isolated staging database.
3. Run smoke checks:
   - tenant login
   - create sale
   - reports dashboard
4. Measure:
   - restore start and finish (UTC)
   - data currency gap (RPO)
5. Record evidence and sign-off.

## Minimum Acceptance Criteria
- Restore completed without manual SQL patching.
- RPO <= 15 minutes.
- RTO <= 60 minutes.
- No cross-tenant leakage after restore validation.
