from datetime import datetime

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
    id: int

    model_config = {"from_attributes": True}


class JobListingBase(BaseModel):
    date_end: datetime
    job: str
    description: str


class QuestionnaireQuestionBase(BaseModel):
    prompt: str
    sort_order: int = 0


class QuestionnaireQuestionCreate(QuestionnaireQuestionBase):
    pass


class QuestionnaireQuestionRead(QuestionnaireQuestionBase):
    id: int
    job_listing_id: int

    model_config = {"from_attributes": True}


class JobListingCreate(JobListingBase):
    date_created: datetime | None = None
    questions: list[QuestionnaireQuestionCreate] = Field(default_factory=list)


class JobListingUpdate(BaseModel):
    date_created: datetime | None = None
    date_end: datetime | None = None
    job: str | None = None
    description: str | None = None
    questions: list[QuestionnaireQuestionCreate] | None = None


class JobListingRead(JobListingBase):
    id: int
    date_created: datetime
    questions: list[QuestionnaireQuestionRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ApplicationSubmissionBase(BaseModel):
    job_listing_id: int
    applicant_name: str
    applicant_email: str
    status: str = "submitted"
    responses_json: str


class ApplicationSubmissionCreate(ApplicationSubmissionBase):
    pass


class ApplicationSubmissionRead(ApplicationSubmissionBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DemographicsSummary(BaseModel):
    total_submissions: int
    applicants_with_edu_email: int
    applicants_with_other_email: int


class UserBase(BaseModel):
    email: str
    first_name: str
    last_name: str
    is_admin: bool

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_admin: bool | None = None

class UserRead(UserBase):
    id: int

    model_config = {"from_attributes": True}