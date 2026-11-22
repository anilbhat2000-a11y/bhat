"""Model resolution: a downloaded classifier if present, else a built-in network.

* ``models/mobilenetv2-12.onnx`` + ``models/synset.txt`` (fetch once with
  ``python scripts/download_models.py``; afterwards fully offline) gives real
  ImageNet labels.
* Otherwise a deterministic built-in CNN is generated locally with the ``onnx``
  package. It has no semantic labels but produces a realistic NPU workload
  (convolutions, BN-folded, ReLU, pooling, FC) so utilisation can be observed
  on an air-gapped machine with nothing downloaded.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

import numpy as np

MODELS_DIR = os.environ.get(
    "NPU_MONITOR_MODELS", os.path.join(os.path.dirname(__file__), "..", "..", "models")
)
INPUT_SIZE = 224


@dataclass
class ModelInfo:
    name: str
    path: str
    labels: list[str] = field(default_factory=list)
    builtin: bool = False


def _builtin_model(path: str) -> None:
    import onnx
    from onnx import TensorProto, helper, numpy_helper

    rng = np.random.default_rng(1234)
    nodes, inits = [], []
    channels = [3, 32, 64, 128, 256, 512]
    prev = "input"
    for i in range(len(channels) - 1):
        cin, cout = channels[i], channels[i + 1]
        w = (rng.standard_normal((cout, cin, 3, 3)) * np.sqrt(2.0 / (cin * 9))).astype(np.float32)
        b = np.zeros(cout, np.float32)
        inits += [numpy_helper.from_array(w, f"w{i}"), numpy_helper.from_array(b, f"b{i}")]
        nodes.append(helper.make_node("Conv", [prev, f"w{i}", f"b{i}"], [f"c{i}"],
                                      kernel_shape=[3, 3], pads=[1, 1, 1, 1], strides=[2, 2]))
        nodes.append(helper.make_node("Relu", [f"c{i}"], [f"r{i}"]))
        # A second same-width conv per stage to give the NPU real work.
        w2 = (rng.standard_normal((cout, cout, 3, 3)) * np.sqrt(2.0 / (cout * 9))).astype(np.float32)
        inits += [numpy_helper.from_array(w2, f"w{i}b"), numpy_helper.from_array(b, f"b{i}b")]
        nodes.append(helper.make_node("Conv", [f"r{i}", f"w{i}b", f"b{i}b"], [f"c{i}b"],
                                      kernel_shape=[3, 3], pads=[1, 1, 1, 1]))
        nodes.append(helper.make_node("Relu", [f"c{i}b"], [f"r{i}b"]))
        prev = f"r{i}b"
    nodes.append(helper.make_node("GlobalAveragePool", [prev], ["gap"]))
    nodes.append(helper.make_node("Flatten", ["gap"], ["flat"], axis=1))
    fc = (rng.standard_normal((channels[-1], 1000)) * 0.05).astype(np.float32)
    inits += [numpy_helper.from_array(fc, "fc"), numpy_helper.from_array(np.zeros(1000, np.float32), "fcb")]
    nodes.append(helper.make_node("Gemm", ["flat", "fc", "fcb"], ["output"]))

    graph = helper.make_graph(
        nodes, "npu_monitor_builtin",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, INPUT_SIZE, INPUT_SIZE])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 1000])],
        inits,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)])
    model.ir_version = 8  # broadly loadable by ORT / OpenVINO / QNN / Vitis AI
    onnx.checker.check_model(model)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    onnx.save(model, path)


def resolve_model() -> ModelInfo:
    d = os.path.abspath(MODELS_DIR)
    custom = os.environ.get("NPU_MONITOR_MODEL")
    if custom:
        return ModelInfo(os.path.basename(custom), custom, _labels(d))
    mobilenet = os.path.join(d, "mobilenetv2-12.onnx")
    if os.path.exists(mobilenet):
        return ModelInfo("MobileNetV2 (ImageNet)", mobilenet, _labels(d))
    path = os.path.join(d, "builtin_cnn.onnx")
    if not os.path.exists(path):
        _builtin_model(path)
    return ModelInfo("Built-in CNN (workload generator)", path, [], builtin=True)


def _labels(d: str) -> list[str]:
    p = os.path.join(d, "synset.txt")
    if not os.path.exists(p):
        return []
    with open(p, encoding="utf-8") as f:
        # "n01440764 tench, Tinca tinca" -> "tench"
        return [ln.strip().split(" ", 1)[-1].split(",")[0] for ln in f if ln.strip()]
