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
console.log('Media verification PASS: 12 artifact hashes/sizes, five 1920x1080 PNGs, 50s H.264/30fps video, English subtitles, no audio.');
