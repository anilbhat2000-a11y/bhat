"""On-prem NPU / GPU / CPU utilisation monitor."""
from .privacy import opt_out_vendor_telemetry

opt_out_vendor_telemetry()  # before anything imports openvino
