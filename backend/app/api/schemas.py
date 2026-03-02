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
