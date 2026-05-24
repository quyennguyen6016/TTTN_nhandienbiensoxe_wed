import argparse
import contextlib
import io
import json
from pathlib import Path

import cv2

from ai.service import PlateRecognitionService


def main():
    parser = argparse.ArgumentParser(description="Recognize a license plate from an image.")
    parser.add_argument("image_path", help="Path to the input image.")
    parser.add_argument(
        "--save-annotated",
        help="Optional path to save the image with bounding boxes.",
    )
    args = parser.parse_args()

    inference_logs = io.StringIO()
    with contextlib.redirect_stdout(inference_logs):
        service = PlateRecognitionService()
        result = service.recognize_image_path(args.image_path)

    if not result:
        print(json.dumps({"success": False, "message": "No plate detected."}))
        return

    image = result.pop("image", None)
    if image is not None and args.save_annotated:
        output_path = Path(args.save_annotated)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), image)
        result["annotated_image_path"] = str(output_path)

    print(json.dumps({"success": True, "data": result}, ensure_ascii=False))


if __name__ == "__main__":
    main()
