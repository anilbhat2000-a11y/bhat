"""Detector interface + optional ONNX YOLO implementation.

The ONNX detector needs `numpy` and `onnxruntime` (or `onnxruntime-gpu`), which
are NOT in requirements.txt because the right build depends on your hardware
(CUDA / TensorRT on NVIDIA, OpenVINO on Intel, Jetson wheels on Jetson).
It expects a YOLOv8-style export: input [1,3,H,W] float 0..1 RGB, output
[1, 4+num_classes, N] with (cx, cy, w, h) in input pixels.
STATUS: written to that published layout but NOT tested in this repo (no model
or GPU here). Validate with the evaluation harness before production use.
"""
from __future__ import annotations

from typing import Protocol

from .engine import Detection

COCO80 = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
          "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
          "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
          "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
          "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
          "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
          "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard",
          "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase",
          "scissors", "teddy bear", "hair drier", "toothbrush"]


class Detector(Protocol):
    def detect(self, rgb: bytes, width: int, height: int) -> list[Detection]: ...


class OnnxYoloDetector:
    def __init__(self, model_path: str, labels: list[str] | None = None, input_size: int = 640,
                 conf: float = 0.35, nms_iou: float = 0.5, providers: list[str] | None = None) -> None:
        import numpy as np  # noqa: F401  (fail fast if missing)
        import onnxruntime as ort
        self.np = np
        self.sess = ort.InferenceSession(model_path, providers=providers or ort.get_available_providers())
        self.input_name = self.sess.get_inputs()[0].name
        self.labels = labels or COCO80
        self.size = input_size
        self.conf = conf
        self.nms_iou = nms_iou

    def detect(self, rgb: bytes, width: int, height: int) -> list[Detection]:
        np = self.np
        # Frames must already be resized to input_size x input_size by the reader.
        if (width, height) != (self.size, self.size):
            raise ValueError(f"expected {self.size}x{self.size} frame, got {width}x{height}")
        img = np.frombuffer(rgb, dtype=np.uint8).reshape(height, width, 3).astype(np.float32) / 255.0
        x = img.transpose(2, 0, 1)[None]
        out = self.sess.run(None, {self.input_name: x})[0][0]  # [4+C, N]
        boxes, scores = out[:4].T, out[4:].T
        cls_ids = scores.argmax(1)
        confs = scores.max(1)
        keep = confs >= self.conf
        dets = []
        for (cx, cy, w, h), c, k in zip(boxes[keep], confs[keep], cls_ids[keep]):
            x1, y1, x2, y2 = (cx - w / 2) / width, (cy - h / 2) / height, (cx + w / 2) / width, (cy + h / 2) / height
            dets.append(Detection(self.labels[int(k)], float(c), (max(0, x1), max(0, y1), min(1, x2), min(1, y2))))
        return _nms(dets, self.nms_iou)


def _nms(dets: list[Detection], thr: float) -> list[Detection]:
    from .engine import iou
    dets = sorted(dets, key=lambda d: d.conf, reverse=True)
    kept: list[Detection] = []
    for d in dets:
        if all(k.cls != d.cls or iou(k.box, d.box) < thr for k in kept):
            kept.append(d)
    return kept
