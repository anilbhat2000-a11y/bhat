"""3C ITS AI PC Health Checker & NPU Performance - on-prem NPU / GPU / CPU / battery monitor."""
from .privacy import opt_out_vendor_telemetry

opt_out_vendor_telemetry()  # before anything imports openvino
