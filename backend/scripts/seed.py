#!/usr/bin/env python3
"""
Seed script for the NExT ATS database.

Populates reference data (question types, score values, application statuses,
field options) and generates realistic job listings, questions, an application
cycle, and applicant submissions using Faker.

The script is fully idempotent — re-running it is safe.  Pass --reset to wipe
seeded records and start fresh.

Usage
-----
  # safe / idempotent
  python scripts/seed.py

  # wipe seeded data then regenerate
  python scripts/seed.py --reset

Docker
------
  docker exec application_tracker_backend python scripts/seed.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend/ to sys.path so `app.*` imports work when running directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from faker import Faker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.models.models import (
    ApplicationCycle,
    ApplicationQuestionResponse,
    ApplicationStatus,
    ApplicationSubmission,
    FieldOption,
    JobMetadata,
    JobListing,
    JobListingQuestion,
    Profile,
    QuestionnaireQuestion,
    QuestionType,
    ScoreValue,
    User,
)
from app.security.passwords import hash_password

# ── Configuration ──────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@application_tracker_db:5432/next-ats-db",
)

# All seeded dynamic records are identified by these markers so --reset can
# target them without touching real data.
SEED_EMAIL_DOMAIN = "@nextseed.northeastern.edu"
SEED_CYCLE_SLUG = "spring-2026-seed"
SEED_METADATA_SEMESTER = "Spring 2026 (Seed)"

fake = Faker()
Faker.seed(42)

# ── Reference data definitions ─────────────────────────────────────────────────

QUESTION_TYPES = [
    {"code": "text", "label": "Short Text"},
    {"code": "textarea", "label": "Long Text / Essay"},
    {"code": "multiple_choice", "label": "Multiple Choice"},
    {"code": "checkbox", "label": "Checkbox (multi-select)"},
    {"code": "yes_no", "label": "Yes / No"},
]

SCORE_VALUES = [
    {"value": 1, "label": "Poor"},
    {"value": 2, "label": "Below Average"},
    {"value": 3, "label": "Average"},
    {"value": 4, "label": "Good"},
    {"value": 5, "label": "Excellent"},
]

APPLICATION_STATUSES = [
    {"code": "applied", "label": "Applied"},
    {"code": "in_review", "label": "In Review"},
    {"code": "assessment_sent", "label": "Assessment Sent"},
    {"code": "assessment_complete", "label": "Assessment Complete"},
    {"code": "interview_invited", "label": "Interview Invited"},
    {"code": "interview_complete", "label": "Interview Complete"},
    {"code": "offer_extended", "label": "Offer Extended"},
    {"code": "rejected", "label": "Rejected"},
    {"code": "withdrawn", "label": "Withdrawn"},
]

FIELD_OPTIONS: list[dict] = [
    # majors
    *[
        {"category": "major", "value": m, "sort_order": i, "is_active": True}
        for i, m in enumerate([
            "Computer Science",
            "Data Science",
            "Computer Engineering",
            "Electrical Engineering",
            "Information Science",
            "Cybersecurity",
            "Cognitive Science",
            "Mathematics",
        ])
    ],
    # current_year
    *[
        {"category": "current_year", "value": y, "sort_order": i, "is_active": True}
        for i, y in enumerate(["Freshman", "Sophomore", "Junior", "Senior", "5th Year"])
    ],
    # coop_number
    *[
        {"category": "coop_number", "value": v, "sort_order": i, "is_active": True}
        for i, v in enumerate(["1st Co-op", "2nd Co-op", "3rd Co-op"])
    ],
    # concentration
    *[
        {"category": "concentration", "value": c, "sort_order": i, "is_active": True}
        for i, c in enumerate([
            "Artificial Intelligence",
            "Software",
            "Systems",
            "Human-Computer Interaction",
            "Theory",
        ])
    ],
]

# ── Job listing / question definitions ────────────────────────────────────────

# Each listing entry contains role metadata plus per-listing questions.
# (prompt, question_type_code, character_limit | None, is_global)
_Q = tuple[str, str, int | None, bool]

LISTING_DEFINITIONS: list[dict] = [
    {
        "position_title": "ML Engineering Co-op",
        "job": "ML Engineering Co-op",
        "slug_suffix": "ml-eng-coop",
        "required_skills": "Python, Machine Learning, scikit-learn, TensorFlow, Data Science, Data Pipelines",
        "description_paragraphs": [
            "Are you passionate about building machine learning systems that solve real business problems? "
            "Do you thrive at the intersection of rigorous statistical thinking and production-quality engineering? "
            "NExT Consulting offers a unique opportunity for data science and ML students to engage in the full "
            "lifecycle of an ML engagement — from data exploration and model development through deployment and delivery.",
            "Supported by Northeastern faculty and NExT leadership, you will work alongside a focused team of "
            "co-op consultants to design, build, and deliver a machine learning solution for an industry partner. "
            "Previous clients have included State Street and Verizon.",
            "The ideal candidate combines strong data science fundamentals with the statistical depth to make "
            "principled modeling decisions and the communication skills to present them in client-facing settings. "
            "Compensation is $25–$30/hr. This is a full-time, primarily on-site role in Boston, MA.",
        ],
        "questions": [
            ("Describe your most relevant machine learning or data science project.", "textarea", 1500, False),
            ("Why are you interested in applied ML consulting at NExT?", "textarea", 1000, False),
            ("Walk us through how you would validate a machine learning model before delivering it to a client.", "textarea", 1500, False),
            ("Which ML frameworks and libraries are you most comfortable with, and why?", "textarea", 800, False),
            ("Describe a time you worked with messy or incomplete data. How did you handle it?", "textarea", 1000, False),
            ("Do you have experience deploying ML models to a production or cloud environment?", "yes_no", None, False),
        ],
    },
    {
        "position_title": "Product Management Co-op",
        "job": "Product Management Co-op",
        "slug_suffix": "pm-coop",
        "required_skills": "Product Management, User Stories, Usability Testing, User Research, Web Development, Prototypes",
        "description_paragraphs": [
            "Do you like to define what success looks like before deciding what to build? "
            "Do you find yourself asking why things work the way they do before accepting them at face value? "
            "NExT Consulting is seeking technically strong, product-minded students to drive product discovery "
            "and shape what gets built on real client engagements.",
            "You will conduct stakeholder interviews, translate discovery insights into well-scoped user stories, "
            "contribute to codebase development, and operate as a complete consultant on client-facing projects. "
            "Previous industry partners have included State Street and Verizon.",
            "The ideal candidate has a strong technical foundation, a genuine instinct for discovery, and fluency "
            "with AI tools as part of everyday workflows. Previous co-op or internship experience is required. "
            "Compensation is $25–$30/hr. This is a full-time, primarily on-site role in Boston, MA.",
        ],
        "questions": [
            ("Describe a product or feature you would improve and explain your discovery approach.", "textarea", 1500, False),
            ("Tell us about your experience working with engineering or design teams.", "textarea", 1000, False),
            ("How do you prioritize competing product requirements when resources are constrained?", "textarea", 1000, False),
            ("Describe a time you used data to inform a product decision.", "textarea", 1500, False),
            ("How do you use AI tools in your day-to-day workflows?", "textarea", 800, False),
            ("Do you have experience conducting user interviews or usability testing?", "yes_no", None, False),
        ],
    },
    {
        "position_title": "Software Engineering Co-op",
        "job": "Software Engineering Co-op",
        "slug_suffix": "swe-coop",
        "required_skills": "Python, TypeScript, JavaScript, Java, Git, GitHub, AWS, Front-end, Back-end",
        "description_paragraphs": [
            "Are you interested in building software solutions? Do you thrive in a team environment? "
            "NExT Consulting offers a unique opportunity for highly qualified computer scientists to take "
            "leadership roles in developing software projects from ideation to completion.",
            "You will work across the full technology stack — front-end and back-end web development, DevOps, "
            "cloud infrastructure, and database management — while collaborating with UI/UX Design Engineers, "
            "Product Managers, and Technical Project Managers on real client engagements. "
            "Previous industry partners have included State Street and Verizon.",
            "Beyond technical execution, you will be accountable for client meeting preparation, stakeholder "
            "communication, and ensuring excellence across all facets of project delivery. "
            "Compensation is $25–$30/hr. This is a full-time, primarily on-site role in Boston, MA.",
        ],
        "questions": [
            ("Tell us about your most relevant software engineering experience.", "textarea", 1500, False),
            ("Why are you interested in NExT Consulting?", "textarea", 1000, False),
            ("Describe a project where you collaborated with teammates under a deadline.", "textarea", 1500, False),
            ("What technical strengths do you bring to a software engineering role?", "textarea", 1000, False),
            ("How do you handle ambiguous or frequently-changing requirements?", "textarea", 1000, False),
            ("Are you comfortable working across both front-end and back-end systems?", "yes_no", None, False),
        ],
    },
    {
        "position_title": "Technical Project Management Co-op",
        "job": "Technical Project Management Co-op",
        "slug_suffix": "tpm-coop",
        "required_skills": "Agile, Scrum, Project Management, Communication, Collaboration, Technical Skills, Stakeholders",
        "description_paragraphs": [
            "Are you interested in planning technical projects? Would you thrive in an agile team environment? "
            "NExT Consulting is seeking organized, technically proficient students with project management skills "
            "to coordinate and contribute to cutting-edge technology projects for real industry clients.",
            "You will serve as Scrum Master, coordinate project plans and timelines, contribute to software "
            "development, and ensure engineering teams stay aligned to business goals throughout the full "
            "development lifecycle. Previous industry partners have included State Street and Verizon.",
            "The ideal candidate has both a technical background and project management experience with a focus "
            "on Scrum and Agile frameworks. Familiarity with Linear, Jira, or Notion is a plus. "
            "Compensation is $25–$30/hr. This is a full-time, primarily on-site role in Boston, MA.",
        ],
        "questions": [
            ("Describe your experience managing or coordinating a technical project.", "textarea", 1500, False),
            ("Tell us about a time you helped a team stay on track under pressure.", "textarea", 1000, False),
            ("How do you balance your own technical contributions with project coordination responsibilities?", "textarea", 1000, False),
            ("Describe your experience with Agile or Scrum methodologies.", "textarea", 800, False),
            ("How do you communicate project risks or blockers to non-technical stakeholders?", "textarea", 1000, False),
            ("Do you have experience using project management tools such as Linear, Jira, or Notion?", "yes_no", None, False),
        ],
    },
    {
        "position_title": "UI/UX Design Engineering Co-op",
        "job": "UI/UX Design Engineering Co-op",
        "slug_suffix": "uiux-coop",
        "required_skills": "User Experience Design, UI/UX Design, Wireframes, Usability Testing, User Research, Adobe XD, Figma",
        "description_paragraphs": [
            "Are you passionate about creating exceptional user experiences? Do you excel at understanding user "
            "needs and translating them into intuitive design solutions? NExT Consulting is seeking user-focused, "
            "research-oriented students to serve as the UX specialist on client projects.",
            "You will conduct user research, develop wireframes and interactive prototypes, implement front-end "
            "solutions, and contribute to internal design excellence and knowledge sharing across engineering teams. "
            "Previous industry partners have included State Street and Verizon.",
            "The ideal candidate has a strong portfolio demonstrating user-centered design thinking alongside "
            "front-end development proficiency in HTML, CSS, and JavaScript. Experience with Figma, Sketch, "
            "or Adobe XD is required. Compensation is $25–$30/hr. This is a full-time, primarily on-site role in Boston, MA.",
        ],
        "questions": [
            ("Walk us through a project in your portfolio and the design decisions you made.", "textarea", 1500, False),
            ("Describe your user research process. How do you translate findings into design decisions?", "textarea", 1000, False),
            ("How do you collaborate with engineers to ensure your designs are implemented accurately?", "textarea", 1000, False),
            ("What design and prototyping tools are you most proficient with?", "textarea", 800, False),
            ("Describe a time you advocated for the user when faced with competing business constraints.", "textarea", 1000, False),
            ("Do you have front-end development experience (HTML, CSS, JavaScript)?", "yes_no", None, False),
        ],
    },
]

# Global questions are attached to every listing.
GLOBAL_QUESTIONS: list[_Q] = [
    (
        "Please share any demographic information you are comfortable disclosing (optional).",
        "textarea",
        500,
        True,
    ),
    ("Do you require any interview accommodations?", "yes_no", None, True),
]

# Statuses distributed across generated applicants (index mod len).
APPLICANT_STATUSES = [
    "draft",
    "submitted",
    "submitted",
    "submitted",
    "in_review",
    "in_review",
    "assessment_sent",
    "interview_invited",
    "offer_extended",
    "rejected",
]

MAJORS = [fo["value"] for fo in FIELD_OPTIONS if fo["category"] == "major"]
YEARS = [fo["value"] for fo in FIELD_OPTIONS if fo["category"] == "current_year"]
COOPS = [fo["value"] for fo in FIELD_OPTIONS if fo["category"] == "coop_number"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _blocknote(paragraphs: list[str]) -> list[dict]:
    """Convert plain strings to a minimal BlockNote-compatible JSON structure."""
    return [{"type": "paragraph", "content": p} for p in paragraphs]


def _fake_response(prompt: str, qt_code: str, idx: int) -> dict:
    """Return a plausible response payload for a given question type."""
    if qt_code == "yes_no":
        return {"answer": fake.random_element(["Yes", "No"])}
    if qt_code == "text":
        return {"answer": fake.sentence(nb_words=6).rstrip(".")}
    sentences = fake.sentences(nb=fake.random_int(min=3, max=6))
    return {"answer": " ".join(sentences)}


def _profile_snapshot(user: User, profile: Profile) -> dict:
    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "major": profile.major,
        "current_year": profile.current_year,
        "gpa": profile.gpa,
        "expected_graduation_date": profile.expected_graduation_date,
        "coop_number": profile.coop_number,
        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
    }


def sync_pk_sequences(db: Session) -> None:
    """Align PostgreSQL serial sequences with current table maxima."""
    print("  Syncing primary key sequences …")
    sequence_targets: list[tuple[str, str]] = [
        ("job_metadata", "metadata_id"),
        ("question_types", "question_type_id"),
        ("score_values", "score_value_id"),
        ("application_statuses", "application_status_id"),
        ("field_options", "field_option_id"),
        ("application_cycles", "application_cycle_id"),
        ("job_listings", "listing_id"),
        ("questionnaire_questions", "question_id"),
        ("job_listing_questions", "job_listing_question_id"),
        ("users", "user_id"),
        ("profiles", "profile_id"),
        ("application_submissions", "application_submission_id"),
        ("application_question_responses", "application_question_response_id"),
    ]
    for table_name, column_name in sequence_targets:
        db.execute(
            text(
                f"""
                SELECT setval(
                    pg_get_serial_sequence('{table_name}', '{column_name}'),
                    COALESCE((SELECT MAX({column_name}) FROM {table_name}), 1),
                    (SELECT MAX({column_name}) IS NOT NULL FROM {table_name})
                )
                """
            )
        )
    db.flush()


# ── Seeding functions ─────────────────────────────────────────────────────────

def seed_reference_data(db: Session) -> dict[str, int]:
    print("  Seeding question types …")
    for qt in QUESTION_TYPES:
        existing = db.query(QuestionType).filter_by(code=qt["code"]).first()
        if not existing:
            db.add(QuestionType(code=qt["code"], label=qt["label"]))
    db.flush()

    print("  Seeding score values …")
    for sv in SCORE_VALUES:
        existing = db.query(ScoreValue).filter_by(value=sv["value"]).first()
        if not existing:
            db.add(ScoreValue(value=sv["value"], label=sv["label"]))
    db.flush()

    print("  Seeding application statuses …")
    for st in APPLICATION_STATUSES:
        existing = db.query(ApplicationStatus).filter_by(code=st["code"]).first()
        if not existing:
            db.add(ApplicationStatus(code=st["code"], label=st["label"]))
    db.flush()

    print("  Seeding field options …")
    for fo in FIELD_OPTIONS:
        existing = (
            db.query(FieldOption)
            .filter_by(category=fo["category"], value=fo["value"])
            .first()
        )
        if not existing:
            db.add(
                FieldOption(
                    category=fo["category"],
                    value=fo["value"],
                    sort_order=fo["sort_order"],
                    is_active=fo["is_active"],
                )
            )
    db.flush()

    qt_map: dict[str, int] = {
        qt.code: qt.question_type_id
        for qt in db.query(QuestionType).all()
    }
    return qt_map


def clear_seed_data(db: Session) -> None:
    """Remove all records created by a previous seed run."""
    print("  Clearing previous seed data …")

    seeded_sub_ids = [
        row[0]
        for row in db.execute(
            text(
                "SELECT application_submission_id FROM application_submissions "
                "WHERE applicant_email LIKE :pattern"
            ),
            {"pattern": f"%{SEED_EMAIL_DOMAIN}"},
        ).fetchall()
    ]

    if seeded_sub_ids:
        db.execute(
            text(
                "DELETE FROM application_review_comments "
                "WHERE application_submission_id = ANY(:ids)"
            ),
            {"ids": seeded_sub_ids},
        )
        db.execute(
            text(
                "DELETE FROM application_review_scores "
                "WHERE application_submission_id = ANY(:ids)"
            ),
            {"ids": seeded_sub_ids},
        )
        db.execute(
            text(
                "DELETE FROM application_question_responses "
                "WHERE application_submission_id = ANY(:ids)"
            ),
            {"ids": seeded_sub_ids},
        )
        db.execute(
            text(
                "DELETE FROM application_submissions "
                "WHERE application_submission_id = ANY(:ids)"
            ),
            {"ids": seeded_sub_ids},
        )

    seeded_user_ids = [
        row[0]
        for row in db.execute(
            text("SELECT user_id FROM users WHERE email LIKE :pattern"),
            {"pattern": f"%{SEED_EMAIL_DOMAIN}"},
        ).fetchall()
    ]
    if seeded_user_ids:
        db.execute(
            text("DELETE FROM profiles WHERE user_id = ANY(:ids)"),
            {"ids": seeded_user_ids},
        )
        db.execute(
            text("DELETE FROM users WHERE user_id = ANY(:ids)"),
            {"ids": seeded_user_ids},
        )

    seeded_listing_ids = [
        row[0]
        for row in db.execute(
            text(
                "SELECT listing_id FROM job_listings "
                "WHERE listing_slug LIKE :pattern"
            ),
            {"pattern": f"{SEED_CYCLE_SLUG}-%"},
        ).fetchall()
    ]
    if seeded_listing_ids:
        db.execute(
            text(
                "DELETE FROM job_listing_questions "
                "WHERE job_listing_id = ANY(:ids)"
            ),
            {"ids": seeded_listing_ids},
        )
        db.execute(
            text(
                "DELETE FROM questionnaire_questions "
                "WHERE job_listing_id = ANY(:ids)"
            ),
            {"ids": seeded_listing_ids},
        )
        db.execute(
            text("DELETE FROM job_listings WHERE listing_id = ANY(:ids)"),
            {"ids": seeded_listing_ids},
        )

    for prompt, _qt_code, _char_limit, _is_global in GLOBAL_QUESTIONS:
        db.execute(
            text(
                "DELETE FROM questionnaire_questions "
                "WHERE is_global = TRUE AND prompt = :prompt"
            ),
            {"prompt": prompt},
        )

    db.execute(
        text("DELETE FROM application_cycles WHERE slug = :slug"),
        {"slug": SEED_CYCLE_SLUG},
    )
    db.execute(
        text("DELETE FROM job_metadata WHERE semester = :semester"),
        {"semester": SEED_METADATA_SEMESTER},
    )

    db.flush()
    print("  Done clearing.")


def seed_application_cycle(db: Session) -> ApplicationCycle:
    cycle = db.query(ApplicationCycle).filter_by(slug=SEED_CYCLE_SLUG).first()
    if cycle:
        return cycle
    cycle = ApplicationCycle(name="Spring 2026 (Seed)", slug=SEED_CYCLE_SLUG)
    db.add(cycle)
    db.flush()
    print(f"  Created application cycle: {cycle.name}")
    return cycle


def seed_job_metadata(db: Session) -> None:
    print("  Seeding homepage job metadata …")
    now = _now()
    for defn in LISTING_DEFINITIONS:
        role = defn["position_title"]
        existing = (
            db.query(JobMetadata)
            .filter_by(role=role, semester=SEED_METADATA_SEMESTER)
            .first()
        )
        if existing:
            continue

        db.add(
            JobMetadata(
                release_date=now - timedelta(days=14),
                end_date=now + timedelta(days=1),
                semester=SEED_METADATA_SEMESTER,
                role=role,
                pay=30,
                description="\n\n".join(defn["description_paragraphs"]),
            )
        )
    db.flush()


def seed_job_listings(
    db: Session,
    cycle: ApplicationCycle,
    qt_map: dict[str, int],
) -> list[tuple[JobListing, list[QuestionnaireQuestion]]]:
    now = _now()
    results: list[tuple[JobListing, list[QuestionnaireQuestion]]] = []

    for defn in LISTING_DEFINITIONS:
        slug = f"{SEED_CYCLE_SLUG}-{defn['slug_suffix']}"
        listing = db.query(JobListing).filter_by(listing_slug=slug).first()

        if not listing:
            listing = JobListing(
                code_id=f"SEED-{defn['slug_suffix'].upper()}",
                listing_date_created=now - timedelta(days=14),
                listing_date_end=now + timedelta(days=1),  # deadline Apr 3
                position_title=defn["position_title"],
                job=defn["job"],
                description=_blocknote(defn["description_paragraphs"]),
                listing_slug=slug,
                application_cycle_id=cycle.application_cycle_id,
                status="active",
                required_skills=defn["required_skills"],
                target_start_date=now + timedelta(days=90),
                is_active=True,
            )
            db.add(listing)
            db.flush()
            print(f"  Created listing: {listing.position_title}")
        else:
            print(f"  Listing already exists, skipping: {listing.position_title}")

        questions: list[QuestionnaireQuestion] = []

        existing_q_prompts = {
            q.prompt
            for q in db.query(QuestionnaireQuestion)
            .filter_by(job_listing_id=listing.listing_id)
            .all()
        }

        seq = 0
        for prompt, qt_code, char_limit, is_global in defn["questions"]:
            if prompt not in existing_q_prompts:
                q = QuestionnaireQuestion(
                    job_listing_id=listing.listing_id,
                    prompt=prompt,
                    sort_order=seq,
                    question_type_id=qt_map[qt_code],
                    character_limit=char_limit,
                    is_global=False,
                )
                db.add(q)
                db.flush()

                jlq = JobListingQuestion(
                    job_listing_id=listing.listing_id,
                    question_id=q.question_id,
                    sequence_number=seq,
                )
                db.add(jlq)
                db.flush()
                questions.append(q)
            else:
                q = (
                    db.query(QuestionnaireQuestion)
                    .filter_by(job_listing_id=listing.listing_id, prompt=prompt)
                    .first()
                )
                already_linked = (
                    db.query(JobListingQuestion)
                    .filter_by(
                        job_listing_id=listing.listing_id,
                        question_id=q.question_id,
                    )
                    .first()
                )
                if not already_linked:
                    db.add(
                        JobListingQuestion(
                            job_listing_id=listing.listing_id,
                            question_id=q.question_id,
                            sequence_number=seq,
                        )
                    )
                    db.flush()
                questions.append(q)
            seq += 1

        for prompt, qt_code, char_limit, is_global in GLOBAL_QUESTIONS:
            existing_global = (
                db.query(QuestionnaireQuestion)
                .filter_by(prompt=prompt, is_global=True)
                .first()
            )
            if not existing_global:
                existing_global = QuestionnaireQuestion(
                    job_listing_id=None,
                    prompt=prompt,
                    sort_order=seq,
                    question_type_id=qt_map[qt_code],
                    character_limit=char_limit,
                    is_global=True,
                )
                db.add(existing_global)
                db.flush()

            already_linked = (
                db.query(JobListingQuestion)
                .filter_by(
                    job_listing_id=listing.listing_id,
                    question_id=existing_global.question_id,
                )
                .first()
            )
            if not already_linked:
                db.add(
                    JobListingQuestion(
                        job_listing_id=listing.listing_id,
                        question_id=existing_global.question_id,
                        sequence_number=seq,
                    )
                )
                db.flush()

            questions.append(existing_global)
            seq += 1

        results.append((listing, questions))

    return results


def seed_users_and_submissions(
    db: Session,
    listing_questions: list[tuple[JobListing, list[QuestionnaireQuestion]]],
    qt_map: dict[str, int],
    applicants_per_listing: int = 12,
) -> None:
    qt_id_to_code: dict[int, str] = {v: k for k, v in qt_map.items()}

    for listing, questions in listing_questions:
        print(f"  Seeding {applicants_per_listing} applicants for: {listing.position_title}")

        for i in range(applicants_per_listing):
            first = fake.first_name()
            last = fake.last_name()
            local = f"{first.lower()}.{last.lower()}.{listing.listing_id}.{i}"
            email = f"{local}{SEED_EMAIL_DOMAIN}"

            if db.query(User).filter_by(email=email).first():
                continue

            user = User(
                email=email,
                password=hash_password("Seed1234!"),
                first_name=first,
                last_name=last,
                is_admin=False,
                is_active=True,
                consented_at=_now() - timedelta(days=fake.random_int(min=1, max=30)),
                user_metadata={"auth_provider": "seed", "seeded": True},
            )
            db.add(user)
            db.flush()

            grad_year = fake.random_element(["2026", "2027", "2028"])
            profile = Profile(
                user_id=user.user_id,
                full_legal_name=f"{first} {last}",
                phone_number=fake.numerify("(###) ###-####"),
                expected_graduation_date=f"{grad_year}-05-01",
                current_year=fake.random_element(YEARS),
                coop_number=fake.random_element(COOPS),
                major=fake.random_element(MAJORS),
                minor=fake.random_element([None, "Mathematics", "Physics", "Economics"]),
                gpa=f"{fake.pyfloat(min_value=2.8, max_value=4.0, right_digits=2):.2f}",
                github_url=f"https://github.com/{first.lower()}{last.lower()}",
                linkedin_url=f"https://linkedin.com/in/{first.lower()}-{last.lower()}",
                club="NExT Consulting",
                past_experience_count=fake.random_int(min=0, max=4),
                unique_experience_count=fake.random_int(min=0, max=3),
            )
            db.add(profile)
            db.flush()

            status = APPLICANT_STATUSES[i % len(APPLICANT_STATUSES)]
            is_draft = status == "draft"
            submitted_at = None if is_draft else (_now() - timedelta(days=fake.random_int(min=1, max=20)))

            responses: list[dict] = []
            for q in questions:
                qt_code = qt_id_to_code.get(q.question_type_id, "textarea")
                payload = _fake_response(q.prompt, qt_code, i)
                responses.append({"question_id": q.question_id, "prompt": q.prompt, **payload})

            snapshot = _profile_snapshot(user, profile)

            submission = ApplicationSubmission(
                job_listing_id=listing.listing_id,
                user_id=user.user_id,
                applicant_name=f"{first} {last}",
                applicant_email=email,
                status=status,
                responses_json=json.dumps(responses),
                profile_snapshot_json=snapshot,
                submitted_at=submitted_at,
                is_draft=is_draft,
                sent_assessment=status in ("assessment_sent", "assessment_complete", "interview_invited", "interview_complete", "offer_extended"),
                accepted_assessment=status in ("assessment_complete", "interview_invited", "interview_complete", "offer_extended"),
                interview_invited=status in ("interview_invited", "interview_complete", "offer_extended"),
                interview_completed=status in ("interview_complete", "offer_extended"),
                offer_extended=status == "offer_extended",
            )
            db.add(submission)
            db.flush()

            for q in questions:
                qt_code = qt_id_to_code.get(q.question_type_id, "textarea")
                db.add(
                    ApplicationQuestionResponse(
                        application_submission_id=submission.application_submission_id,
                        question_id=q.question_id,
                        response_text=_fake_response(q.prompt, qt_code, i),
                    )
                )

            db.flush()


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the NExT ATS database.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe previously seeded data before regenerating.",
    )
    args = parser.parse_args()

    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with SessionLocal() as db:
        try:
            print("\n── NExT ATS seed script ─────────────────────────────────")

            if args.reset:
                print("\n[reset] Removing previous seed data …")
                clear_seed_data(db)

            print("\n[0/5] Sequence alignment")
            sync_pk_sequences(db)

            print("\n[1/5] Reference data")
            qt_map = seed_reference_data(db)

            print("\n[2/5] Application cycle")
            cycle = seed_application_cycle(db)

            print("\n[3/5] Homepage job metadata")
            seed_job_metadata(db)

            print("\n[4/5] Job listings & questions")
            listing_questions = seed_job_listings(db, cycle, qt_map)

            print("\n[5/5] Users, profiles & submissions")
            seed_users_and_submissions(db, listing_questions, qt_map)

            db.commit()
            print("\n✓ Seed complete.\n")

        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    main()
