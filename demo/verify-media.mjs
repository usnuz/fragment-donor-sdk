import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const media = join(root, 'publishing/media');
const manifest = JSON.parse(await readFile(join(media, 'assets.json'), 'utf8'));
for (const asset of manifest.assets) {
  assert.match(asset.file, /^[a-z0-9-]+\.(svg|png|srt|mp4)$/);
  const buffer = await readFile(join(media, asset.file));
  assert.equal(buffer.length, asset.bytes, `Size changed: ${asset.file}`);
  assert.equal(createHash('sha256').update(buffer).digest('hex'), asset.sha256, `Hash changed: ${asset.file}`);
  if (asset.file.endsWith('.png')) {
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(buffer.readUInt32BE(16), 1920);
    assert.equal(buffer.readUInt32BE(20), 1080);
  }
}
assert.equal(manifest.assets.filter(asset => asset.file.endsWith('.png')).length, 5);
const result = spawnSync(process.env.FFPROBE_BIN || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate:stream_tags=language', '-of', 'json', 'walkthrough-en.mp4'], { cwd: media, encoding: 'utf8', windowsHide: true });
if (result.error || result.status !== 0) throw result.error || new Error(result.stderr);
const probe = JSON.parse(result.stdout);
const video = probe.streams.filter(stream => stream.codec_type === 'video');
const subtitles = probe.streams.filter(stream => stream.codec_type === 'subtitle');
assert.equal(video.length, 1);
assert.equal(video[0].codec_name, 'h264');
assert.equal(video[0].width, 1920);
assert.equal(video[0].height, 1080);
assert.equal(video[0].r_frame_rate, '30/1');
assert.equal(subtitles.length, 1);
assert.equal(subtitles[0].codec_name, 'mov_text');
assert.equal(subtitles[0].tags.language, 'eng');
assert.equal(probe.streams.filter(stream => stream.codec_type === 'audio').length, 0);
assert.ok(Math.abs(Number(probe.format.duration) - 50) < 0.1);
await writeFile(join(media, 'verification.json'), JSON.stringify({ kind: manifest.kind, checks: { hashes_and_sizes: 'PASS', five_png_dimensions: 'PASS', video_probe: 'PASS', api_calls: 'none; static native rendering' }, probe }, null, 2) + '\n');
// Keep the existing browser baseline separate: render-media.mjs owns assets.json.
const baseline = JSON.parse(await readFile(join(media, 'docs-uz-baseline.json'), 'utf8'));
assert.equal(baseline.file, 'docs-uz-baseline.jpg');
assert.equal(baseline.source_url, 'https://usnuz.github.io/fragment-donor-sdk/uz/');
assert.equal(baseline.bytes, 117338);
assert.equal(baseline.sha256, 'c8e6dd90b653f8043ea83266dc2b7536327fb8b0c56b37400ae0b5261396133b');
assert.equal(baseline.width, 1265);
assert.equal(baseline.height, 712);
assert.equal(baseline.captured_at, null);
assert.equal(baseline.baseline_only, true);
assert.equal(baseline.predates_current_demo_and_footer, true);
assert.equal(baseline.new_current_ui_capture, false);
assert.equal(baseline.payment_proof, false);
assert.equal(baseline.api_request_evidence, false);
const baselineBytes = await readFile(join(media, baseline.file));
assert.equal(baselineBytes.length, baseline.bytes);
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'), baseline.sha256);
assert.equal(baselineBytes.subarray(0, 3).toString('hex'), 'ffd8ff');
assert.equal(baselineBytes.subarray(-2).toString('hex'), 'ffd9');
const baselineResult = spawnSync(process.env.FFPROBE_BIN || 'ffprobe', ['-v', 'error', '-show_entries', 'format=size:stream=codec_type,codec_name,width,height', '-of', 'json', baseline.file], { cwd: media, encoding: 'utf8', windowsHide: true });
if (baselineResult.error || baselineResult.status !== 0) throw new Error('Baseline JPEG probe failed; parser diagnostics withheld');
const baselineProbe = JSON.parse(baselineResult.stdout);
assert.equal(baselineProbe.streams.length, 1);
assert.equal(baselineProbe.streams[0].codec_type, 'video'); // ffprobe describes still JPEGs as one video stream.
assert.equal(baselineProbe.streams[0].codec_name, 'mjpeg');
assert.equal(baselineProbe.streams[0].width, baseline.width);
assert.equal(baselineProbe.streams[0].height, baseline.height);
assert.equal(Number(baselineProbe.format.size), baseline.bytes);
await writeFile(join(media, 'docs-uz-baseline.verification.json'), JSON.stringify({
  kind: baseline.kind,
  manifest: 'docs-uz-baseline.json',
  checks: { exact_known_hash_and_size: 'PASS', jpeg_magic_and_dimensions: 'PASS', unchanged_existing_baseline: 'PASS' },
  current_ui_capture: false,
  payment_or_api_execution_proof: false,
  capture_time: 'unknown; source-file modification time only',
  public_delivery: baseline.public_delivery,
  probe: baselineProbe,
}, null, 2) + '\n');
console.log('Media verification PASS: unchanged 12 rendered artifacts; separate 1265x712 reviewed baseline JPEG. No current-UI capture or payment proof.');
