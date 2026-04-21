from pathlib import Path
from uuid import uuid4
import os
import ssl
import io
import json
import tempfile
import urllib.error
import urllib.request
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import certifi
import torch
import torchaudio

CA_BUNDLE_PATH = certifi.where()
os.environ.setdefault("SSL_CERT_FILE", CA_BUNDLE_PATH)
os.environ.setdefault("REQUESTS_CA_BUNDLE", CA_BUNDLE_PATH)
os.environ.setdefault("CURL_CA_BUNDLE", CA_BUNDLE_PATH)

ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=CA_BUNDLE_PATH)

try:
    from audioseal import AudioSeal  # type: ignore
    AUDIOSEAL_AVAILABLE = True
except Exception:
    AudioSeal = None
    AUDIOSEAL_AVAILABLE = False


app = FastAPI(title="Audity API", version="0.1.0")


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        cleaned_key = key.strip()
        cleaned_value = value.strip().strip('"').strip("'")
        if cleaned_key and cleaned_key not in os.environ:
            os.environ[cleaned_key] = cleaned_value


load_env_file(Path(__file__).resolve().parent / "backend.env")

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
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_AUDIO_BUCKET = os.getenv("SUPABASE_AUDIO_BUCKET", "audios")
AUDIOSEAL_DEVICE = os.getenv("AUDIOSEAL_DEVICE", "cpu")

TARGET_SAMPLE_RATE = 16000

_audioseal_generator = None
_audioseal_detector = None


def is_jwt_token(token: str) -> bool:
    return token.count(".") == 2 and token.startswith("ey")


def make_supabase_request(
    url: str,
    method: str,
    body: bytes | None = None,
    content_type: str = "application/json",
) -> bytes:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing Supabase storage configuration in backend.env.",
        )

    if not (
        is_jwt_token(SUPABASE_SERVICE_ROLE_KEY)
        or SUPABASE_SERVICE_ROLE_KEY.startswith("sb_secret_")
    ):
        raise HTTPException(
            status_code=500,
            detail=(
                "Invalid SUPABASE_SERVICE_ROLE_KEY format. "
                "Use a service_role JWT or an sb_secret key from Supabase settings."
            ),
        )

    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("apikey", SUPABASE_SERVICE_ROLE_KEY)
    if is_jwt_token(SUPABASE_SERVICE_ROLE_KEY):
        req.add_header("Authorization", f"Bearer {SUPABASE_SERVICE_ROLE_KEY}")
    if content_type:
        req.add_header("Content-Type", content_type)

    ssl_context = ssl.create_default_context(cafile=CA_BUNDLE_PATH)

    try:
        with urllib.request.urlopen(req, timeout=30, context=ssl_context) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=502,
            detail=f"Supabase request failed with HTTP {exc.code}: {error_body or exc.reason}",
        ) from exc
    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase request failed: {exc.reason}",
        ) from exc


def upload_file_to_supabase_storage(
    file_bytes: bytes,
    object_path: str,
    content_type: str,
) -> str:
    upload_url = (
        f"{SUPABASE_URL}/storage/v1/object/"
        f"{quote(SUPABASE_AUDIO_BUCKET, safe='')}/"
        f"{quote(object_path, safe='/')}"
    )

    req = urllib.request.Request(upload_url, data=file_bytes, method="POST")
    req.add_header("apikey", SUPABASE_SERVICE_ROLE_KEY)
    if is_jwt_token(SUPABASE_SERVICE_ROLE_KEY):
        req.add_header("Authorization", f"Bearer {SUPABASE_SERVICE_ROLE_KEY}")
    req.add_header("content-type", content_type)
    req.add_header("cache-control", "3600")
    req.add_header("x-upsert", "true")

    ssl_context = ssl.create_default_context(cafile=CA_BUNDLE_PATH)

    try:
        with urllib.request.urlopen(req, timeout=90, context=ssl_context) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=502,
            detail=f"Supabase upload failed with HTTP {exc.code}: {error_body or exc.reason}",
        ) from exc
    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase upload failed: {exc.reason}",
        ) from exc

    return object_path


def build_public_storage_url(object_path: str) -> str:
    return (
        f"{SUPABASE_URL}/storage/v1/object/public/"
        f"{quote(SUPABASE_AUDIO_BUCKET, safe='')}/"
        f"{quote(object_path, safe='/')}"
    )


def get_audioseal_generator():
    global _audioseal_generator

    if _audioseal_generator is not None:
        return _audioseal_generator

    if not AUDIOSEAL_AVAILABLE or AudioSeal is None:
        raise HTTPException(
            status_code=503,
            detail="AudioSeal library is not available on backend.",
        )

    try:
        generator = AudioSeal.load_generator("audioseal_wm_16bits")
        generator.eval()
        generator.to(AUDIOSEAL_DEVICE)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to initialize AudioSeal generator: {exc}",
        ) from exc

    _audioseal_generator = generator
    return _audioseal_generator


def get_audioseal_detector():
    global _audioseal_detector

    if _audioseal_detector is not None:
        return _audioseal_detector

    if not AUDIOSEAL_AVAILABLE or AudioSeal is None:
        raise HTTPException(
            status_code=503,
            detail="AudioSeal library is not available on backend.",
        )

    try:
        detector = AudioSeal.load_detector("audioseal_detector_16bits")
        detector.eval()
        detector.to(AUDIOSEAL_DEVICE)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to initialize AudioSeal detector: {exc}",
        ) from exc

    _audioseal_detector = detector
    return _audioseal_detector


def decode_audio(file_bytes: bytes, filename: str | None) -> tuple[torch.Tensor, int]:
    """
    Decodes audio bytes into a waveform tensor resampled to TARGET_SAMPLE_RATE.
    Returns:
        waveform: (1, frames) float32 tensor on AUDIOSEAL_DEVICE
        sample_rate: always TARGET_SAMPLE_RATE
    """
    audio_stream = io.BytesIO(file_bytes)

    try:
        waveform, sample_rate = torchaudio.load(audio_stream)
    except Exception:
        ext = Path(filename or "").suffix.lstrip(".") or None
        audio_stream.seek(0)
        try:
            waveform, sample_rate = torchaudio.load(audio_stream, format=ext)
        except Exception as inner_exc:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to decode uploaded audio: {inner_exc}",
            ) from inner_exc

    if waveform.ndim != 2 or waveform.shape[-1] == 0:
        raise HTTPException(status_code=400, detail="Uploaded audio is empty or invalid.")

    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    if sample_rate != TARGET_SAMPLE_RATE:
        waveform = torchaudio.functional.resample(waveform, sample_rate, TARGET_SAMPLE_RATE)

    return waveform.to(AUDIOSEAL_DEVICE), TARGET_SAMPLE_RATE


def encode_audio_to_wav(waveform: torch.Tensor) -> bytes:
    """
    Encodes a (1, frames) or (channels, frames) waveform tensor to WAV bytes.
    Uses a real temp file with a .wav extension to satisfy the TorchCodec backend,
    which cannot infer format from a BytesIO buffer.
    """
    if waveform.ndim == 3:
        waveform = waveform.squeeze(0)

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
        torchaudio.save(tmp_path, waveform.cpu(), sample_rate=TARGET_SAMPLE_RATE)
        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


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

    if not AUDIOSEAL_AVAILABLE:
        raise HTTPException(status_code=503, detail="AudioSeal library is not available.")

    original_bytes = await file.read()
    if not original_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    waveform, sample_rate = decode_audio(original_bytes, file.filename)
    waveform_batched = waveform.unsqueeze(0)  # (1, 1, frames)

    generator = get_audioseal_generator()

    try:
        with torch.inference_mode():
            watermarked = generator(waveform_batched, sample_rate=sample_rate)
            watermarked = watermarked.squeeze(0)  # (1, frames)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AudioSeal watermarking failed: {exc}",
        ) from exc

    watermarked_bytes = encode_audio_to_wav(watermarked)

    base_name = f"wm_{uuid4().hex}.wav"
    object_path = f"watermarked/{base_name}"
    upload_file_to_supabase_storage(watermarked_bytes, object_path, "audio/wav")
    public_url = build_public_storage_url(object_path)

    return {
        "message": "Watermark completed.",
        "name": name,
        "public": public,
        "file_path": object_path,
        "storage_path": object_path,
        "public_url": public_url,
        "mos": None,
        "engine": "audioseal",
    }


@app.post("/detect")
async def detect_audio(file: UploadFile = File(...)) -> dict[str, object]:
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio uploads are allowed.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    waveform, sample_rate = decode_audio(file_bytes, file.filename)
    waveform_batched = waveform.unsqueeze(0)  # (1, 1, frames)

    detector = get_audioseal_detector()

    try:
        with torch.inference_mode():
            detect_prob, _ = detector.detect_watermark(waveform_batched, sample_rate=sample_rate)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AudioSeal detection failed: {exc}",
        ) from exc

    confidence = float(detect_prob.detach().cpu().flatten()[0].item())
    is_watermarked = confidence >= 0.5

    return {
        "is_watermarked": is_watermarked,
        "confidence": confidence,
        "engine": "audioseal-detector",
        "filename": file.filename,
        "message": "Detection completed.",
    }


@app.delete("/delete/{id}")
async def delete_audio(id: int) -> dict[str, object]:
    # 1. Fetch the row to get file_path
    row_url = f"{SUPABASE_URL}/rest/v1/Audios?id=eq.{id}&select=file_path"
    row_data = make_supabase_request(row_url, "GET")

    rows = json.loads(row_data)
    if not rows:
        raise HTTPException(status_code=404, detail=f"Audio with id {id} not found.")

    file_path = rows[0].get("file_path")

    storage_error = None

    # 2. Delete file from storage using direct object path — no body, no content-type
    if file_path:
        storage_delete_url = (
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_AUDIO_BUCKET}/{file_path}"
        )
        print(f"[DELETE] file_path: {repr(file_path)}")
        print(f"[DELETE] storage_delete_url: {storage_delete_url}")
        try:
            make_supabase_request(storage_delete_url, "DELETE", body=None, content_type="")
        except HTTPException as exc:
            storage_error = exc.detail
            print(f"[DELETE] storage error: {exc.detail}")
            # Only re-raise if it's not a 404 (file already gone is fine)
            if "404" not in str(exc.detail):
                raise

    # 3. Delete the row from the Audios table
    delete_row_url = f"{SUPABASE_URL}/rest/v1/Audios?id=eq.{id}"
    make_supabase_request(delete_row_url, "DELETE")

    return {
        "message": f"Audio {id} deleted successfully.",
        "file_path": file_path,
        "storage_error": storage_error,
    }