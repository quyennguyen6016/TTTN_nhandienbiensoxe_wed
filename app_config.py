import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


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


@dataclass(frozen=True)
class Settings:
    model_path: Path
    easyocr_gpu: bool
    ocr_languages: list[str]
    detection_interval: int
    max_inference_edge: int
    inference_imgsz: int


settings = Settings(
    model_path=Path(
        os.getenv(
            "PLATE_MODEL_PATH",
            BASE_DIR / "runs" / "detect" / "train_bien_so_100epoch" / "weights" / "best.pt",
        )
    ),
    easyocr_gpu=_bool_from_env("EASYOCR_GPU", True),
    ocr_languages=_list_from_env("OCR_LANGUAGES", ["vi"]),
    detection_interval=_int_from_env("DETECTION_INTERVAL", 15),
    max_inference_edge=_int_from_env("MAX_INFERENCE_EDGE", 1280),
    inference_imgsz=_int_from_env("INFERENCE_IMGSZ", 640),
)
