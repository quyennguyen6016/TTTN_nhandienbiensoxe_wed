"""Long-running AI worker: load models once, serve JSON-line requests on stdin."""

import contextlib
import io
import json
import sys
from pathlib import Path

import cv2

from chuc_nang import PlateRecognitionService


def write_message(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def run_recognition(service: PlateRecognitionService, image_path: str, annotated_path: str | None):
    inference_logs = io.StringIO()
    with contextlib.redirect_stdout(inference_logs):
        result = service.recognize_image_path(image_path)

    if not result:
        return {"success": False, "message": "No plate detected."}

    image = result.pop("image", None)
    if image is not None and annotated_path:
        output_path = Path(annotated_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), image)

    return {"success": True, "data": result}


def main() -> None:
    bootstrap_logs = io.StringIO()
    with contextlib.redirect_stdout(bootstrap_logs):
        service = PlateRecognitionService()

    write_message({"type": "ready"})

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        request_id = None
        try:
            request = json.loads(line)
            request_id = request.get("id")
            image_path = request.get("image_path")
            annotated_path = request.get("annotated_path")

            if not image_path:
                write_message(
                    {
                        "id": request_id,
                        "success": False,
                        "message": "image_path is required.",
                    }
                )
                continue

            response = run_recognition(service, image_path, annotated_path)
            write_message({"id": request_id, **response})
        except Exception as error:  # noqa: BLE001
            write_message(
                {
                    "id": request_id,
                    "success": False,
                    "message": str(error),
                }
            )


if __name__ == "__main__":
    main()
