# W6 Task 3 — Cost Guard Lambda & IAM Role

This folder implements the W6 automated cost-control Lambda.

## Acceptance criteria mapping

- Lambda scans EC2: `describe_instances` paginator in `lambda_function.py`.
- Lambda scans RDS: `describe_db_instances` paginator plus `list_tags_for_resource`.
- Lambda stops resources missing both approved runtime tags:
  - `keep=true`
  - `Environment=dev`
- IAM role is least-privilege for this task:
  - EC2/RDS inventory only: `ec2:DescribeInstances`, `rds:DescribeDBInstances`, `rds:ListTagsForResource`
  - Stop only: `ec2:StopInstances`, `rds:StopDBInstance`
  - CloudWatch Logs write permissions for Lambda execution logs
- EventBridge invokes the Lambda on a schedule so a real CloudTrail `StopInstances` or `StopDBInstance` event can be captured for the W6 evidence pack.

## Guard logic

A running resource is protected when either tag condition is true:

```text
keep=true OR Environment=dev
```

If neither condition is present, the Lambda calls the relevant stop API.

## Deploy

From this directory:

```bash
terraform init
terraform plan
terraform apply
```

For a fast classroom demo, temporarily override the schedule:

```bash
terraform apply -var='schedule_expression=rate(5 minutes)'
```

Return it to the daily schedule after collecting evidence:

```bash
terraform apply -var='schedule_expression=cron(0 18 * * ? *)'
```

## Evidence to capture for W6

1. Screenshot the IAM policy showing only Describe/List, Stop, and Logs permissions.
2. Create or use one EC2/RDS resource without `keep=true` and without `Environment=dev`.
3. Let the EventBridge rule invoke the Lambda.
4. Capture before/after state: running/available → stopping/stopped.
5. Capture CloudTrail event:
   - EC2: `StopInstances`
   - RDS: `StopDBInstance`
6. Add the screenshots and 1–2 line explanation to `docs/W6_evidence.md`.

## Safety

`dry_run` defaults to `false` because W6 acceptance requires a real Stop API event. For rehearsal only:

```bash
terraform apply -var='dry_run=true'
```
