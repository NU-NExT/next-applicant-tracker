from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas import JobMetadataCreate, JobMetadataRead, JobMetadataUpdate
from app.db import get_db
from app.models.models import JobMetadata

router = APIRouter(prefix="/api/job-data", tags=["job-data"])


@router.get("", response_model=list[JobMetadataRead])
def list_job_data(db: Session = Depends(get_db)) -> list[JobMetadata]:
    return db.query(JobMetadata).order_by(JobMetadata.release_date.desc()).all()


@router.get("/{job_id}", response_model=JobMetadataRead)
def get_job_data(job_id: int, db: Session = Depends(get_db)) -> JobMetadata:
    job = db.query(JobMetadata).filter(JobMetadata.metadata_id == job_id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job metadata not found")
    return job


@router.post("", response_model=JobMetadataRead, status_code=status.HTTP_201_CREATED)
def create_job_data(payload: JobMetadataCreate, db: Session = Depends(get_db)) -> JobMetadata:
    job = JobMetadata(**payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/{job_id}", response_model=JobMetadataRead)
def update_job_data(job_id: int, payload: JobMetadataCreate, db: Session = Depends(get_db)) -> JobMetadata:
    job = db.query(JobMetadata).filter(JobMetadata.metadata_id == job_id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job metadata not found")

    for key, value in payload.model_dump().items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)
    return job


@router.patch("/{job_id}", response_model=JobMetadataRead)
def patch_job_data(job_id: int, payload: JobMetadataUpdate, db: Session = Depends(get_db)) -> JobMetadata:
    job = db.query(JobMetadata).filter(JobMetadata.metadata_id == job_id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job metadata not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_data(job_id: int, db: Session = Depends(get_db)) -> None:
    job = db.query(JobMetadata).filter(JobMetadata.metadata_id == job_id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job metadata not found")

    db.delete(job)
    db.commit()
