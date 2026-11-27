#!/usr/bin/env bash
# Prepares the interview film's media into ../media, from public sources. It needs ffmpeg, git, curl and Python 3
# with numpy, torch and torchvision, and about 2 GB of disk while it runs. It skips what is already there.
#
#   bash scripts/prepare.sh
#
# What it fetches: 42 seconds of a NASA interview and its b-roll (public domain), Kenney's interface sounds (CC0, from
# the soundcn repository), and RobustVideoMatting with its weights (GPL-3.0; used here to make the cut-out, not shipped).
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
media="$here/media"; work="$here/.work"
mkdir -p "$media" "$work"
SVS=https://svs.gsfc.nasa.gov/vis/a010000/a015100/a015111
FPS=24000/1001
VP9="-c:v libvpx-vp9 -g 24 -deadline good -cpu-used 4 -row-mt 1 -pix_fmt yuv420p"

# 1. The answer, 3:02 to 3:42 of the interview. The full file is 12.8 GB of ProRes, so only the bytes of those
#    seconds are fetched: its index (the first 300 KB) says where they are, and they go into a sparse local file.
if [ ! -f "$work/talk.mov" ]; then
  url="$SVS/JOE_WESTLAKE.mov"
  size=$(curl -sI "$url" | tr -d '\r' | awk 'tolower($1)=="content-length:" {print $2}')
  curl -s -r 0-300000 "$url" -o "$work/head.bin"
  read -r lo hi < <(python3 "$here/scripts/movrange.py" "$work/head.bin" 181 223 2>/dev/null)
  truncate -s "$size" "$work/sparse.mov"
  dd if="$work/head.bin" of="$work/sparse.mov" conv=notrunc status=none
  curl -s -r "$lo-$hi" "$url" | dd of="$work/sparse.mov" bs=1M seek="$lo" oflag=seek_bytes conv=notrunc status=none
  ffmpeg -v error -y -ss 182 -i "$work/sparse.mov" -map 0:v:0 -map 0:a:0 -t 40 \
    -c:v libx264 -crf 14 -preset fast -pix_fmt yuv420p -c:a pcm_s16le "$work/talk.mov" 2>/dev/null
  rm -f "$work/sparse.mov"
fi

# 2. The clip the film plays: 36.6 s, its speech brought to -14 LUFS (the export has no limiter).
[ -f "$media/talk.webm" ] || ffmpeg -v error -y -t 36.6 -i "$work/talk.mov" -af "loudnorm=I=-14:TP=-2:LRA=9" -ar 48000 \
  $VP9 -b:v 6M -c:a libopus -b:a 160k "$media/talk.webm"

# 3. The cut-out: the same frames with the speaker over pure green, from RobustVideoMatting.
if [ ! -f "$media/cutout.webm" ]; then
  [ -d "$work/rvm" ] || git clone -q --depth 1 https://github.com/PeterL1n/RobustVideoMatting.git "$work/rvm"
  [ -f "$work/rvm_resnet50.pth" ] || curl -sL -o "$work/rvm_resnet50.pth" \
    https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_resnet50.pth
  python3 "$here/scripts/cutout.py" "$work/talk.mov" "$work/rvm" "$work/rvm_resnet50.pth" "$media/cutout.webm" 36.6
fi

# 4. The b-roll: the spacecraft and Saturn, from the interview's b-roll reel.
[ -f "$work/broll.webm" ] || curl -s -o "$work/broll.webm" "$SVS/VOYAGER_1_BROLL_NEW_1.webm"
[ -f "$media/voyager.webm" ] || ffmpeg -v error -y -ss 18.8 -t 4.2 -i "$work/broll.webm" -r $FPS $VP9 -b:v 4M -an "$media/voyager.webm"
[ -f "$media/saturn.webm" ] || ffmpeg -v error -y -ss 113 -t 5 -i "$work/broll.webm" -r $FPS $VP9 -b:v 3M -an "$media/saturn.webm"

# 5. The cards: a full frame of white, and of the film's blue.
[ -f "$media/white.png" ] || ffmpeg -v error -y -f lavfi -i "color=c=white:s=1920x1080" -frames:v 1 "$media/white.png"
[ -f "$media/blue.png" ] || ffmpeg -v error -y -f lavfi -i "color=c=0x0d2cf5:s=1920x1080" -frames:v 1 "$media/blue.png"

# 6. The sounds: the music is synthesized; the key clicks come from Kenney's interface sounds.
if [ ! -f "$media/music.wav" ]; then
  [ -d "$work/soundcn" ] || git clone -q --depth 1 https://github.com/kapishdima/soundcn.git "$work/soundcn"
  python3 "$here/scripts/sounds.py" "$work/soundcn/assets/kenney_interface-sounds" "$media"
fi

echo "media is in $media"
