"""One-time download of MobileNetV2 + ImageNet labels (afterwards fully offline).

Usage:  python scripts/download_models.py
On an air-gapped machine, copy mobilenetv2-12.onnx and synset.txt into ./models by hand.
"""
import hashlib
import os
import sys
import urllib.request

BASE = "https://github.com/onnx/models/raw/main/validated/vision/classification"
FILES = {
    "mobilenetv2-12.onnx": f"{BASE}/mobilenet/model/mobilenetv2-12.onnx",
    "synset.txt": f"{BASE}/synset.txt",
}
DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")


def main() -> int:
    os.makedirs(DEST, exist_ok=True)
    for name, url in FILES.items():
        path = os.path.join(DEST, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            print(f"✓ {name} already present")
            continue
        print(f"↓ {url}")
        try:
            tmp = path + ".part"
            urllib.request.urlretrieve(url, tmp)
            os.replace(tmp, path)
        except Exception as exc:
            print(f"✗ {name}: {exc}", file=sys.stderr)
            return 1
        print(f"  saved {os.path.getsize(path)/1e6:.1f} MB  sha256={hashlib.sha256(open(path,'rb').read()).hexdigest()[:16]}…")
    print("Done. Restart the monitor to use MobileNetV2 with ImageNet labels.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
