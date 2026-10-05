"""Exact built-artifact allowlists and known-secret checks; no payload printing."""

import re
import stat
import sys
import tarfile
import zipfile
from pathlib import Path

distribution = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
wheels = list(distribution.glob("*.whl"))
sdists = list(distribution.glob("*.tar.gz"))
assert len(wheels) == len(sdists) == 1, "Expected exactly one wheel and sdist"
metadata = "fragment_donor_sdk-0.1.0.dist-info/"
wheel_files = {
    "fragment_donor_sdk/__init__.py",
    "fragment_donor_sdk/client.py",
    "fragment_donor_sdk/py.typed",
    metadata + "licenses/LICENSE",
    metadata + "METADATA",
    metadata + "WHEEL",
    metadata + "top_level.txt",
    metadata + "RECORD",
}
sdist_files = {
    "CHANGELOG.md",
    "LICENSE",
    "MANIFEST.in",
    "PKG-INFO",
    "README.md",
    "pyproject.toml",
    "setup.cfg",
    "examples/all_endpoints.py",
    "src/fragment_donor_sdk/__init__.py",
    "src/fragment_donor_sdk/client.py",
    "src/fragment_donor_sdk/py.typed",
    "src/fragment_donor_sdk.egg-info/PKG-INFO",
    "src/fragment_donor_sdk.egg-info/SOURCES.txt",
    "src/fragment_donor_sdk.egg-info/dependency_links.txt",
    "src/fragment_donor_sdk.egg-info/top_level.txt",
}
patterns = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(
        r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b"
    ),
    "Telegram token": re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{35}\b"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "URL credential": re.compile(r"https?://(?!SYNTHETIC)[^\s/@:]+:[^\s/@]+@"),
}


def scan(path, data):
    text = data.decode("utf-8", errors="strict")
    assert "\x00" not in text, f"Binary data forbidden: {path}"
    for label, pattern in patterns.items():
        assert not pattern.search(text), (
            f"Potential {label} in {path}; contents withheld"
        )


with zipfile.ZipFile(wheels[0]) as archive:
    paths = archive.namelist()
    assert len(paths) == len(set(paths)), "Duplicate wheel entries"
    assert set(paths) == wheel_files, "Unexpected wheel contents; inspect privately"
    for entry in archive.infolist():
        assert not stat.S_ISLNK(entry.external_attr >> 16), "Symlink forbidden"
        scan(entry.filename, archive.read(entry))
    assert (
        "License-Expression: MIT"
        in archive.read("fragment_donor_sdk-0.1.0.dist-info/METADATA").decode()
    )
    assert (
        "Requires-Dist:"
        not in archive.read("fragment_donor_sdk-0.1.0.dist-info/METADATA").decode()
    )
with tarfile.open(sdists[0], "r:gz") as archive:
    files = []
    for entry in archive.getmembers():
        assert not entry.issym() and not entry.islnk(), "Archive links forbidden"
        assert entry.name == "fragment_donor_sdk-0.1.0" or entry.name.startswith(
            "fragment_donor_sdk-0.1.0/"
        ), "Wrong archive root"
        relative = entry.name.partition("/")[2]
        if entry.isdir():
            assert ".." not in Path(relative).parts, "Path traversal forbidden"
            continue
        assert entry.isfile() and relative in sdist_files, "Unexpected source contents"
        files.append(relative)
        handle = archive.extractfile(entry)
        assert handle is not None
        scan(relative, handle.read())
    assert len(files) == len(set(files)) and set(files) == sdist_files
print(
    "Wheel/sdist contents PASS (exact allowlists, UTF-8, known-secret patterns, MIT, no runtime dependencies)"
)
