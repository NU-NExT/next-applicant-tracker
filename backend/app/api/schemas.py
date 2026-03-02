from datetime import datetime

from pydantic import BaseModel


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
    date_created: datetime
    date_end: datetime
    job: str
    description: str


class JobListingCreate(JobListingBase):
    pass


class JobListingUpdate(BaseModel):
    date_created: datetime | None = None
    date_end: datetime | None = None
    job: str | None = None
    description: str | None = None


class JobListingRead(JobListingBase):
    id: int

    model_config = {"from_attributes": True}


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

class ApplicationBase(BaseModel):
    user_id: int
    job_id: int
    status: str
    description: str
    resume_key: str | None = None
    transcript_key: str | None = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: str | None = None
    description: str | None = None
    resume_key: str | None = None
    transcript_key: str | None = None

class ApplicationRead(ApplicationBase):
    id: int

    model_config = {"from_attributes": True}