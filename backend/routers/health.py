from fastapi import APIRouter
import os

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "gpu": os.getenv("GPU_MODEL", "unknown"),
        "vram_gb": os.getenv("GPU_VRAM_GB", "unknown"),
    }
