# NExT Applicant Tracking System

NExT Co-op Consulting receives 100+ applicants per recruitment cycle. Previously, the leadership team managed this entirely through Notion databases and printed resumes — a manual, high-overhead process with little structured evaluation workflow.

This platform replaces that with a purpose-built Applicant Tracking System. It gives the NExT team one place to create and manage co-op positions with customizable application questions, receive and review candidate applications, score and comment on submissions collaboratively, and export candidate data for external assessment workflows. The goal is to eliminate the administrative overhead of recruitment so the team can focus on evaluating candidates rather than managing spreadsheets.

Candidates discover positions on NUworks (Northeastern's official co-op posting system) and are directed into this platform via a generated intake URL to complete their full application.

## Features

- **Job board** — candidates browse open positions and view role details
- **Application flow** — guided multi-step application flow with profile completion, position-specific questions, and data consent
- **Candidate profiles** — persistent profiles (education, resume, links) that carry across applications
- **Resume upload** — PDF upload stored in S3, retrievable via presigned URL
- **Admin dashboard** — application stats, open and past cycle summaries
- **Application review** — per-candidate review interface with scoring (Strong / Potential / Defer / Deny) and reviewer comments
- **CSV export** — per-position candidate export for external workflows
- **Role-based access** — candidate self-registration via Northeastern email; admin accounts managed through Cognito

## Documentation

- [docs/LocalDevelopment.md](docs/LocalDevelopment.md) — local setup guide
- [docs/SystemArchitecture.md](docs/SystemArchitecture.md) — tech stack, architecture diagrams, and code patterns
- [docs/Deployment.md](docs/Deployment.md) — AWS infrastructure and staging environment guide

## Development Team

| Name           | Role            |
| -------------- | --------------- |
| Ethan Wong     | Developer       |
| Joel Kalai     | Developer       |
| Marcus Yi      | Developer       |
| Wesley Chapman | Developer       |
| Aidan Kelly    | Developer       |
| Jack Dreifus   | Project Manager |
