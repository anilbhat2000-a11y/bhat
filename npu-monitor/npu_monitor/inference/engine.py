"""Hardware-accelerated inference on NPU, GPU or CPU.

Backends discovered at start-up (any subset may be installed):

=================  ==========================  ==============================
Backend            Hardware                    Package
=================  ==========================  ==============================
OpenVINO           Intel NPU / iGPU / CPU      ``openvino``
ORT + QNN EP       Qualcomm Hexagon NPU        ``onnxruntime-qnn``
ORT + VitisAI EP   AMD Ryzen AI (XDNA) NPU     Ryzen AI Software's onnxruntime
ORT + OpenVINO EP  Intel NPU / GPU             ``onnxruntime-openvino``
ORT + DirectML EP  Any DX12 GPU (Windows)      ``onnxruntime-directml``
ORT + CUDA EP      NVIDIA GPU                  ``onnxruntime-gpu``
ORT CPU            CPU                         ``onnxruntime``
=================  ==========================  ==============================
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass

import numpy as np
from PIL import Image

from ..telemetry.npu import BUSY
from ..telemetry.sampler import INFERENCE
from .models import INPUT_SIZE, ModelInfo, resolve_model

_MEAN = np.array([0.485, 0.456, 0.406], np.float32)
_STD = np.array([0.229, 0.224, 0.225], np.float32)

# ORT execution provider -> (kind, label, provider options)
_ORT_EPS = {
    "QNNExecutionProvider": ("npu", "Qualcomm Hexagon NPU (QNN)",
                             {"backend_path": "QnnHtp.dll", "enable_htp_fp16_precision": "1"}),
    "VitisAIExecutionProvider": ("npu", "AMD Ryzen AI NPU (Vitis AI)", {}),
    "DmlExecutionProvider": ("gpu", "GPU (DirectML)", {}),
    "CUDAExecutionProvider": ("gpu", "NVIDIA GPU (CUDA)", {}),
    "CPUExecutionProvider": ("cpu", "CPU (ONNX Runtime)", {}),
}


@dataclass
class Device:
    id: str      # e.g. "openvino:NPU", "ort:QNNExecutionProvider"
    kind: str    # "npu" | "gpu" | "cpu"
    label: str
    backend: str

    def as_dict(self) -> dict:
        return self.__dict__.copy()


def discover_devices() -> list[Device]:
    devices: list[Device] = []
    try:
        import openvino as ov

        core = ov.Core()
        for d in core.available_devices:
            kind = d.split(".")[0].lower()
            if kind not in ("npu", "gpu", "cpu"):
                continue
            try:
                name = core.get_property(d, "FULL_DEVICE_NAME")
            except Exception:
                name = d
            devices.append(Device(f"openvino:{d}", kind, f"{name} (OpenVINO {d})", "openvino"))
    except Exception:
        pass
    try:
        import onnxruntime as ort

        for ep in ort.get_available_providers():
            if ep == "OpenVINOExecutionProvider":
                for dt, kind in (("NPU", "npu"), ("GPU", "gpu")):
                    devices.append(Device(f"ort:{ep}:{dt}", kind, f"Intel {dt} (ORT OpenVINO EP)", "ort"))
            elif ep in _ORT_EPS:
                kind, label, _ = _ORT_EPS[ep]
                devices.append(Device(f"ort:{ep}", kind, label, "ort"))
    except Exception:
        pass
    order = {"npu": 0, "gpu": 1, "cpu": 2}
    devices.sort(key=lambda d: (order[d.kind], d.backend != "openvino"))
    return devices


def preprocess(img: Image.Image) -> np.ndarray:
    """Letterbox to 224x224 (keeps aspect ratio), ImageNet-normalise, NCHW."""
    img = img.convert("RGB")
    img.thumbnail((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR)
    canvas = Image.new("RGB", (INPUT_SIZE, INPUT_SIZE), (124, 116, 104))
    canvas.paste(img, ((INPUT_SIZE - img.width) // 2, (INPUT_SIZE - img.height) // 2))
    x = (np.asarray(canvas, np.float32) / 255.0 - _MEAN) / _STD
    return np.ascontiguousarray(x.transpose(2, 0, 1)[None])


class Engine:
    """One compiled model on one device. ``infer`` is thread-safe."""

    def __init__(self, device: Device, model: ModelInfo) -> None:
        self.device, self.model = device, model
        self._lock = threading.Lock()
        t0 = time.perf_counter()
        if device.backend == "openvino":
            import openvino as ov

            core = ov.Core()
            m = core.read_model(model.path)
            m.reshape({m.inputs[0].any_name: [1, 3, INPUT_SIZE, INPUT_SIZE]})  # NPUs need static shapes
            dev = device.id.split(":", 1)[1]
            cfg = {"PERFORMANCE_HINT": "LATENCY"}
            self._compiled = core.compile_model(m, dev, cfg)
            self._req = self._compiled.create_infer_request()
            self._run = self._run_ov
        else:
            import onnxruntime as ort

            parts = device.id.split(":")
            ep = parts[1]
            if ep == "OpenVINOExecutionProvider":
                providers = [(ep, {"device_type": parts[2]}), "CPUExecutionProvider"]
            else:
                opts = _ORT_EPS.get(ep, ("", "", {}))[2]
                providers = [(ep, opts)] + ([] if ep == "CPUExecutionProvider" else ["CPUExecutionProvider"])
            so = ort.SessionOptions()
            self._sess = ort.InferenceSession(model.path, so, providers=providers)
            self._in = self._sess.get_inputs()[0].name
            self._run = self._run_ort
        self.compile_ms = round((time.perf_counter() - t0) * 1000, 1)
        self._run(np.zeros((1, 3, INPUT_SIZE, INPUT_SIZE), np.float32))  # warm-up

    def _run_ov(self, x: np.ndarray) -> np.ndarray:
        self._req.infer({0: x})
        return np.asarray(self._req.get_output_tensor(0).data).copy()

    def _run_ort(self, x: np.ndarray) -> np.ndarray:
        return self._sess.run(None, {self._in: x})[0]

    def infer(self, x: np.ndarray, workload: str = "adhoc") -> tuple[np.ndarray, float]:
        with self._lock:
            t0 = time.monotonic()
            out = self._run(x)
            t1 = time.monotonic()
        BUSY.record(self.device.kind, t0, t1)
        lat = (t1 - t0) * 1000
        INFERENCE.record(self.device.kind, lat, workload)
        return out, lat

    def classify(self, img: Image.Image, workload: str = "adhoc", top_k: int = 5) -> dict:
        logits, lat = self.infer(preprocess(img), workload)
        v = logits.reshape(-1).astype(np.float64)
        p = np.exp(v - v.max())
        p /= p.sum()
        idx = np.argsort(-p)[:top_k]
        labels = self.model.labels
        top = [
            {"label": labels[i] if i < len(labels) else f"feature #{i}", "score": round(float(p[i]), 4)}
            for i in idx
        ]
        return {"top": top, "latency_ms": round(lat, 2), "device": self.device.id, "kind": self.device.kind}


class EngineManager:
    """Discovers devices once and caches one compiled ``Engine`` per device."""

    def __init__(self) -> None:
        self.model = resolve_model()
        self.devices = discover_devices()
        self._engines: dict[str, Engine] = {}
        self._errors: dict[str, str] = {}
        self._lock = threading.Lock()

    def default_device(self) -> str | None:
        return self.devices[0].id if self.devices else None

    def device(self, device_id: str) -> Device:
        for d in self.devices:
            if d.id == device_id:
                return d
        raise KeyError(f"unknown device {device_id!r}")

    def get(self, device_id: str | None) -> Engine:
        device_id = device_id or self.default_device()
        if device_id is None:
            raise RuntimeError("no inference backend installed (pip install openvino or onnxruntime)")
        with self._lock:
            if device_id not in self._engines:
                try:
                    self._engines[device_id] = Engine(self.device(device_id), self.model)
                    self._errors.pop(device_id, None)
                except Exception as exc:
                    self._errors[device_id] = str(exc)
                    raise RuntimeError(f"could not load model on {device_id}: {exc}") from exc
            return self._engines[device_id]

    def describe(self) -> dict:
        return {
            "model": {"name": self.model.name, "builtin": self.model.builtin, "labels": len(self.model.labels)},
            "devices": [d.as_dict() for d in self.devices],
            "default_device": self.default_device(),
            "loaded": {k: {"compile_ms": e.compile_ms} for k, e in self._engines.items()},
            "errors": self._errors,
        }
