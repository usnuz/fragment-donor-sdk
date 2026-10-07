# Synthetic fixture viewer and rendered walkthrough

This accessible, CSS-only page switches pre-rendered `contract/fixtures.json`
responses for four operations. It sends no API request, accepts no secret and
executes no JavaScript. A purchase `unconfirmed: true` is an unknown payment
outcome, not safe rejection; the viewer explains manual reconciliation.

```sh
node demo/build.mjs
node --test demo/test.mjs
```

Output: `site/demo/index.html` and five native SVG gallery frames in
`publishing/media/`. Build the normal docs first or afterwards; keep the demo
builder in the Pages build sequence. No external account or publication is used.

To regenerate PNGs and the actual 50-second silent MP4, make the local `sharp`
package and ffmpeg available (or set `FRAGMENT_SHARP_MODULE` and `FFMPEG_BIN`):

```sh
node demo/render-media.mjs
node demo/verify-media.mjs
```

These are **rendered synthetic walkthrough frames, not browser screenshots,
a live transaction or a screencast**. Captions are burned into the frame design;
the MP4 also has an English subtitle track and `walkthrough-en.srt` sidecar.
`publishing/media/assets.json` contains actual artifact sizes and SHA256 hashes.
The verifier uses ffprobe (`FFPROBE_BIN` can select the executable), checks
every artifact hash/size and PNG dimensions, and records actual video-stream
metadata in `publishing/media/verification.json`.
No narration/audio is claimed. Registry publication, platform submission and
search-engine indexing are separate states.

Native mocked tests are the evidence for the no-duplicate-purchase rule; this
viewer does not run those tests or invent a request counter. Purchase requests
transmit wallet mnemonic and Fragment session/cookie data to the API operator.
