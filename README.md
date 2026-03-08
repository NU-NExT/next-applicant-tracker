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

## Production Start (Not yet available)
- `docker compose --profile prod up --build`
- Expects external values like `DATABASE_URL`, `AWS_*`, and `S3` buckets.
