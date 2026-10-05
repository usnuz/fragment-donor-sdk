import assert from "node:assert/strict";
import {
  link,
  mkdtemp,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import {
  CHECKSUMS,
  PROVENANCE,
  REPOSITORY,
  buildReleaseAssets,
  checksumText,
  packageFiles,
  sha256,
  validateIdentity,
} from "./release-assets.mjs";
import {
  githubJson,
  parseChecksums,
  peelRemoteTag,
  verifyLocalRelease,
  verifyReleaseDownload,
  verifyRemoteRelease,
} from "./verify-release-download.mjs";

const identity = {
  repository: REPOSITORY,
  tag: "v0.1.0",
  version: "0.1.0",
  commit: "a".repeat(40),
  runId: "12345",
};
const filenames = packageFiles(identity.version);
const goodRun = {
  id: 12345,
  repository: { full_name: REPOSITORY },
  head_repository: { full_name: REPOSITORY },
  status: "completed",
  conclusion: "success",
  event: "push",
  path: ".github/workflows/release.yml",
  head_sha: identity.commit,
};

async function directory(t, complete = true) {
  const parent = resolve(tmpdir());
  const output = await mkdtemp(join(parent, "fragment-release-test-"));
  t.after(async () => {
    const target = resolve(output);
    assert.equal(
      dirname(target),
      parent,
      "Temporary deletion must stay within validated parent",
    );
    assert(
      basename(target).startsWith("fragment-release-test-"),
      "Temporary deletion prefix mismatch",
    );
    await rm(target, { recursive: true, force: true });
  });
  for (const filename of filenames)
    await writeFile(join(output, filename), `SYNTHETIC_PACKAGE_${filename}`);
  if (complete) await buildReleaseAssets(output, identity);
  return output;
}

function mockGithub(run = goodRun, overrides = {}) {
  const responses = new Map([
    [`/repos/${REPOSITORY}/actions/runs/${identity.runId}`, run],
    [
      `/repos/${REPOSITORY}/git/ref/tags/${identity.tag}`,
      {
        ref: `refs/tags/${identity.tag}`,
        object: { type: "commit", sha: identity.commit },
      },
    ],
    [
      `/repos/${REPOSITORY}/git/ref/tags/go/${identity.tag}`,
      {
        ref: `refs/tags/go/${identity.tag}`,
        object: { type: "commit", sha: identity.commit },
      },
    ],
    ...Object.entries(overrides),
  ]);
  return async (path) => {
    assert(responses.has(path), "Unexpected mocked API request");
    return structuredClone(responses.get(path));
  };
}

async function rewriteProvenance(output, mutate) {
  const provenance = JSON.parse(
    await readFile(join(output, PROVENANCE), "utf8"),
  );
  mutate(provenance);
  const body = JSON.stringify(provenance, null, 2) + "\n";
  await writeFile(join(output, PROVENANCE), body);
  const entries = [];
  for (const filename of [...filenames, PROVENANCE])
    entries.push({
      filename,
      sha256: sha256(await readFile(join(output, filename))),
    });
  await writeFile(join(output, CHECKSUMS), checksumText(entries));
}

test("exact seven packages produce nine files and verify through mocked public API", async (t) => {
  const output = await directory(t);
  const provenance = await verifyReleaseDownload(
    output,
    identity,
    mockGithub(),
  );
  assert.equal(provenance.packages.length, 7);
  assert.equal(
    parseChecksums(await readFile(join(output, CHECKSUMS), "utf8"), [
      ...filenames,
      PROVENANCE,
    ]).size,
    8,
  );
});

test("build rejects missing and extra package files", async (t) => {
  const missing = await directory(t, false);
  await unlink(join(missing, filenames[0]));
  await assert.rejects(buildReleaseAssets(missing, identity));
  const extra = await directory(t, false);
  await writeFile(join(extra, "unreviewed.tgz"), "SYNTHETIC");
  await assert.rejects(buildReleaseAssets(extra, identity));
});

test("build does not overwrite an existing release manifest", async (t) => {
  await assert.rejects(buildReleaseAssets(await directory(t), identity));
});

test("invalid tag/version/commit/run/repository fail closed", () => {
  for (const changed of [
    { tag: "v0.2.0" },
    { version: "00.1.0" },
    { commit: "not-a-commit" },
    { commit: "A".repeat(40) },
    { runId: "0" },
    { runId: "12;echo bad" },
    { repository: "other/repo" },
  ])
    assert.throws(() => validateIdentity({ ...identity, ...changed }));
});

test("download rejects missing and extra files", async (t) => {
  const missing = await directory(t);
  await unlink(join(missing, filenames[0]));
  await assert.rejects(verifyLocalRelease(missing, identity));
  const extra = await directory(t);
  await writeFile(join(extra, "unlisted.tgz"), "SYNTHETIC");
  await assert.rejects(verifyLocalRelease(extra, identity));
});

test("download rejects hardlinked package files", async (t) => {
  const output = await directory(t);
  const existing = join(output, filenames[0]);
  const backing = join(output, "outside-review.bin");
  await rename(existing, backing);
  await link(backing, existing);
  // Rename the second hardlink outside the exact release directory, keeping it in the cleanup scope.
  const other = await directory(t, false);
  await rename(backing, join(other, "linked-source.bin"));
  await assert.rejects(verifyLocalRelease(output, identity));
});

test("download rejects package hash tampering", async (t) => {
  const output = await directory(t);
  await writeFile(join(output, filenames[0]), "SYNTHETIC_TAMPERED");
  await assert.rejects(verifyLocalRelease(output, identity));
});

test("checksum manifest rejects duplicate, missing, unsafe, extra and malformed records", () => {
  const valid = `${"b".repeat(64)}  reviewed.tgz\n`;
  assert.equal(parseChecksums(valid, ["reviewed.tgz"]).size, 1);
  for (const bad of [
    valid + valid,
    "",
    `${"b".repeat(64)}  ../escape\n`,
    valid + `${"c".repeat(64)}  extra.tgz\n`,
    valid.trim(),
    valid.replace("  ", " "),
  ]) {
    assert.throws(() => parseChecksums(bad, ["reviewed.tgz"]));
  }
});

test("provenance rejects identity, hash, duplicate and unexpected metadata even with rebuilt checksums", async (t) => {
  for (const mutate of [
    (p) => {
      p.commit = "b".repeat(40);
    },
    (p) => {
      p.tag = "v0.2.0";
    },
    (p) => {
      p.repository = "other/repo";
    },
    (p) => {
      p.packages[0].sha256 = "b".repeat(64);
    },
    (p) => {
      p.packages[1] = p.packages[0];
    },
    (p) => {
      p.unreviewed = true;
    },
    (p) => {
      p.packages[0].unknown = true;
    },
  ]) {
    const output = await directory(t);
    await rewriteProvenance(output, mutate);
    await assert.rejects(verifyLocalRelease(output, identity));
  }
});

test("duplicate JSON fields cannot hide behind JSON.parse last-value semantics", async (t) => {
  const output = await directory(t);
  const body = (await readFile(join(output, PROVENANCE), "utf8")).replace(
    "{\n",
    '{\n  "repository": "SYNTHETIC_UNREVIEWED",\n',
  );
  await writeFile(join(output, PROVENANCE), body);
  const entries = [];
  for (const filename of [...filenames, PROVENANCE])
    entries.push({
      filename,
      sha256: sha256(await readFile(join(output, filename))),
    });
  await writeFile(join(output, CHECKSUMS), checksumText(entries));
  await assert.rejects(verifyLocalRelease(output, identity));
});

test("all required workflow run properties are enforced", async () => {
  const provenance = {
    repository: REPOSITORY,
    tag: identity.tag,
    commit: identity.commit,
    run_id: identity.runId,
  };
  for (const changed of [
    { id: 54321 },
    { repository: { full_name: "other/repo" } },
    { head_repository: { full_name: "fork/repo" } },
    { status: "in_progress" },
    { conclusion: "failure" },
    { event: "workflow_dispatch" },
    { path: ".github/workflows/ci.yml" },
    { head_sha: "b".repeat(40) },
  ])
    await assert.rejects(
      verifyRemoteRelease(provenance, mockGithub({ ...goodRun, ...changed })),
    );
});

test("both remote root and Go tags must match the validated commit", async () => {
  const provenance = {
    repository: REPOSITORY,
    tag: identity.tag,
    commit: identity.commit,
    run_id: identity.runId,
  };
  for (const tag of [identity.tag, `go/${identity.tag}`]) {
    await assert.rejects(
      verifyRemoteRelease(
        provenance,
        mockGithub(goodRun, {
          [`/repos/${REPOSITORY}/git/ref/tags/${tag}`]: {
            ref: `refs/tags/${tag}`,
            object: { type: "commit", sha: "b".repeat(40) },
          },
        }),
      ),
    );
  }
});

test("annotated tags are peeled safely; cycles and non-commit targets are rejected", async () => {
  const tagSha = "c".repeat(40);
  const refPath = `/repos/${REPOSITORY}/git/ref/tags/${identity.tag}`;
  const tagPath = `/repos/${REPOSITORY}/git/tags/${tagSha}`;
  const ref = {
    ref: `refs/tags/${identity.tag}`,
    object: { type: "tag", sha: tagSha },
  };
  const annotated = {
    sha: tagSha,
    object: { type: "commit", sha: identity.commit },
  };
  assert.equal(
    await peelRemoteTag(
      identity.tag,
      mockGithub(goodRun, { [refPath]: ref, [tagPath]: annotated }),
    ),
    identity.commit,
  );
  await assert.rejects(
    peelRemoteTag(
      identity.tag,
      mockGithub(goodRun, {
        [refPath]: ref,
        [tagPath]: { sha: tagSha, object: ref.object },
      }),
    ),
  );
  await assert.rejects(
    peelRemoteTag(
      identity.tag,
      mockGithub(goodRun, {
        [refPath]: { ...ref, object: { type: "tree", sha: tagSha } },
      }),
    ),
  );
});

test("GitHub transport forbids redirects and suppresses secret-bearing failures", async () => {
  const token = "SYNTHETIC_GH_CREDENTIAL_NOT_REAL";
  let captured;
  const fetch = async (url, init) => {
    captured = { url, init };
    return { ok: true, text: async () => '{"ok":true}' };
  };
  assert.deepEqual(
    await githubJson(`/repos/${REPOSITORY}/actions/runs/12345`, {
      fetch,
      token,
    }),
    { ok: true },
  );
  assert.equal(captured.init.redirect, "error");
  assert.equal(captured.init.headers.Authorization, `Bearer ${token}`);
  assert(captured.init.signal instanceof AbortSignal);
  const failing = async () => {
    throw new Error(token);
  };
  await assert.rejects(
    githubJson(`/repos/${REPOSITORY}/actions/runs/12345`, {
      fetch: failing,
      token,
    }),
    (error) => !String(error).includes(token),
  );
  await assert.rejects(
    githubJson("/repos/other/repo/actions/runs/1", { fetch, token }),
  );
  await assert.rejects(
    githubJson(`/repos/${REPOSITORY}/../../user`, { fetch, token }),
  );
});
