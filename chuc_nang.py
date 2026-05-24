import datetime
from pathlib import Path

import cv2
import easyocr
from ultralytics import YOLO

from app_config import settings
from bien_so_map import BIEN_SO_MAP
from bien_so_map_dau import BIEN_SO_MAP_DAU


class PlateRecognitionService:
    """Core AI service for plate detection and OCR.

    This class has no Tkinter dependency, so it can be reused later by a
    Python API service that is called from the Node.js backend.
    """

    def __init__(
        self,
        model_path=None,
        use_gpu=None,
        ocr_languages=None,
        detection_interval=None,
    ):
        self.model_path = Path(model_path or settings.model_path)
        self.use_gpu = settings.easyocr_gpu if use_gpu is None else use_gpu
        self.ocr_languages = ocr_languages or settings.ocr_languages
        self.detection_interval = detection_interval or settings.detection_interval

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"YOLO model not found: {self.model_path}. "
                "Update PLATE_MODEL_PATH in .env or app_config.py."
            )

        self.inference_imgsz = settings.inference_imgsz
        self.max_inference_edge = settings.max_inference_edge
        self.model = YOLO(str(self.model_path))
        self.reader = easyocr.Reader(self.ocr_languages, gpu=self.use_gpu)

        self.frame_count = 0
        self.last_results = []

    def recognize_image_path(self, image_path):
        frame = cv2.imread(str(image_path))
        if frame is None:
            return None
        frame = self._resize_for_inference(frame)
        return self.recognize_frame(frame, use_cache=False, annotate=True)

    def _resize_for_inference(self, frame):
        height, width = frame.shape[:2]
        max_edge = self.max_inference_edge
        if max(height, width) <= max_edge:
            return frame

        scale = max_edge / max(height, width)
        new_width = max(1, int(width * scale))
        new_height = max(1, int(height * scale))
        return cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)

    def recognize_frame(self, frame, use_cache=False, annotate=True):
        results = self._detect(frame, use_cache=use_cache)
        best_detection = None

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            coords = boxes.xyxy.cpu().numpy()
            confidences = (
                boxes.conf.cpu().numpy()
                if boxes.conf is not None
                else [None] * len(coords)
            )

            for box, confidence in zip(coords, confidences):
                x1, y1, x2, y2 = map(int, box[:4])
                crop = frame[y1:y2, x1:x2]
                if crop.size == 0:
                    continue

                text, ocr_confidence = self._read_plate_text(crop)
                if not text:
                    continue

                province_code = self._extract_province_code(text)
                location = BIEN_SO_MAP.get(province_code, "Khong ro dia phuong")
                score = self._merge_confidence(confidence, ocr_confidence)

                detection = {
                    "plate": text,
                    "province_code": province_code,
                    "location": location,
                    "confidence": score,
                    "bbox": [x1, y1, x2, y2],
                }

                if self._is_better_detection(detection, best_detection):
                    best_detection = detection

                if annotate:
                    self._draw_detection(frame, detection)

        if not best_detection:
            return None

        return self._build_record(best_detection["plate"], best_detection, frame)

    def _detect(self, frame, use_cache=False):
        if not use_cache:
            return self.model(frame, verbose=False, imgsz=self.inference_imgsz)

        self.frame_count += 1
        should_detect = (
            self.frame_count % self.detection_interval == 0
            or not self.last_results
        )
        if should_detect:
            self.last_results = self.model(frame, verbose=False, imgsz=self.inference_imgsz)
        return self.last_results

    def _read_plate_text(self, crop):
        ocr_results = self.reader.readtext(crop)
        if not ocr_results:
            return "", None

        text_parts = []
        confidences = []
        for result in ocr_results:
            text_parts.append(result[1])
            if len(result) > 2:
                confidences.append(float(result[2]))

        text = " ".join(text_parts).strip()
        confidence = sum(confidences) / len(confidences) if confidences else None
        return text, confidence

    def _build_record(self, plate, detection=None, image=None):
        province_code = self._extract_province_code(plate)
        location = BIEN_SO_MAP_DAU.get(province_code, "Khong ro dia phuong")

        record = {
            "plate": plate,
            "location": location,
            "province_code": province_code,
            "time": datetime.datetime.now().strftime("%H:%M:%S %d/%m/%Y"),
            "confidence": detection.get("confidence") if detection else None,
            "bbox": detection.get("bbox") if detection else None,
        }

        if image is not None:
            record["image"] = image

        return record

    def _extract_province_code(self, plate):
        cleaned = plate.strip()
        return cleaned.split("-")[0] if "-" in cleaned else cleaned[:2]

    def _merge_confidence(self, yolo_confidence, ocr_confidence):
        values = [
            value
            for value in (yolo_confidence, ocr_confidence)
            if value is not None
        ]
        if not values:
            return None
        return round(float(sum(values) / len(values)), 4)

    def _is_better_detection(self, candidate, current):
        if current is None:
            return True
        candidate_score = candidate.get("confidence") or 0
        current_score = current.get("confidence") or 0
        return candidate_score > current_score

    def _draw_detection(self, frame, detection):
        x1, y1, x2, y2 = detection["bbox"]
        label = f"{detection['plate']} ({detection['location']})"
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            frame,
            label,
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2,
        )
