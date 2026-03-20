terraform {
  backend "s3" {
    bucket         = "next-ats-terraform-state-staging"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    use_lockfile   = true
    encrypt        = true
  }
}