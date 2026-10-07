// Inspect built gzip/tar bytes directly. No dependencies, extraction or network.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const target = process.argv[2] ?? "fragment-donor-sdk-0.1.2.tgz";
const tar = gunzipSync(readFileSync(target));
const allowed = new Set([
  "package/CHANGELOG.md",
  "package/LICENSE",
  "package/README.md",
  "package/dist/index.d.ts",
  "package/dist/index.js",
  "package/examples/all-endpoints.mjs",
  "package/package.json",
]);
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  ],
  ["Telegram token", /\b\d{8,12}:[A-Za-z0-9_-]{35}\b/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["URL credential", /https?:\/\/(?!SYNTHETIC)[^\s/@:]+:[^\s/@]+@/],
];
const seen = new Set();
const decoder = new TextDecoder("utf-8", { fatal: true });
const field = (header, start, length) =>
  header
    .subarray(start, start + length)
    .toString("utf8")
    .replace(/\0.*$/s, "");
for (let offset = 0; offset + 512 <= tar.length; ) {
  const header = tar.subarray(offset, offset + 512);
  if (header.every((byte) => byte === 0)) break;
  const prefix = field(header, 345, 155);
  const path = (prefix ? prefix + "/" : "") + field(header, 0, 100);
  const type = header[156];
  assert.ok(type === 0 || type === 48, "Only ordinary files are allowed");
  assert.ok(
    allowed.has(path) && !seen.has(path),
    "Unexpected/duplicate package path; inspect privately",
  );
  seen.add(path);
  const size = parseInt(field(header, 124, 12).trim(), 8);
  assert.ok(
    Number.isSafeInteger(size) && size >= 0 && size <= 2_000_000,
    "Invalid member size",
  );
  assert.ok(offset + 512 + size <= tar.length, "Truncated member");
  const text = decoder.decode(tar.subarray(offset + 512, offset + 512 + size));
  assert.equal(text.includes("\0"), false, "Binary data forbidden");
  for (const [label, regex] of patterns)
    assert.equal(
      regex.test(text),
      false,
      `Potential ${label} in ${path}; contents withheld`,
    );
  if (path === "package/package.json") {
    const metadata = JSON.parse(text);
    assert.equal(metadata.name, "fragment-donor-sdk");
    assert.equal(metadata.version, "0.1.2");
    assert.equal(metadata.license, "MIT");
    assert.deepEqual(metadata.dependencies ?? {}, {});
  }
  offset += 512 + Math.ceil(size / 512) * 512;
}
assert.deepEqual(seen, allowed, "Missing package members");
console.log(
  "npm artifact PASS (exact allowlist, no links, UTF-8, known-secret patterns, MIT, no runtime dependencies)",
);
