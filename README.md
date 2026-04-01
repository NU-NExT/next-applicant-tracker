# NExT Applicant Tracking System

A webapp made by NExT for NExT (Please change this lol)

## Tech Stack
- frontend: React + TypeScript (Vite)
- backend: FastAPI (Python)
- local database: PostgreSQL
- file storage: LocalStack S3 (dev) and AWS S3 (prod)
- deployment targets: ECS + ALB + WAF + API Gateway + CloudWatch (Terraform)

## Quick Start
1. Copy `.env.example` to `.env`.
2. Run development profile:
   - `docker compose --profile dev up --build`
3. Open:
   - frontend: `http://localhost:3000`
   - backend docs: `http://localhost:8000/docs`
   - localstack endpoint: `http://localhost:4566`

### Dev Auth Without Personal AWS Accounts (Option A)
- LocalStack in this project is used for S3 only.
- Cognito should point to a shared team dev user pool in AWS.
- Set these values in `.env` (distributed by your team):
  - `COGNITO_USER_POOL_ID`
  - `COGNITO_APP_CLIENT_ID`
  - `COGNITO_APP_CLIENT_SECRET` (if your app client uses one)
  - `COGNITO_AWS_REGION`
  - `COGNITO_AWS_ACCESS_KEY_ID`
  - `COGNITO_AWS_SECRET_ACCESS_KEY`
  - `COGNITO_AWS_SESSION_TOKEN` (optional)
- Keep LocalStack credentials as:
  - `AWS_ACCESS_KEY_ID=test`
  - `AWS_SECRET_ACCESS_KEY=test`

## Production Start (Not yet available)
- `docker compose --profile prod up --build`
- Expects external values like `DATABASE_URL`, `AWS_*`, and `S3` buckets.
