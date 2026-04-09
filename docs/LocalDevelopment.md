# Local Development

Quick start guide for setting up the NExT Applicant Tracker locally.

---

## 1. Prerequisites

Install the following before starting:

| Tool                    | Version | Purpose                                         |
| ----------------------- | ------- | ----------------------------------------------- |
| Docker + Docker Compose | Latest  | Runs all services                               |
| Git                     | Any     | Source control                                  |
| Node.js                 | 18+     | Frontend dev (if running outside Docker)        |
| Python                  | 3.12    | Backend dev (if running outside Docker)         |
| AWS CLI                 | v2      | Interacting with LocalStack and staging Cognito |

The entire application — frontend, backend, database, and S3 mock — runs inside Docker. Node.js and Python are only needed if you plan to run services outside of Docker.

---

## 2. Cognito Setup (do this first)

Local development uses real AWS Cognito for authentication. There is no local mock for auth. You need credentials from the existing staging Cognito user pool before the login flow will work.

### 2.1 What you need from AWS

The following five values must be obtained from the team before starting:

| `.env` key                  | Description                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `COGNITO_USER_POOL_ID`      | User pool ID (format: `us-east-1_XXXXXXXXX`)                                                                                      |
| `COGNITO_APP_CLIENT_ID`     | App client ID                                                                                                                     |
| `COGNITO_APP_CLIENT_SECRET` | App client secret                                                                                                                 |
| `VITE_COGNITO_DOMAIN`       | Cognito hosted UI domain — host only, no `https://` (e.g. `application-tracker-dev-auth-abc123.auth.us-east-1.amazoncognito.com`) |
| `VITE_COGNITO_CLIENT_ID`    | Same value as `COGNITO_APP_CLIENT_ID`                                                                                             |

### 2.2 Callback URL requirement

Cognito's hosted UI will reject the login redirect unless `http://localhost:3000/login` is registered as an allowed callback URL on the app client. This URL is already included in the Terraform default for `cognito_callback_urls`, so it should be present on the staging app client.

If you are running the frontend on a different port, you need to add your URL manually: **AWS Console → Cognito → User Pools → [pool] → App clients → [client] → Hosted UI → Edit → Allowed callback URLs**.

### 2.3 Getting a local admin account

Admin accounts cannot be self-registered. The `/api/auth/register-applicant` endpoint only creates candidate accounts. To get an admin account:

- Ask an existing admin to create your account via the platform's admin user management interface, **or**
- Have someone with AWS console access create your user directly in Cognito and add them to the `ADMIN` group: **AWS Console → Cognito → User Pools → [pool] → Users → Create user**, then **Groups → ADMIN → Add user**.

---

## 3. Environment Setup

**1. Clone the repository**

```bash
git clone <repo-url>
cd next-applicant-tracker
```

**2. Create your `.env` file**

```bash
cp .env.example .env
```

**3. Fill in the Cognito values**

Open `.env` and set the five values from Section 2.1. Everything else is pre-configured for local development:

| Variable                                     | Action                                             |
| -------------------------------------------- | -------------------------------------------------- |
| `COGNITO_USER_POOL_ID`                       | **Fill in** — from staging Cognito                 |
| `COGNITO_APP_CLIENT_ID`                      | **Fill in** — from staging Cognito                 |
| `COGNITO_APP_CLIENT_SECRET`                  | **Fill in** — from staging Cognito                 |
| `VITE_COGNITO_DOMAIN`                        | **Fill in** — hosted UI domain, no `https://`      |
| `VITE_COGNITO_CLIENT_ID`                     | **Fill in** — same as `COGNITO_APP_CLIENT_ID`      |
| `ENVIRONMENT`                                | Pre-filled (`development`)                         |
| `AWS_REGION`                                 | Pre-filled (`us-east-1`)                           |
| `POSTGRES_USER/PASSWORD/DB`, `DB_PORT`       | Pre-filled — local Postgres defaults               |
| `BACKEND_PORT`, `FRONTEND_PORT`              | Pre-filled (`8000`, `3000`)                        |
| `STORAGE_BACKEND`                            | Pre-filled (`s3`) — routes to LocalStack in dev    |
| `S3_ENDPOINT_URL`                            | Pre-filled (`http://localstack:4566`)              |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Pre-filled (`test`) — LocalStack accepts any value |
| `VITE_API_BASE_URL`                          | Pre-filled (`http://localhost:8000`)               |
| `VITE_COGNITO_REDIRECT_URI`                  | Pre-filled (`http://localhost:3000/login`)         |
| `COGNITO_ADMIN_GROUP_NAME`                   | Leave as `ADMIN` unless changed in staging         |

---

## 4. Starting the Application

```bash
docker compose --profile dev up --build
```

Docker Compose starts five services in dependency order:

| Service                 | URL                                                              | Notes                                                          |
| ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `db` (PostgreSQL 15)    | `localhost:5432`                                                 | Waits until healthy before backend starts                      |
| `localstack` (S3 mock)  | `http://localhost:4566`                                          | Waits until healthy before backend starts                      |
| `localstack-init`       | —                                                                | Runs once to create the three S3 buckets, then exits           |
| `backend-dev` (FastAPI) | `http://localhost:8000` · API docs: `http://localhost:8000/docs` | Starts after db, localstack, and localstack-init are all ready |
| `frontend-dev` (Vite)   | `http://localhost:3000`                                          | Starts after backend-dev                                       |

**Migrations do not run automatically.** After the first `up`, run migrations manually:

```bash
docker compose exec backend-dev alembic upgrade head
```

You must re-run this command any time new migrations are added.

---

## 5. Verifying the Setup

After startup, run through this checklist:

- [ ] **Backend health**: `curl http://localhost:8000/health` returns `200 OK`
- [ ] **API docs**: `http://localhost:8000/docs` loads the FastAPI Swagger UI
- [ ] **Frontend loads**: `http://localhost:3000` shows the job board page
- [ ] **Auth works**: clicking Login redirects to the Cognito hosted UI and returns to `http://localhost:3000/login` after sign-in
- [ ] **S3 works**: upload a resume through the application wizard — if LocalStack is healthy the upload completes without error. You can also verify the bucket contents with:
  ```bash
  aws --endpoint-url=http://localhost:4566 s3 ls s3://application-tracker-resumes/ --region us-east-1
  ```

---

## 6. Common Issues

**Login fails with `redirect_uri mismatch`**

Cognito rejected the callback URL. `http://localhost:3000/login` is not registered in the app client's allowed callback URLs. See Section 2.2 for how to add it in the AWS console.

**Backend starts but login always returns 401**

The Cognito environment variables are empty or incorrect. The backend starts without error even when Cognito vars are empty (they default to `""` in `config.py`), but token validation will fail at runtime. Double-check that all five Cognito vars in `.env` are populated with real staging values.

**Migrations fail or tables are missing**

Migrations are not automatic. If you see errors about missing tables, run:

```bash
docker compose exec backend-dev alembic upgrade head
```

If the backend started before the database was ready (e.g. after a hard restart), the container may have exited. Bring it back up with:

```bash
docker compose --profile dev up backend-dev
```

**S3 operations fail on first start**

LocalStack may still be initializing. The backend `depends_on` ensures it waits for LocalStack to be healthy before starting, but on slow machines this can be tight. Check LocalStack's status:

```bash
curl http://localhost:4566/_localstack/health
```

If LocalStack is unhealthy or the `localstack-init` bucket creation didn't complete, restart just those services:

```bash
docker compose --profile dev restart localstack
docker compose --profile dev up localstack-init
```

**Frontend container starts but shows a blank page or module errors**

The frontend container installs npm dependencies at startup if `node_modules/@tailwindcss/vite` is missing. On first build this happens automatically, but if the volume is stale, force a rebuild:

```bash
docker compose --profile dev up --build frontend-dev
```

**Port already in use**

If `localhost:3000` or `localhost:8000` are in use by another process, change `FRONTEND_PORT` or `BACKEND_PORT` in your `.env`. Note that if you change `FRONTEND_PORT` from `3000`, you must also update `VITE_COGNITO_REDIRECT_URI` and register the new URL as a Cognito callback URL (see Section 2.2).

---

For infrastructure and staging deployment, see [Deployment.md](./Deployment.md).
