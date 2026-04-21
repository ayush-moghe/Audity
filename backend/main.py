from pathlib import Path
from uuid import uuid4
import shutil
import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    # AudioSeal import is optional during initial setup.
    # If unavailable, route falls back to file-copy behavior until installed.
    from audioseal import AudioSeal  # type: ignore

    AUDIOSEAL_AVAILABLE = True
except Exception:
    AudioSeal = None
    AUDIOSEAL_AVAILABLE = False


app = FastAPI(title="Audity API", version="0.1.0")

raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
)
cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
RAW_DIR = UPLOAD_DIR / "raw"
WATERMARKED_DIR = UPLOAD_DIR / "watermarked"

RAW_DIR.mkdir(parents=True, exist_ok=True)
WATERMARKED_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/watermark")
async def watermark_audio(
    file: UploadFile = File(...),
    name: str = Form(...),
    public: bool = Form(False),
) -> dict[str, object]:
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio uploads are allowed.")

    extension = Path(file.filename or "audio.wav").suffix or ".wav"
    base_name = f"{uuid4().hex}{extension}"
    raw_path = RAW_DIR / base_name
    watermarked_path = WATERMARKED_DIR / f"wm_{base_name}"

    with raw_path.open("wb") as target:
        shutil.copyfileobj(file.file, target)

    # Starter integration point for AudioSeal.
    # Replace copy fallback with your real AudioSeal watermark pipeline.
    if AUDIOSEAL_AVAILABLE:
        # Example placeholder for future integration:
        # model = AudioSeal.load_generator("base")
        # watermarked = model.apply_watermark(raw_path)
        # save watermarked output to watermarked_path
        shutil.copy(raw_path, watermarked_path)
        engine = "audioseal"
    else:
        shutil.copy(raw_path, watermarked_path)
        engine = "copy-fallback"

    file_path = watermarked_path.relative_to(BASE_DIR).as_posix()

    return {
        "message": "Watermark completed.",
        "name": name,
        "public": public,
        "file_path": file_path,
        "mos": None,
        "engine": engine,
    }
