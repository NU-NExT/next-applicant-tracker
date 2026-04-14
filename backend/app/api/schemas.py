from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class JobMetadataBase(BaseModel):
    release_date: datetime
    end_date: datetime
    semester: str
    role: str
    pay: int
    description: str


class JobMetadataCreate(JobMetadataBase):
    pass


class JobMetadataUpdate(BaseModel):
    release_date: datetime | None = None
    end_date: datetime | None = None
    semester: str | None = None
    role: str | None = None
    pay: int | None = None
    description: str | None = None


class JobMetadataRead(JobMetadataBase):
    metadata_id: int

    model_config = {"from_attributes": True}


class JobListingBase(BaseModel):
    code_id: str | None = None
    position_title: str | None = None
    date_posted: datetime | None = None
    date_end: datetime | None = None
    job: str | None = None
    description: dict[str, Any] | list | str
    slug: str | None = None
    application_cycle_id: int | None = None
    status: str = "active"
    required_skills: str | None = None
    target_start_date: datetime | None = None
    is_active: bool = True


class ApplicationCycleBase(BaseModel):
    name: str
    slug: str


class ApplicationCycleCreate(ApplicationCycleBase):
    pass


class ApplicationCycleRead(ApplicationCycleBase):
    application_cycle_id: int

    model_config = {"from_attributes": True}


class QuestionTypeBase(BaseModel):
    code: str
    label: str


class QuestionTypeCreate(QuestionTypeBase):
    pass


class QuestionTypeRead(QuestionTypeBase):
    question_type_id: int

    model_config = {"from_attributes": True}


class QuestionnaireQuestionBase(BaseModel):
    prompt: str
    sort_order: int = 0
    question_type_id: int
    character_limit: int | None = None
    is_global: bool = False


class QuestionnaireQuestionCreate(QuestionnaireQuestionBase):
    pass


class QuestionnaireQuestionRead(QuestionnaireQuestionBase):
    question_id: int
    job_listing_id: int

    model_config = {"from_attributes": True}


class JobListingCreate(JobListingBase):
    date_created: datetime | None = None
    questions: list[QuestionnaireQuestionCreate] = Field(default_factory=list)
    global_question_ids: list[int] = Field(default_factory=list)


class JobListingUpdate(BaseModel):
    date_created: datetime | None = None
    date_posted: datetime | None = None
    date_end: datetime | None = None
    job: str | None = None
    description: str | None = None
    questions: list[QuestionnaireQuestionCreate] | None = None


class JobListingRead(JobListingBase):
    listing_id: int
    listing_date_created: datetime
    listing_date_posted: datetime | None = None
    questions: list[QuestionnaireQuestionRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class GlobalQuestionBankRead(BaseModel):
    question_id: int
    prompt: str
    sort_order: int
    question_type_id: int
    character_limit: int | None

    model_config = {"from_attributes": True}


class GlobalQuestionSelectionPayload(BaseModel):
    question_ids: list[int]


class JobListingAdminCreate(BaseModel):
    position_title: str
    code_id: str  # normalized to uppercase, immutable after creation
    description: str = ""  # plain text; stored as {"text": "..."} in JSON col
    required_skills: str = ""
    target_start_date: datetime | None = None  # "listing_date_start" per SRS
    listing_date_posted: datetime | None = None
    listing_date_end: datetime | None = None  # nullable; SRS doesn't require it
    nuworks_url: str | None = None
    nuworks_position_id: str | None = None
    global_question_ids: list[int] = Field(default_factory=list)


class JobListingAdminUpdate(BaseModel):
    position_title: str | None = None
    description: str | None = None
    required_skills: str | None = None
    target_start_date: datetime | None = None
    listing_date_posted: datetime | None = None
    listing_date_end: datetime | None = None
    nuworks_url: str | None = None
    nuworks_position_id: str | None = None
    is_active: bool | None = None


class JobListingAdminRead(BaseModel):
    listing_id: int
    code_id: str | None
    position_title: str
    description: str  # unwrapped from {"text": "..."}
    required_skills: str | None
    target_start_date: datetime | None
    listing_date_posted: datetime | None
    listing_date_end: datetime | None
    nuworks_url: str | None
    nuworks_position_id: str | None
    is_active: bool
    listing_date_created: datetime
    intake_url: str  # f"{settings.frontend_url}/apply?position={code_id}"
    application_count: int = 0
    question_count: int = 0


class PositionQuestionCreate(BaseModel):
    prompt: str
    character_limit: int | None = None


class PositionQuestionUpdate(BaseModel):
    prompt: str | None = None
    character_limit: int | None = None


class PositionQuestionReorder(BaseModel):
    question_ids: list[int]


class PositionQuestionRead(BaseModel):
    question_id: int
    prompt: str
    sort_order: int
    character_limit: int | None


class ApplicationSubmissionBase(BaseModel):
    job_listing_id: int | None = None
    user_id: int | None = None
    job_listing_slug: str | None = None
    applicant_name: str
    applicant_email: str
    status: str = "draft"
    responses_json: str
    profile_snapshot_json: dict = Field(default_factory=dict)
    resume_s3_key: str | None = None
    submitted_at: datetime | None = None
    is_draft: bool = True
    sent_assessment: bool = False
    accepted_assessment: bool = False
    interview_invited: bool = False
    interview_completed: bool = False
    offer_extended: bool = False


class ApplicationSubmissionCreate(ApplicationSubmissionBase):
    pass


class ApplicationSubmissionRead(ApplicationSubmissionBase):
    application_submission_id: int
    application_submission_created_at: datetime
    application_submission_updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ApplicationSubmissionStatusUpdate(BaseModel):
    status: str | None = None
    application_status_id: int | None = None
    effective_at: datetime | None = None


class ApplicationReviewScoreCreate(BaseModel):
    score_value_id: int | None = None
    score: int | None = None


class ApplicationReviewScoreRead(BaseModel):
    application_review_score_id: int
    application_submission_id: int
    reviewer_user_id: int
    reviewer_name: str
    score_value_id: int
    score: int | None = None
    application_review_score_created_at: datetime


class ScoreLabel(str, Enum):
    strong = "Strong"
    potential = "Potential"
    defer = "Defer"
    deny = "Deny"


class ApplicationScoreSubmit(BaseModel):
    score_label: ScoreLabel


class ApplicationScoreDetail(BaseModel):
    application_review_score_id: int
    application_submission_id: int
    score_label: str
    reviewer_name: str
    reviewer_email: str
    created_at: datetime


class ScoreSummaryResponse(BaseModel):
    total_reviews: int
    score_counts: dict[str, int]
    individual_scores: list[ApplicationScoreDetail]


class ApplicationReviewCommentCreate(BaseModel):
    comment: str


class ApplicationReviewCommentRead(BaseModel):
    application_review_comment_id: int
    application_submission_id: int
    reviewer_user_id: int
    reviewer_name: str
    comment: str
    application_review_comment_created_at: datetime


class CandidateReviewSearchRow(BaseModel):
    submission_id: int
    candidate_name: str
    candidate_email: str
    major: str | None = None
    graduation_date: str | None = None
    coop_number: str | None = None
    year_grade_level: str | None = None
    college: str | None = None
    position_applied_for: str
    cycle: str | None = None
    application_status: str


class CandidateReviewDetail(BaseModel):
    submission: ApplicationSubmissionRead
    position_title: str
    position_slug: str | None = None
    position_code: str | None = None
    global_profile_fields: dict = Field(default_factory=dict)
    position_question_answers: list[dict] = Field(default_factory=list)
    resume_view_url: str | None = None
    scores: list[ApplicationReviewScoreRead] = Field(default_factory=list)
    comments: list[ApplicationReviewCommentRead] = Field(default_factory=list)


class UserProfileRead(BaseModel):
    email: str
    first_name: str
    last_name: str
    is_admin: bool
    is_active: bool
    consented_at: datetime | None = None
    user_metadata: dict = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    user_metadata: dict = Field(default_factory=dict)


class ProfileFullRead(BaseModel):
    # User fields
    email: str
    first_name: str
    last_name: str
    is_admin: bool
    is_active: bool
    consented_at: datetime | None = None
    user_metadata: dict = Field(default_factory=dict)
    # Profile fields
    full_legal_name: str | None = None
    phone_number: str | None = None
    pronouns: str | None = None
    expected_graduation_date: str | None = None
    current_year: str | None = None
    coop_number: str | None = None
    major: str | None = None
    minor: str | None = None
    concentration: str | None = None
    college: str | None = None
    gpa: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    personal_website_url: str | None = None
    club: str | None = None
    other_relevant_information: str | None = None
    past_experience_count: int | None = None
    unique_experience_count: int | None = None

    model_config = {"from_attributes": True}


class ProfileFullUpdate(BaseModel):
    # User fields
    first_name: str | None = None
    last_name: str | None = None
    # Profile fields
    full_legal_name: str | None = None
    phone_number: str | None = None
    pronouns: str | None = None
    expected_graduation_date: str | None = None
    current_year: str | None = None
    coop_number: str | None = None
    major: str | None = None
    minor: str | None = None
    concentration: str | None = None
    college: str | None = None
    gpa: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    personal_website_url: str | None = None
    club: str | None = None
    other_relevant_information: str | None = None
    past_experience_count: int | None = None
    unique_experience_count: int | None = None


class DemographicsSummary(BaseModel):
    total_submissions: int
    applicants_with_edu_email: int
    applicants_with_other_email: int


class UserBase(BaseModel):
    email: str
    first_name: str
    last_name: str
    is_admin: bool
    user_metadata: dict = Field(default_factory=dict)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_admin: bool | None = None
    user_metadata: dict | None = None

class UserRead(UserBase):
    user_id: int
    role_id: int | None = None

    model_config = {"from_attributes": True}


class FieldOptionBase(BaseModel):
    category: str
    value: str
    sort_order: int = 0
    is_active: bool = True


class FieldOptionCreate(FieldOptionBase):
    pass


class FieldOptionUpdate(BaseModel):
    value: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class FieldOptionRead(FieldOptionBase):
    field_option_id: int
    field_option_created_at: datetime

    model_config = {"from_attributes": True}


class RoleBase(BaseModel):
    name: str


class RoleCreate(RoleBase):
    pass


class RoleRead(RoleBase):
    role_id: int

    model_config = {"from_attributes": True}


class ProfileBase(BaseModel):
    full_legal_name: str | None = None
    phone_number: str | None = None
    pronouns: str | None = None
    expected_graduation_date: str | None = None
    current_year: str | None = None
    coop_number: str | None = None
    major: str | None = None
    minor: str | None = None
    concentration: str | None = None
    gpa: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    club: str | None = None
    other_relevant_information: str | None = None
    past_experience_count: int | None = None
    unique_experience_count: int | None = None
    profile_edited_at: datetime | None = None


class ProfileCreate(ProfileBase):
    user_id: int


class ProfileRead(ProfileBase):
    profile_id: int
    user_id: int

    model_config = {"from_attributes": True}


class JobListingQuestionBase(BaseModel):
    job_listing_id: int
    question_id: int
    sequence_number: int = 0


class JobListingQuestionCreate(JobListingQuestionBase):
    pass


class JobListingQuestionRead(JobListingQuestionBase):
    job_listing_question_id: int

    model_config = {"from_attributes": True}


class ApplicationQuestionResponseBase(BaseModel):
    application_submission_id: int
    question_id: int
    response_text: Any


class ApplicationQuestionResponseCreate(ApplicationQuestionResponseBase):
    pass


class ApplicationQuestionResponseRead(ApplicationQuestionResponseBase):
    application_question_response_id: int

    model_config = {"from_attributes": True}


class ApplicationStatusBase(BaseModel):
    code: str
    label: str


class ApplicationStatusCreate(ApplicationStatusBase):
    pass


class ApplicationStatusRead(ApplicationStatusBase):
    application_status_id: int

    model_config = {"from_attributes": True}


class ApplicationSubmissionStatusEventBase(BaseModel):
    application_submission_id: int
    application_status_id: int
    effective_at: datetime
    created_by_user_id: int | None = None


class ApplicationSubmissionStatusEventCreate(ApplicationSubmissionStatusEventBase):
    pass


class ApplicationSubmissionStatusEventRead(ApplicationSubmissionStatusEventBase):
    application_submission_status_event_id: int
    application_submission_status_event_created_at: datetime
    application_submission_status_event_updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ScoreValueBase(BaseModel):
    value: int
    label: str


class ScoreValueCreate(ScoreValueBase):
    pass


class ScoreValueRead(ScoreValueBase):
    score_value_id: int

    model_config = {"from_attributes": True}
