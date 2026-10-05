import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require(process.env.FRAGMENT_SHARP_MODULE || 'sharp');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const media = join(root, 'publishing/media');
const storyboard = JSON.parse(await readFile(join(media, 'storyboard.json'), 'utf8'));
const stamp = value => new Date(value * 1000).toISOString().slice(11, 23).replace('.', ',');
for (const frame of storyboard.frames) {
  const svg = await readFile(join(media, frame.file + '.svg'));
  await sharp(svg).png().toFile(join(media, frame.file + '.png'));
}
const duration = storyboard.seconds_per_frame * storyboard.frames.length;
await writeFile(join(media, 'frames.ffconcat'), 'ffconcat version 1.0\n' + storyboard.frames.map(frame => `file '${frame.file}.png'\nduration ${storyboard.seconds_per_frame}\n`).join('') + `file '${storyboard.frames.at(-1).file}.png'\n`);
const subtitles = storyboard.frames.map((frame, index) => `${index + 1}\n${stamp(index * storyboard.seconds_per_frame)} --> ${stamp((index + 1) * storyboard.seconds_per_frame - 0.001)}\n${frame.caption}\n`).join('\n');
await writeFile(join(media, 'walkthrough-en.srt'), subtitles);
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';
const result = spawnSync(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', 'frames.ffconcat', '-i', 'walkthrough-en.srt', '-map', '0:v:0', '-map', '1:s:0', '-vf', 'fps=30,format=yuv420p', '-t', String(duration), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng', '-metadata', 'title=Fragment Donor — rendered synthetic walkthrough, not a live transaction or screencast', '-metadata', 'comment=Silent code-native fixture rendering. No SDK API calls, no secrets, no real payments.', '-movflags', '+faststart', '-an', 'walkthrough-en.mp4'], { cwd: media, stdio: 'inherit', windowsHide: true });
if (result.error || result.status !== 0) throw result.error || new Error(`ffmpeg exited ${result.status}`);
const files = [...storyboard.frames.flatMap(frame => [frame.file + '.svg', frame.file + '.png']), 'walkthrough-en.srt', 'walkthrough-en.mp4'];
const assets = [];
for (const name of files) {
  const buffer = await readFile(join(media, name));
  assets.push({ file: name, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
}
await writeFile(join(media, 'assets.json'), JSON.stringify({ kind: storyboard.kind, language: 'en', video: { duration_seconds: duration, width: 1920, height: 1080, codec: 'H.264', fps: 30, audio: 'none / silent', captions: 'burned frame summaries + embedded English subtitle track + SRT sidecar' }, assets }, null, 2) + '\n');
console.log(`Rendered ${storyboard.frames.length} SVG/PNG frames and ${duration}s silent synthetic MP4 with English captions; SHA256 manifest saved.`);
