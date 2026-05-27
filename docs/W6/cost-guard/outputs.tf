output "cost_guard_lambda_name" {
  description = "Name of the Cost Guard Lambda function."
  value       = aws_lambda_function.cost_guard.function_name
}

output "cost_guard_lambda_arn" {
  description = "ARN of the Cost Guard Lambda function."
  value       = aws_lambda_function.cost_guard.arn
}

output "cost_guard_role_name" {
  description = "Least-privilege IAM role used by the Cost Guard Lambda."
  value       = aws_iam_role.cost_guard_lambda.name
}

output "cost_guard_policy_arn" {
  description = "IAM policy that only grants logging, Describe/List, and Stop permissions required by the guard."
  value       = aws_iam_policy.cost_guard.arn
}

output "schedule_rule_name" {
  description = "EventBridge rule that invokes the Cost Guard Lambda."
  value       = aws_cloudwatch_event_rule.cost_guard_schedule.name
}
