"""Fail-closed, read-only archive gates; never print matched credential bytes."""

from __future__ import annotations

import gzip
import hashlib
import io
import re
import stat
import sys
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

PATTERNS = [
    rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    rb"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b",
    rb"\b\d{8,12}:[A-Za-z0-9_-]{35}\b",
    rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    rb"https?://(?!SYNTHETIC)[^\s/@:]+:[^\s/@]+@",
]
BLOCKED = {
    ".git",
    ".tools",
    ".venv",
    "venv",
    "node_modules",
    "vendor",
    "__pycache__",
    "screenshots",
}
MAX_MEMBER = 32_000_000
MAX_ARCHIVE = 64_000_000
MAX_UNPACKED = 128_000_000
MAX_ENTRIES = 1000


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def check(name: str, data: bytes) -> str:
    require(isinstance(name, str) and bool(name), "Empty archive member path")
    path = PurePosixPath(name)
    canonical = name.rstrip("/")
    require(
        bool(path.parts)
        and not path.is_absolute()
        and ".." not in path.parts
        and "\\" not in name
        and ":" not in name
        and path.as_posix() == canonical
        and all(ord(character) >= 32 and ord(character) != 127 for character in name),
        "Unsafe/noncanonical archive member path",
    )
    require(
        not BLOCKED.intersection(path.parts)
        and not any(p.startswith(".env") for p in path.parts),
        "Private/runtime file found in archive",
    )
    require(
        not any(
            re.search(pattern, data) or re.search(pattern, name.encode("utf-8"))
            for pattern in PATTERNS
        ),
        "Potential credential in archive; matching content withheld",
    )
    return canonical


def members(
    data: bytes,
    zip_archive: bool = False,
    depth: int = 0,
    budget: list[int] | None = None,
) -> int:
    require(len(data) <= MAX_ARCHIVE and depth <= 2, "Oversized/deeply nested archive")
    if budget is None:
        budget = [0, 0]
    count = 0
    unpacked = 0
    seen: set[str] = set()

    def record(name: str) -> None:
        canonical = check(name, b"")
        require(canonical not in seen, "Duplicate archive member path")
        seen.add(canonical)
        budget[1] += 1
        require(len(seen) <= MAX_ENTRIES, "Unreasonable archive member count")
        require(
            budget[1] <= MAX_ENTRIES, "Unreasonable total nested archive member count"
        )

    if zip_archive:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            require(
                len(archive.infolist()) <= MAX_ENTRIES,
                "Unreasonable archive member count",
            )
            for entry in archive.infolist():
                record(entry.filename)
                mode = stat.S_IFMT(entry.external_attr >> 16)
                require(
                    mode in {0, stat.S_IFREG, stat.S_IFDIR},
                    "Linked/non-regular ZIP member",
                )
                if entry.is_dir():
                    require(
                        mode in {0, stat.S_IFDIR} and entry.file_size == 0,
                        "Invalid ZIP directory",
                    )
                    continue
                require(mode in {0, stat.S_IFREG}, "Non-regular ZIP member")
                require(entry.file_size <= MAX_MEMBER, "Archive member too large")
                unpacked += entry.file_size
                budget[0] += entry.file_size
                require(unpacked <= MAX_UNPACKED, "Archive unpacked size too large")
                require(
                    budget[0] <= MAX_UNPACKED, "Nested archive unpacked size too large"
                )
                body = archive.read(entry)
                require(len(body) == entry.file_size, "Archive member size mismatch")
                check(entry.filename, body)
                count += 1
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as archive:
            for entry in archive:
                record(entry.name)
                if entry.isdir():
                    require(entry.size == 0, "Invalid TAR directory")
                    continue
                require(
                    entry.isfile() and 0 <= entry.size <= MAX_MEMBER,
                    "Linked/non-regular/oversized TAR member",
                )
                unpacked += entry.size
                budget[0] += entry.size
                require(unpacked <= MAX_UNPACKED, "Archive unpacked size too large")
                require(
                    budget[0] <= MAX_UNPACKED, "Nested archive unpacked size too large"
                )
                stream = archive.extractfile(entry)
                require(stream is not None, "Unreadable archive member")
                body = stream.read(MAX_MEMBER + 1)
                require(len(body) == entry.size, "Archive member size mismatch")
                check(entry.name, body)
                if entry.name == "data.tar.gz":
                    count += members(body, depth=depth + 1, budget=budget)
                elif entry.name in {"metadata.gz", "checksums.yaml.gz"}:
                    with gzip.GzipFile(fileobj=io.BytesIO(body)) as compressed:
                        plain = compressed.read(MAX_MEMBER + 1)
                    require(
                        len(plain) <= MAX_MEMBER, "Oversized compressed gem metadata"
                    )
                    budget[0] += len(plain)
                    require(
                        budget[0] <= MAX_UNPACKED,
                        "Nested archive unpacked size too large",
                    )
                    check(entry.name.removesuffix(".gz"), plain)
                    count += 1
                else:
                    count += 1
    require(count > 0, "Empty package")
    return count


def main() -> None:
    require(len(sys.argv) > 1, "Supply reviewed built archive paths")
    for argument in sys.argv[1:]:
        path = Path(argument)
        metadata = path.lstat()
        require(
            stat.S_ISREG(metadata.st_mode) and metadata.st_nlink == 1,
            "Linked/non-regular artifact file",
        )
        require(0 < metadata.st_size <= MAX_ARCHIVE, "Empty/oversized artifact file")
        check(path.name, b"")
        data = path.read_bytes()
        count = members(data, path.suffix in {".zip", ".whl", ".nupkg"})
        print(
            f"PASS: {path.name}: {count} regular members; credential scan; SHA256 {hashlib.sha256(data).hexdigest()}"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Malformed/unsupported archive parser errors may echo member names.
        print(
            "Artifact gate failed; member names/content/credentials withheld.",
            file=sys.stderr,
        )
        sys.exit(1)
