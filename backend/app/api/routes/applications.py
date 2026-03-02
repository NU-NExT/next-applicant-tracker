from fastapi import APIRouter

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("")
def list_applications() -> list[dict[str, str]]:
    # Placeholder router
    return []
