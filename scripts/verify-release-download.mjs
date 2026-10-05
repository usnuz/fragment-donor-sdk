import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHECKSUMS,
  PROVENANCE,
  REPOSITORY,
  fixtureVersion,
  packageFiles,
  regularFiles,
  sha256,
  validateIdentity,
} from "./release-assets.mjs";

function exactKeys(object, expected) {
  assert(
    object && typeof object === "object" && !Array.isArray(object),
    "Plain metadata object required",
  );
  assert.deepEqual(
    Object.keys(object).sort(),
    [...expected].sort(),
    "Unexpected metadata fields",
  );
}

export function parseChecksums(text, expectedFiles) {
  assert(
    typeof text === "string" && text.endsWith("\n") && !text.includes("\r"),
    "Canonical SHA256SUMS required",
  );
  const entries = new Map();
  for (const line of text.slice(0, -1).split("\n")) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
    assert(match, "Invalid checksum record");
    assert(!entries.has(match[2]), "Duplicate checksum record");
    entries.set(match[2], match[1]);
  }
  assert.deepEqual(
    [...entries.keys()].sort(),
    [...expectedFiles].sort(),
    "Incomplete/unexpected checksum coverage",
  );
  return entries;
}

export async function verifyLocalRelease(directory, expected) {
  const packages = packageFiles(expected.version);
  await regularFiles(directory, [...packages, PROVENANCE, CHECKSUMS]);
  const checksums = parseChecksums(
    await readFile(join(directory, CHECKSUMS), "utf8"),
    [...packages, PROVENANCE],
  );
  for (const [filename, digest] of checksums) {
    assert.equal(
      sha256(await readFile(join(directory, filename))),
      digest,
      "Release checksum mismatch",
    );
  }
  let provenance;
  const provenanceText = await readFile(join(directory, PROVENANCE), "utf8");
  try {
    provenance = JSON.parse(provenanceText);
  } catch {
    throw new Error("Invalid release provenance JSON");
  }
  assert.equal(
    provenanceText,
    JSON.stringify(provenance, null, 2) + "\n",
    "Canonical, duplicate-free provenance JSON required",
  );
  exactKeys(provenance, ["repository", "tag", "commit", "run_id", "packages"]);
  validateIdentity({ ...expected, runId: provenance.run_id });
  assert.equal(
    provenance.repository,
    expected.repository,
    "Provenance repository mismatch",
  );
  assert.equal(provenance.tag, expected.tag, "Provenance tag mismatch");
  assert.equal(
    provenance.commit,
    expected.commit,
    "Provenance commit mismatch",
  );
  assert(
    Array.isArray(provenance.packages) &&
      provenance.packages.length === packages.length,
    "Exact package provenance required",
  );
  const recorded = new Map();
  for (const entry of provenance.packages) {
    exactKeys(entry, ["filename", "sha256"]);
    assert(
      typeof entry.filename === "string" && !recorded.has(entry.filename),
      "Duplicate/invalid provenance filename",
    );
    assert(/^[a-f0-9]{64}$/.test(entry.sha256), "Invalid provenance digest");
    assert.equal(
      entry.sha256,
      checksums.get(entry.filename),
      "Package provenance hash mismatch",
    );
    recorded.set(entry.filename, entry.sha256);
  }
  assert.deepEqual(
    [...recorded.keys()].sort(),
    packages,
    "Exact provenance package set required",
  );
  return provenance;
}

export async function githubJson(
  path,
  { fetch: transport = globalThis.fetch, token = process.env.GH_TOKEN } = {},
) {
  assert(
    /^\/repos\/usnuz\/fragment-donor-sdk\/(?:actions\/runs\/[1-9]\d{0,19}|git\/ref\/tags\/(?:go\/)?v\d+\.\d+\.\d+|git\/tags\/[a-f0-9]{40})$/.test(
      path,
    ),
    "Only expected public repository verification endpoints are allowed",
  );
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await transport(`https://api.github.com${path}`, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    assert(response.ok, "GitHub verification response unsuccessful");
    const body = await response.text();
    assert(body.length <= 1_000_000, "Oversized GitHub verification response");
    return JSON.parse(body);
  } catch {
    throw new Error(
      "GitHub release verification unavailable or invalid; response/credentials withheld",
    );
  }
}

export async function peelRemoteTag(tag, request) {
  assert(
    /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag) ||
      /^go\/v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag),
    "Invalid remote tag",
  );
  const ref = await request(`/repos/${REPOSITORY}/git/ref/tags/${tag}`);
  assert.equal(ref.ref, `refs/tags/${tag}`, "Unexpected remote tag ref");
  let object = ref.object;
  const seen = new Set();
  for (let depth = 0; depth < 8; depth++) {
    assert(
      object && /^[a-f0-9]{40}$/.test(object.sha),
      "Invalid remote Git object",
    );
    assert(!seen.has(object.sha), "Cyclic annotated tag");
    seen.add(object.sha);
    if (object.type === "commit") return object.sha;
    assert.equal(object.type, "tag", "Tag must ultimately reference a commit");
    const annotated = await request(
      `/repos/${REPOSITORY}/git/tags/${object.sha}`,
    );
    assert.equal(annotated.sha, object.sha, "Annotated tag identity mismatch");
    object = annotated.object;
  }
  throw new Error("Annotated tag depth limit exceeded");
}

export async function verifyRemoteRelease(provenance, request = githubJson) {
  const run = await request(
    `/repos/${REPOSITORY}/actions/runs/${provenance.run_id}`,
  );
  assert.equal(String(run.id), provenance.run_id, "Unexpected workflow run ID");
  assert.equal(
    run.repository?.full_name,
    REPOSITORY,
    "Unexpected workflow repository",
  );
  assert.equal(
    run.head_repository?.full_name,
    REPOSITORY,
    "Fork workflow provenance forbidden",
  );
  assert.equal(run.status, "completed", "Release workflow must be completed");
  assert.equal(
    run.conclusion,
    "success",
    "Release workflow must have succeeded",
  );
  assert.equal(run.event, "push", "Release workflow must be a push run");
  assert.equal(
    run.path,
    ".github/workflows/release.yml",
    "Unexpected publishing workflow",
  );
  assert.equal(
    run.head_sha,
    provenance.commit,
    "Release workflow commit mismatch",
  );
  assert.equal(
    await peelRemoteTag(provenance.tag, request),
    provenance.commit,
    "Root release tag mismatch",
  );
  assert.equal(
    await peelRemoteTag(`go/${provenance.tag}`, request),
    provenance.commit,
    "Go submodule tag mismatch",
  );
}

export async function verifyReleaseDownload(
  directory,
  expected,
  request = githubJson,
) {
  const provenance = await verifyLocalRelease(directory, expected);
  await verifyRemoteRelease(provenance, request);
  return provenance;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await verifyReleaseDownload(process.argv[2], {
      repository: process.env.GITHUB_REPOSITORY,
      tag: process.env.SDK_RELEASE_TAG,
      commit: process.env.VALIDATED_COMMIT,
      version: await fixtureVersion(),
    });
    console.log(
      "PASS: exact nine release files, checksums/provenance, successful release run and matching root/Go tags.",
    );
  } catch {
    console.error(
      "Release download verification failed; metadata/content/credentials withheld.",
    );
    process.exitCode = 1;
  }
}
