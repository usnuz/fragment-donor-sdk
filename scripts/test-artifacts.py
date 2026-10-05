"""In-memory negative tests for the shared archive security gate."""

import gzip
import importlib.util
import io
import stat
import tarfile
import unittest
import warnings
import zipfile
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "artifact_gate", Path(__file__).with_name("check-artifacts.py")
)
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


def zip_bytes(entries):
    output = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        with zipfile.ZipFile(output, "w") as archive:
            for name, body, mode in entries:
                entry = zipfile.ZipInfo(name)
                entry.create_system = 3
                entry.external_attr = mode << 16
                archive.writestr(entry, body)
    return output.getvalue()


def tar_bytes(entries):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as archive:
        for name, body, kind in entries:
            entry = tarfile.TarInfo(name)
            entry.type = kind
            if kind == tarfile.REGTYPE:
                entry.size = len(body)
                archive.addfile(entry, io.BytesIO(body))
            else:
                entry.linkname = "package/target"
                archive.addfile(entry)
    return output.getvalue()


class ArchiveSecurityTests(unittest.TestCase):
    def test_regular_zip_and_tar(self):
        self.assertEqual(
            GATE.members(
                zip_bytes([("package/file", b"safe", stat.S_IFREG | 0o644)]), True
            ),
            1,
        )
        self.assertEqual(
            GATE.members(tar_bytes([("package/file", b"safe", tarfile.REGTYPE)])), 1
        )

    def test_zip_symlink_and_special_file_rejected(self):
        for mode in (stat.S_IFLNK, stat.S_IFIFO, stat.S_IFCHR):
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                GATE.members(
                    zip_bytes([("package/link", b"target", mode | 0o777)]), True
                )

    def test_tar_symlink_and_hardlink_rejected(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                GATE.members(tar_bytes([("package/link", b"", kind)]))

    def test_duplicate_zip_and_tar_rejected(self):
        with self.assertRaises(ValueError):
            GATE.members(
                zip_bytes(
                    [("file", b"first", stat.S_IFREG), ("file", b"last", stat.S_IFREG)]
                ),
                True,
            )
        with self.assertRaises(ValueError):
            GATE.members(
                tar_bytes(
                    [
                        ("file", b"first", tarfile.REGTYPE),
                        ("file", b"last", tarfile.REGTYPE),
                    ]
                )
            )

    def test_unsafe_paths_rejected(self):
        for name in (
            ".",
            "../escape",
            "/absolute",
            "C:/drive",
            "a\\b",
            "./file",
            "a//b",
            "a/./b",
            "bad\x00name",
            "bad\nname",
        ):
            with self.subTest(name=repr(name)), self.assertRaises(ValueError):
                GATE.check(name, b"safe")

    def test_private_directories_rejected(self):
        for name in (
            ".env/",
            "package/.git/",
            "package/node_modules/file",
            "package/.env.production",
        ):
            with self.subTest(name=name), self.assertRaises(ValueError):
                GATE.check(name, b"")

    def test_empty_archives_rejected(self):
        with self.assertRaises(ValueError):
            GATE.members(zip_bytes([]), True)
        with self.assertRaises(ValueError):
            GATE.members(tar_bytes([]))

    def test_credentials_rejected_without_echo(self):
        secret = b"gh" + b"p_" + b"A" * 36
        with self.assertRaises(ValueError) as error:
            GATE.members(zip_bytes([("package/file", secret, stat.S_IFREG)]), True)
        self.assertNotIn(secret.decode(), str(error.exception))

    def test_nested_gem_payload_checked(self):
        inner = tar_bytes([("lib/file", b"safe", tarfile.REGTYPE)])
        self.assertEqual(
            GATE.members(tar_bytes([("data.tar.gz", inner, tarfile.REGTYPE)])), 1
        )
        duplicate = tar_bytes([("lib/file", b"safe", tarfile.REGTYPE)] * 2)
        with self.assertRaises(ValueError):
            GATE.members(tar_bytes([("data.tar.gz", duplicate, tarfile.REGTYPE)]))

    def test_size_and_entry_limits_are_fail_closed(self):
        old = GATE.MAX_MEMBER
        try:
            GATE.MAX_MEMBER = 2
            with self.assertRaises(ValueError):
                GATE.members(zip_bytes([("file", b"large", stat.S_IFREG)]), True)
        finally:
            GATE.MAX_MEMBER = old

    def test_nested_limits_are_shared(self):
        inner = tar_bytes([("lib/file", b"safe", tarfile.REGTYPE)])
        old = GATE.MAX_ENTRIES
        try:
            GATE.MAX_ENTRIES = 1
            with self.assertRaises(ValueError):
                GATE.members(tar_bytes([("data.tar.gz", inner, tarfile.REGTYPE)]))
        finally:
            GATE.MAX_ENTRIES = old
        old = GATE.MAX_UNPACKED
        try:
            GATE.MAX_UNPACKED = len(inner) + 3
            with self.assertRaises(ValueError):
                GATE.members(tar_bytes([("data.tar.gz", inner, tarfile.REGTYPE)]))
        finally:
            GATE.MAX_UNPACKED = old

    def test_compressed_gem_metadata_is_scanned(self):
        secret = b"gh" + b"p_" + b"A" * 36
        for filename in ("metadata.gz", "checksums.yaml.gz"):
            with (
                self.subTest(filename=filename),
                self.assertRaises(ValueError) as error,
            ):
                GATE.members(
                    tar_bytes([(filename, gzip.compress(secret), tarfile.REGTYPE)])
                )
            self.assertNotIn(secret.decode(), str(error.exception))


if __name__ == "__main__":
    unittest.main()
