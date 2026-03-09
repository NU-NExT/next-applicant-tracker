from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.api.routes.admin_dashboard import router as admin_dashboard_router
from app.api.routes.job_data import router as job_data_router
from app.api.routes.job_listings import router as job_listings_router
from app.api.routes.repository import router as repository_router
from app.api.routes.repository_requests import router as repository_requests_router

app = FastAPI(title="NExT Applicant Tracker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://apply.nunext.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(job_data_router)
app.include_router(job_listings_router)
app.include_router(repository_router)
app.include_router(repository_requests_router)
app.include_router(admin_dashboard_router)
