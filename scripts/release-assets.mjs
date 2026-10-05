import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY = "usnuz/fragment-donor-sdk";
export const PROVENANCE = "release-provenance.json";
export const CHECKSUMS = "SHA256SUMS";
const HASH = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export async function fixtureVersion() {
  const fixture = JSON.parse(
    await readFile(
      new URL("../contract/fixtures.json", import.meta.url),
      "utf8",
    ),
  );
  assert(VERSION.test(fixture.version), "Invalid fixture version");
  return fixture.version;
}

export function packageFiles(version) {
  assert(VERSION.test(version), "Invalid package version");
  return [
    `fragment_donor_sdk-${version}-py3-none-any.whl`,
    `fragment_donor_sdk-${version}.tar.gz`,
    `fragment-donor-sdk-${version}.tgz`,
    `fragment-donor-sdk-${version}.zip`,
    `FragmentDonor.Sdk.${version}.nupkg`,
    `fragment-donor-sdk-${version}.crate`,
    `fragment-donor-sdk-${version}.gem`,
  ].sort();
}

export function validateIdentity({ repository, tag, commit, runId, version }) {
  assert.equal(repository, REPOSITORY, "Unexpected release repository");
  assert(VERSION.test(version), "Invalid release version");
  assert.equal(
    tag,
    `v${version}`,
    "Release tag and fixture version must match",
  );
  assert(
    typeof commit === "string" && COMMIT.test(commit),
    "Exact lowercase 40-hex commit required",
  );
  assert(
    typeof runId === "string" && /^[1-9]\d{0,19}$/.test(runId),
    "Positive decimal GitHub run ID required",
  );
}

export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export async function regularFiles(directory, expected) {
  assert(
    typeof directory === "string" && directory.length,
    "Explicit artifact directory required",
  );
  const directoryStat = await lstat(directory);
  assert(
    directoryStat.isDirectory() && !directoryStat.isSymbolicLink(),
    "Real artifact directory required",
  );
  const entries = (await readdir(directory)).sort();
  assert.deepEqual(
    entries,
    [...expected].sort(),
    "Artifact directory must contain exactly the expected files",
  );
  for (const filename of entries) {
    const entry = await lstat(join(directory, filename));
    assert(
      entry.isFile() && !entry.isSymbolicLink() && entry.nlink === 1,
      "Linked/non-regular release file forbidden",
    );
    assert(
      entry.size > 0 && entry.size <= 64_000_000,
      "Empty or oversized release file forbidden",
    );
  }
}

export function checksumText(entries) {
  return (
    [...entries]
      .sort((a, b) => a.filename.localeCompare(b.filename, "en"))
      .map(({ filename, sha256: digest }) => {
        assert(HASH.test(digest), "Invalid SHA-256 digest");
        assert(/^[A-Za-z0-9_.-]+$/.test(filename), "Unsafe artifact filename");
        return `${digest}  ${filename}`;
      })
      .join("\n") + "\n"
  );
}

export async function buildReleaseAssets(directory, identity) {
  validateIdentity(identity);
  const filenames = packageFiles(identity.version);
  await regularFiles(directory, filenames);
  const packages = [];
  for (const filename of filenames) {
    packages.push({
      filename,
      sha256: sha256(await readFile(join(directory, filename))),
    });
  }
  const provenance = {
    repository: identity.repository,
    tag: identity.tag,
    commit: identity.commit,
    run_id: identity.runId,
    packages,
  };
  const provenanceBytes = Buffer.from(
    JSON.stringify(provenance, null, 2) + "\n",
  );
  await writeFile(join(directory, PROVENANCE), provenanceBytes, { flag: "wx" });
  await writeFile(
    join(directory, CHECKSUMS),
    checksumText([
      ...packages,
      { filename: PROVENANCE, sha256: sha256(provenanceBytes) },
    ]),
    { flag: "wx" },
  );
  return provenance;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await buildReleaseAssets(process.argv[2], {
      repository: process.env.GITHUB_REPOSITORY,
      tag: process.env.SDK_RELEASE_TAG,
      commit: process.env.VALIDATED_COMMIT ?? process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
      version: await fixtureVersion(),
    });
    console.log(
      "PASS: seven exact versioned packages + provenance + eight SHA-256 checksums.",
    );
  } catch {
    console.error(
      "Release asset construction failed; filenames/identity/content withheld.",
    );
    process.exitCode = 1;
  }
}
