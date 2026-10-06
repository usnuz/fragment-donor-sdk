"""Inspect/extract the built crate and exercise it from a fresh offline consumer.

This is archive verification, not source or registry publication. No HTTP call
uses the default SDK transport: the consumer injects a synthetic transport.
"""
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile


def main():
    root = Path(__file__).resolve().parents[1]
    target = Path(os.environ.get("CARGO_TARGET_DIR", str(root / "target")))
    if not target.is_absolute():
        target = root / target
    artifact = target / "package" / "fragment-donor-sdk-0.1.1.crate"
    expected = {"Cargo.toml", "Cargo.toml.orig", "Cargo.lock", "src/lib.rs", "README.md", "LICENSE", "CHANGELOG.md"}
    with tempfile.TemporaryDirectory(prefix="fragment-donor-crate-smoke-") as work:
        work = Path(work)
        package = work / "package"
        package.mkdir()
        with tarfile.open(artifact, "r:gz") as archive:
            files = set()
            for member in archive.getmembers():
                path = PurePosixPath(member.name)
                if path.is_absolute() or ".." in path.parts or path.parts[0] != "fragment-donor-sdk-0.1.1" or not member.isfile():
                    raise RuntimeError(f"Unsafe archive member: {member.name}")
                relative = str(PurePosixPath(*path.parts[1:]))
                files.add(relative)
                if relative not in expected | {".cargo_vcs_info.json"}:
                    raise RuntimeError(f"Unexpected package member: {relative}")
                data = archive.extractfile(member).read()
                for marker in [b"BEGIN PRIVATE KEY", b"BEGIN RSA PRIVATE KEY", b"SYNTHETIC_SESSION_NOT_REAL", b"SYNTHETIC_PROVIDER_KEY_NOT_REAL"]:
                    if marker in data:
                        raise RuntimeError(f"Sensitive/test fixture payload leaked into crate: {relative}")
                destination = package / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
            if not expected <= files:
                raise RuntimeError(f"Missing crate files: {expected - files}")
        shutil.copytree(root / "smoke" / "src", work / "consumer" / "src")
        shutil.copyfile(root / "smoke" / "Cargo.toml", work / "consumer" / "Cargo.toml")
        cargo = os.environ.get("CARGO", "cargo")
        manifest = str(work / "consumer" / "Cargo.toml")
        subprocess.run([cargo, "generate-lockfile", "--offline", "--manifest-path", manifest], check=True)
        subprocess.run([cargo, "run", "--offline", "--locked", "--manifest-path", manifest], check=True)
        print(f"Rust archive allowlist/fixture-secret exclusion PASS ({len(files)} files); consumer used built crate")


if __name__ == "__main__":
    main()
