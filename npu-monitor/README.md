# NPU Monitor (on-prem)

A local, fully offline tool for AI laptops with a built-in NPU (Intel Core Ultra, AMD Ryzen AI, Qualcomm Snapdragon X). It:

* shows **NPU utilisation in real time**, with **CPU and GPU** on the same chart, so you can see what NPU work does to the other processors
* runs AI inference on the **NPU** (or GPU/CPU, to compare) against:
  * the **laptop camera**, read on the machine itself or through the browser
  * **screen and graphics capture**
  * uploaded **images (PNG/JPEG/…)**, **PDFs** (every page plus every embedded picture), **Excel** (each sheet drawn as a heat-mapped grid, plus embedded pictures and number stats) and **CSV**
* quantifies the **impact**: average CPU, CPU used by this app, GPU, memory and package power while the NPU is busy compared with idle, the Δ between them, and the correlation r
* includes a **benchmark** that runs the same model on NPU, GPU and CPU in turn after an idle baseline, recording throughput, latency and every processor's load
* exports telemetry as CSV

Nothing leaves the machine. The server binds to `127.0.0.1` by default, and the dashboard has no CDN or internet dependencies.

## Quick start

```bash
python -m venv .venv
```
```bash
# Windows: .venv\Scripts\activate
source .venv/bin/activate
```
```bash
pip install -r requirements.txt
```
```bash
python run.py
```

Your browser opens at http://localhost:8765.

### Install the backend for your NPU

| Laptop | NPU inference | NPU utilisation source |
|---|---|---|
| Intel Core Ultra | `openvino` (in requirements) | Linux: `intel_vpu` sysfs `npu_busy_time_us`; Windows: performance counters |
| AMD Ryzen AI | Ryzen AI Software (onnxruntime + Vitis AI EP) | Windows: performance counters; Linux: in-app estimate |
| Snapdragon X | `pip install onnxruntime-qnn` | Windows: performance counters |
| Any GPU | `onnxruntime-directml` (Windows) / `onnxruntime-gpu` (NVIDIA) | NVML, amdgpu/i915/xe sysfs, Windows counters |

The header badge always shows where the NPU number comes from:
* **hardware counter**: the OS or driver figure, which covers NPU load from *every* process (the same source as Task Manager on Windows).
* **in-app estimate**: shown when no counter can be read. It is the share of time this app kept the NPU busy.

If Windows picks the wrong adapter as the NPU, set `NPU_MONITOR_NPU_LUID=0x0000XXXX`.

### Model

Out of the box the app generates a **built-in CNN** locally. It needs no download, but it gives no meaningful labels. For real ImageNet classification, download once:

```bash
python scripts/download_models.py
```

On an air-gapped machine, copy `mobilenetv2-12.onnx` and `synset.txt` into `models/` instead. To use any other image-classification ONNX model, set `NPU_MONITOR_MODEL=/path/model.onnx`.

## Measuring the impact on CPU and GPU

1. Leave the machine idle for about 10 s so there is an idle baseline.
2. Start **Laptop camera** on the NPU device, or process documents with *Passes* set to 20 or more.
3. Read the **Impact** table. The *CPU (this app)* Δ is the CPU cost of feeding the NPU (decoding, resizing, pre- and post-processing). The GPU Δ shows whether the GPU was touched at all.
4. Run the **benchmark** with NPU, GPU and CPU ticked to see the same workload's cost on each processor.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `NPU_MONITOR_INTERVAL` | `0.5` | sampling period (s) |
| `NPU_MONITOR_MAX_UPLOAD_MB` | `200` | upload size cap |
| `NPU_MONITOR_MAX_PDF_PAGES` | `50` | pages rendered per PDF |
| `NPU_MONITOR_MODEL` | – | custom ONNX model |
| `NPU_MONITOR_NPU_LUID` | – | pin the Windows NPU adapter |

Use `python run.py --host 0.0.0.0` only if other machines on the LAN should reach it. The app has no authentication.

## API

`GET /api/system`, `GET /api/metrics`, `GET /api/history?seconds=`, `GET /api/impact?seconds=`, `GET /api/export.csv`, `WS /ws/metrics`, `POST /api/live/start|stop`, `GET /api/live/stream` (MJPEG), `POST /api/frame` (JPEG body), `POST /api/files` (multipart), `POST /api/benchmark`, `GET /api/jobs/{id}`.

## Tests

```bash
python -m pytest -q
```
