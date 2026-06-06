import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def _bool_from_env(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int_from_env(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    return int(value)


def _list_from_env(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def _resolve_path(value, default: Path) -> Path:
    if not value:
        return default
    path = Path(value)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


@dataclass(frozen=True)
class Settings:
    model_path: Path
    paddleocr_use_gpu: bool
    ocr_languages: list[str]
    paddleocr_version: str | None
    detection_interval: int
    max_inference_edge: int
    inference_imgsz: int


settings = Settings(
    model_path=_resolve_path(
        os.getenv("PLATE_MODEL_PATH"),
        PROJECT_ROOT
        / "runs"
        / "detect"
        / "train_bien_so_100epoch"
        / "weights"
        / "best.pt",
    ),
    paddleocr_use_gpu=_bool_from_env("PADDLEOCR_USE_GPU", False),
    ocr_languages=_list_from_env("PADDLEOCR_LANGUAGES", _list_from_env("OCR_LANGUAGES", ["vi"])),
    paddleocr_version=os.getenv("PADDLEOCR_VERSION"),
    detection_interval=_int_from_env("DETECTION_INTERVAL", 15),
    max_inference_edge=_int_from_env("MAX_INFERENCE_EDGE", 1280),
    inference_imgsz=_int_from_env("INFERENCE_IMGSZ", 640),
)
