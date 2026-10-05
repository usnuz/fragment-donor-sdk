"""Check wheel/sdist allowlists; no production data belongs in either artifact."""

import sys
import tarfile
import zipfile
from pathlib import Path

distribution = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
wheel = next(distribution.glob("*.whl"))
sdist = next(distribution.glob("*.tar.gz"))
forbidden = (
    ".env",
    ".git/",
    ".tools/",
    "__pycache__",
    "venv/",
    "db.sqlite",
    "node_modules",
)
with zipfile.ZipFile(wheel) as archive:
    paths = archive.namelist()
    assert len(paths) == 8, paths
    assert all(not any(part in path for part in forbidden) for path in paths)
    assert "fragment_donor_sdk/py.typed" in paths
    assert (
        "License-Expression: MIT"
        in archive.read("fragment_donor_sdk-0.1.0.dist-info/METADATA").decode()
    )
    assert (
        "Requires-Dist:"
        not in archive.read("fragment_donor_sdk-0.1.0.dist-info/METADATA").decode()
    )
with tarfile.open(sdist, "r:gz") as archive:
    paths = archive.getnames()
    assert all(not any(part in path for part in forbidden) for path in paths)
    assert any(path.endswith("/LICENSE") for path in paths)
    assert any(path.endswith("/examples/all_endpoints.py") for path in paths)
    assert not any("/tests/" in path for path in paths)
print("Wheel/sdist contents PASS (allowlist, MIT, no runtime dependencies)")
