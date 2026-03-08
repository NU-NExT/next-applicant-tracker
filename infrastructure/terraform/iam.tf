data "aws_iam_policy_document" "ecs_task_execution_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name               = "${local.name_prefix}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_assume_role.json
  tags               = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name               = "${local.name_prefix}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_assume_role.json
  tags               = local.common_tags
}

data "aws_iam_policy_document" "ecs_app_s3_policy_doc" {
  statement {
    sid = "S3AppAccess"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:DeleteObject"
    ]
    resources = [
      aws_s3_bucket.resumes.arn,
      "${aws_s3_bucket.resumes.arn}/*",
      aws_s3_bucket.transcripts.arn,
      "${aws_s3_bucket.transcripts.arn}/*",
      aws_s3_bucket.files.arn,
      "${aws_s3_bucket.files.arn}/*"
    ]
  }
}

resource "aws_iam_policy" "ecs_app_s3_policy" {
  name   = "${local.name_prefix}-ecs-app-s3-policy"
  policy = data.aws_iam_policy_document.ecs_app_s3_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_s3_policy_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_app_s3_policy.arn
}

