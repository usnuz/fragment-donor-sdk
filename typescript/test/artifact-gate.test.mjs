import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import test from "node:test";

test("built artifact gate rejects unknown files, links, duplicate names and secret text", () => {
  const files = [
    "package/CHANGELOG.md",
    "package/LICENSE",
    "package/README.md",
    "package/dist/index.d.ts",
    "package/dist/index.js",
    "package/examples/all-endpoints.mjs",
    "package/package.json",
  ].map((path) => ({
    path,
    data: path.endsWith("package.json")
      ? JSON.stringify({
          name: "fragment-donor-sdk",
          version: "0.1.2",
          license: "MIT",
        })
      : "",
    type: 48,
  }));
  const fakeToken = "gh" + "p_" + "A".repeat(36); // Synthetic detection fixture.
  const gate = fileURLToPath(new URL("./check-artifacts.mjs", import.meta.url));
  for (const kind of ["valid", "extra", "link", "duplicate", "secret"]) {
    const members = files.map((member) => ({ ...member }));
    if (kind === "extra")
      members.push({ path: "package/unreviewed.json", data: "{}", type: 48 });
    if (kind === "link") members[0].type = 50;
    if (kind === "duplicate") members.push({ ...members[0] });
    if (kind === "secret") members[2].data = fakeToken;
    const parts = [];
    for (const member of members) {
      const header = Buffer.alloc(512);
      const data = Buffer.from(member.data);
      header.write(member.path, 0, 100);
      header.write(data.length.toString(8).padStart(11, "0") + "\0", 124, 12);
      header[156] = member.type;
      parts.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
    }
    parts.push(Buffer.alloc(1024));
    const temporaryRoot = resolve(tmpdir());
    const directory = mkdtempSync(
      join(temporaryRoot, "fragment-donor-artifact-test-"),
    );
    try {
      const artifact = join(directory, "synthetic.tgz");
      writeFileSync(artifact, gzipSync(Buffer.concat(parts)));
      const result = spawnSync(process.execPath, [gate, artifact], {
        encoding: "utf8",
      });
      assert.equal(result.status === 0, kind === "valid");
      assert.equal((result.stdout + result.stderr).includes(fakeToken), false);
    } finally {
      assert.equal(dirname(resolve(directory)), temporaryRoot);
      assert.ok(
        basename(directory).startsWith("fragment-donor-artifact-test-"),
      );
      rmSync(directory, { recursive: true, force: true });
    }
  }
});
