import os
import sys
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="sc-test-")
os.environ["SC_DATABASE_URL"] = os.environ.get("SC_TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"
os.environ["SC_SECRET_KEY"] = "test-secret-key-for-unit-tests-only-0123456789"
os.environ["SC_COLLECTOR"] = "0"
os.environ["SC_ADMIN_PASSWORD"] = "Admin@123456"
os.environ["SC_SEED_DEMO"] = "0"
os.environ["SC_IGNORE_ENV_FILE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
