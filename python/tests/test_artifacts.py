"""Gate regression uses synthetic archives, not production data or purchases."""

import io
import subprocess
import sys
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path


class ArtifactGateTests(unittest.TestCase):
    def test_exact_allowlists_and_secret_gate_reject_tampered_archives(self):
        metadata = "fragment_donor_sdk-0.1.1.dist-info/"
        wheel = {
            "fragment_donor_sdk/__init__.py": "",
            "fragment_donor_sdk/client.py": "",
            "fragment_donor_sdk/py.typed": "",
            metadata + "licenses/LICENSE": "MIT",
            metadata + "METADATA": "License-Expression: MIT\n",
            metadata + "WHEEL": "",
            metadata + "top_level.txt": "",
            metadata + "RECORD": "",
        }
        sdist = dict.fromkeys(
            [
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
            ],
            "",
        )
        gate = Path(__file__).with_name("check_artifacts.py")
        fake_token = "gh" + "p_" + "A" * 36  # Deliberately synthetic detection token.
        for case in ("valid", "wheel_extra", "sdist_extra", "secret"):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as directory:
                paths = dict(wheel)
                sources = dict(sdist)
                if case == "wheel_extra":
                    paths["unreviewed.json"] = "{}"
                if case == "sdist_extra":
                    sources["unreviewed.json"] = "{}"
                if case == "secret":
                    sources["README.md"] = fake_token
                with zipfile.ZipFile(Path(directory) / "sdk.whl", "w") as archive:
                    for name, content in paths.items():
                        archive.writestr(name, content)
                with tarfile.open(Path(directory) / "sdk.tar.gz", "w:gz") as archive:
                    for name, content in sources.items():
                        data = content.encode()
                        member = tarfile.TarInfo("fragment_donor_sdk-0.1.1/" + name)
                        member.size = len(data)
                        archive.addfile(member, io.BytesIO(data))
                result = subprocess.run(
                    [sys.executable, str(gate), directory],
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(result.returncode == 0, case == "valid")
                self.assertNotIn(fake_token, result.stdout + result.stderr)
