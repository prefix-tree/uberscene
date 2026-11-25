# The interview edit

A 38-second interview clip in a kinetic-type style: a cold open on the speaker's strongest line in giant caps, tall
caps beside him, flash cards, a blue card with the spacecraft, and the quote typing itself in beside a black-and-white
cut-out of him. Every title is anchored to a word he says.

`video.tsx` is the film (1920x1080), and `reel.tsx` the same edit laid out as a vertical reel (1080x1920) for TikTok,
Reels and Shorts: the words in the upper part, inside both platforms' safe zones, and the speaker low in the frame.
What it was like to build, tool by tool, is in the agent skill
(`plugins/uberscene/skills/uberscene/references/interview-edit.md`), and what UberScene was missing for it is in
[decision 0039](../../docs/decisions/0039-a-person-cut-out-of-the-background.md) and [the backlog](../../BACKLOG.md).

## Rebuild it

The media is not in the repository (about 110 MB). One script prepares it from public sources:

```sh
bash examples/interview/scripts/prepare.sh
npx tsx packages/render/src/cli.ts examples/interview/video.tsx --out examples/interview/interview.mp4
npx tsx packages/render/src/cli.ts examples/interview/reel.tsx --out examples/interview/reel.mp4
```

Check the reel against the platform it goes to: `--check-layout --safe-zone reels` (or `tiktok`, `shorts`).

The script needs ffmpeg, git, curl and Python 3 with numpy, torch and torchvision, and about 2 GB of disk while it
runs. On four CPU cores it takes about ten minutes, most of it the cut-out.

| File | What it is |
|---|---|
| `video.tsx` | The film |
| `reel.tsx` | The film as a vertical reel |
| `uberscene.json` | The manifest: each asset's length and size, and the words of the take |
| `talk.json` | The take's words with their times, from Whisper (`small.en`, word timestamps) |
| `scripts/prepare.sh` | Fetches and makes everything in `media/` |
| `scripts/movrange.py` | Finds the bytes of a few seconds inside a very large QuickTime file |
| `scripts/cutout.py` | The speaker over green, from a matting model |
| `scripts/sounds.py` | The music bed (synthesized) and the key sounds |

## How the cut-out is made

UberScene cannot cut a person out of a background yet. `cutout.py` runs RobustVideoMatting on every frame and writes
the speaker over pure green; the film removes the green with `colorKey`. Backlog items 2 and 6 replace this with a
matte file and a `cutout` prop, and item 11 rebuilds this film on them.

## Sources and licences

- **Footage**: Dr. Joe Westlake, and the Voyager b-roll, from NASA's Scientific Visualization Studio
  ([svs.gsfc.nasa.gov/15111](https://svs.gsfc.nasa.gov/15111/)). NASA material, public domain. NASA does not endorse
  this project.
- **Key sounds**: Kenney's Interface Sounds, CC0, fetched from the [soundcn](https://github.com/kapishdima/soundcn)
  repository.
- **Music**: synthesized by `scripts/sounds.py`; this repository's own.
- **RobustVideoMatting** (Lin et al.), GPL-3.0. The script downloads it and its weights to make the cut-out. Neither
  is in this repository, and the cut-out video it makes is not either.
