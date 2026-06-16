import datetime
import re
from pathlib import Path

import cv2
from paddleocr import PaddleOCR
from ultralytics import YOLO

from ai.config import settings
from ai.data.bien_so_map import BIEN_SO_MAP
from ai.data.bien_so_map_dau import BIEN_SO_MAP_DAU


class PlateRecognitionService:
    """Core AI service for plate detection and OCR."""

    def __init__(
        self,
        model_path=None,
        use_gpu=None,
        ocr_languages=None,
        detection_interval=None,
    ):
        self.model_path = Path(model_path or settings.model_path)
        self.use_gpu = settings.paddleocr_use_gpu if use_gpu is None else use_gpu
        self.ocr_languages = ocr_languages or settings.ocr_languages
        self.detection_interval = detection_interval or settings.detection_interval

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"YOLO model not found: {self.model_path}. "
                "Update PLATE_MODEL_PATH in .env or ai/config.py."
            )

        self.inference_imgsz = settings.inference_imgsz
        self.max_inference_edge = settings.max_inference_edge
        self.model = YOLO(str(self.model_path))
        self.reader = self._create_ocr_reader()

        self.frame_count = 0
        self.last_results = []

    def _ocr_lang(self):
        return self.ocr_languages[0] if self.ocr_languages else "en"

    def _ocr_version(self):
        if settings.paddleocr_version:
            return settings.paddleocr_version
        return "PP-OCRv3" if self._ocr_lang() == "vi" else "PP-OCRv5"

    def _create_ocr_reader(self):
        lang = self._ocr_lang()
        ocr_version = self._ocr_version()
        device = "gpu:0" if self.use_gpu else "cpu"

        try:
            return PaddleOCR(
                lang=lang,
                ocr_version=ocr_version,
                device=device,
                enable_mkldnn=False,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=settings.paddleocr_use_textline_orientation,
            )
        except TypeError:
            return PaddleOCR(
                use_angle_cls=settings.paddleocr_use_textline_orientation,
                lang=lang,
                use_gpu=self.use_gpu,
                show_log=False,
            )

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
                x1, y1, x2, y2 = self._clip_box(frame, x1, y1, x2, y2)
                crop_x1, crop_y1, crop_x2, crop_y2 = self._expand_box(frame, x1, y1, x2, y2)
                crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
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

    def _clip_box(self, frame, x1, y1, x2, y2):
        height, width = frame.shape[:2]
        return (
            max(0, min(width, x1)),
            max(0, min(height, y1)),
            max(0, min(width, x2)),
            max(0, min(height, y2)),
        )

    def _expand_box(self, frame, x1, y1, x2, y2, padding_ratio=0.06):
        height, width = frame.shape[:2]
        box_width = max(1, x2 - x1)
        box_height = max(1, y2 - y1)
        pad_x = int(box_width * padding_ratio)
        pad_y = int(box_height * padding_ratio)
        return (
            max(0, x1 - pad_x),
            max(0, y1 - pad_y),
            min(width, x2 + pad_x),
            min(height, y2 + pad_y),
        )

    def _prepare_ocr_images(self, crop):
        height, width = crop.shape[:2]
        scale = max(2.0, min(4.0, 220 / max(1, min(height, width))))
        enlarged = cv2.resize(
            crop,
            (max(1, int(width * scale)), max(1, int(height * scale))),
            interpolation=cv2.INTER_CUBIC,
        )

        gray = cv2.cvtColor(enlarged, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrast = clahe.apply(gray)
        denoised = cv2.bilateralFilter(contrast, 7, 45, 45)
        blurred = cv2.GaussianBlur(denoised, (0, 0), 1.0)
        sharpened = cv2.addWeighted(denoised, 1.6, blurred, -0.6, 0)
        threshold = cv2.adaptiveThreshold(
            sharpened,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            8,
        )

        variants = [
            enlarged,
            cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR),
        ]
        if settings.ocr_preprocess_mode == "accurate":
            variants.extend(
                [
                    cv2.cvtColor(contrast, cv2.COLOR_GRAY2BGR),
                    cv2.cvtColor(threshold, cv2.COLOR_GRAY2BGR),
                ]
            )
        return variants

    def _read_plate_text(self, crop):
        best_text = ""
        best_confidence = None

        for ocr_image in self._prepare_ocr_images(crop):
            raw_text, confidence = self._run_ocr(ocr_image)
            text = self._normalize_plate_text(raw_text)
            if not text:
                continue
            if confidence and confidence >= 0.88 and self._extract_province_code(text) in BIEN_SO_MAP:
                return text, confidence
            if self._is_better_ocr_text(text, confidence, best_text, best_confidence):
                best_text = text
                best_confidence = confidence

        return best_text, best_confidence

    def _run_ocr(self, crop):
        if hasattr(self.reader, "predict"):
            ocr_results = self.reader.predict(crop)
            return self._parse_predict_results(ocr_results)

        ocr_results = self.reader.ocr(crop, cls=True)
        return self._parse_legacy_ocr_results(ocr_results)

    def _is_better_ocr_text(self, candidate, candidate_confidence, current, current_confidence):
        candidate_score = (candidate_confidence or 0) + min(len(candidate), 12) * 0.015
        current_score = (current_confidence or 0) + min(len(current), 12) * 0.015
        if self._extract_province_code(candidate) in BIEN_SO_MAP:
            candidate_score += 0.08
        if current and self._extract_province_code(current) in BIEN_SO_MAP:
            current_score += 0.08
        return candidate_score > current_score

    def _parse_predict_results(self, ocr_results):
        if not ocr_results:
            return "", None

        text_parts = []
        confidences = []
        for result in ocr_results:
            if isinstance(result, dict):
                payload = result
            else:
                payload = getattr(result, "json", None) or {}
                if callable(payload):
                    payload = payload()
            if "res" in payload:
                payload = payload["res"]
            rec_texts = payload.get("rec_texts", [])
            rec_scores = payload.get("rec_scores", [])
            for index, text in enumerate(rec_texts):
                if text:
                    text_parts.append(str(text))
                    if index < len(rec_scores):
                        confidences.append(float(rec_scores[index]))

        text = " ".join(text_parts).strip()
        confidence = sum(confidences) / len(confidences) if confidences else None
        return text, confidence

    def _normalize_plate_text(self, text):
        compact = re.sub(r"[^A-Z0-9]", "", text.upper())
        if len(compact) < 5:
            return ""

        chars = list(compact)
        for index in range(min(2, len(chars))):
            chars[index] = self._to_digit(chars[index])

        province = "".join(chars[:2])
        if not province.isdigit():
            return ""

        tail = chars[2:]
        if len(tail) < 3:
            return province + "".join(tail)

        suffix_len = 5 if len(tail) >= 6 else 4
        serial = tail[:-suffix_len]
        number = [self._to_digit(char) for char in tail[-suffix_len:]]
        if not all(char.isdigit() for char in number):
            return ""

        serial_text = self._normalize_serial("".join(serial))
        number_text = "".join(number)
        if len(number_text) == 5:
            number_text = f"{number_text[:3]}.{number_text[3:]}"
        elif len(number_text) > 5:
            number_text = f"{number_text[:-2]}.{number_text[-2:]}"

        return f"{province}-{serial_text} {number_text}".strip()

    def _normalize_serial(self, serial):
        if not serial:
            return serial
        first_char = {
            "0": "D",
            "1": "I",
            "2": "Z",
            "5": "S",
            "6": "G",
            "8": "B",
        }.get(serial[0], serial[0])
        return first_char + serial[1:]

    def _to_digit(self, char):
        return {
            "O": "0",
            "Q": "0",
            "D": "0",
            "I": "1",
            "L": "1",
            "T": "1",
            "Z": "2",
            "S": "5",
            "G": "6",
            "B": "8",
        }.get(char, char)

    def _parse_legacy_ocr_results(self, ocr_results):
        if not ocr_results:
            return "", None

        text_parts = []
        confidences = []
        for line in ocr_results:
            if not line:
                continue
            for result in line:
                if len(result) < 2:
                    continue
                text_info = result[1]
                if not text_info:
                    continue
                text_parts.append(str(text_info[0]))
                if len(text_info) > 1:
                    confidences.append(float(text_info[1]))

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
