# The film's sounds. The music bed is synthesized here, so it is this repository's own. The key sounds are built from
# Kenney's Interface Sounds (CC0): one click, and a burst of six for a line that types itself in.
#
#   python3 sounds.py <kenney_interface-sounds folder> <out folder>
import subprocess, sys, wave, numpy as np

kenney, out_dir = sys.argv[1], sys.argv[2]
SR = 48000


def write(name, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1:
        x = x[:, None]
    w = wave.open(f"{out_dir}/{name}", "wb")
    w.setnchannels(x.shape[1]); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype("<i2").tobytes()); w.close()


def load(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{kenney}/{name}.ogg", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


# --- One key click, and typing: six presses in 0.4 s, uneven like typing.
write("click.wav", load("click_002"))
seq = [("click_002", 0.00, 1.0), ("click_005", 0.065, 0.8), ("click_003", 0.14, 0.95),
       ("click_001", 0.20, 0.7), ("click_002", 0.275, 0.9), ("click_005", 0.345, 0.85)]
typ = np.zeros(int(0.5 * SR), np.float32)
for name, at, gain in seq:
    x = load(name)[: int(0.08 * SR)]
    i = int(at * SR)
    typ[i:i + len(x)] += gain * x
write("type.wav", typ / np.abs(typ).max() * 10 ** (-4 / 20))

# --- Music: 40 s at 96 BPM. A pad on four chords, a plucked arpeggio that echoes left and right, a soft kick and sub.
BPM = 96; BEAT = 60 / BPM; LEN = 40.0; BAR = 4 * BEAT
N = int(LEN * SR); L = np.zeros(N); R = np.zeros(N); t_all = np.arange(N) / SR
chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 60], [55, 59, 62, 67]]  # Am7, Fmaj7, C, G


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


def add(buf, at, x):
    i = int(at * SR)
    if i >= N:
        return
    x = x[: N - i]
    buf[i:i + len(x)] += x


for bar in range(int(LEN / BAR) + 1):
    ch = chords[(bar // 2) % 4]; at = bar * BAR
    # Pad: each chord tone as a few soft harmonics, two voices slightly apart for width, slow in and out.
    m = int((BAR + 0.6) * SR); t = np.arange(m) / SR
    env = np.minimum(1, t / 0.5) * np.minimum(1, (t[-1] - t) / 0.6)
    for k, p in enumerate(ch):
        f = note(p)
        for side, det in ((L, 0.997), (R, 1.003)):
            v = sum(np.sin(2 * np.pi * f * det * h * t + k) / h ** 2 for h in (1, 2, 3, 4))
            add(side, at, 0.05 * env * v)
    # Sub on the root, and a soft kick on beats one and three.
    f = note(ch[0] - 12); m = int(BAR * SR); t = np.arange(m) / SR
    sub = 0.16 * np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.05) * np.minimum(1, (t[-1] - t) / 0.2)
    add(L, at, sub); add(R, at, sub)
    for b in (0, 2):
        m = int(0.3 * SR); t = np.arange(m) / SR
        kick = 0.5 * np.sin(2 * np.pi * (45 * t + 2.6 * (1 - np.exp(-t / 0.03)))) * np.exp(-t / 0.09)
        add(L, at + b * BEAT, kick); add(R, at + b * BEAT, kick)
    # Arpeggio: eighth notes up the chord, an octave above, each pluck echoed on the other side.
    for e in range(8):
        f = note(ch[e % 4] + 12 + (12 if e in (3, 7) else 0)); m = int(0.5 * SR); t = np.arange(m) / SR
        pl = 0.11 * (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / 0.12) * np.minimum(1, t / 0.003)
        a, b2 = (L, R) if e % 2 == 0 else (R, L)
        add(a, at + e * BEAT / 2, pl); add(b2, at + e * BEAT / 2 + BEAT * 0.75, 0.45 * pl); add(a, at + e * BEAT / 2 + BEAT * 1.5, 0.2 * pl)
mix = np.stack([L, R], 1)
mix *= np.minimum(1, (LEN - t_all) / 2.0)[:, None]  # the last two seconds fade
mix = np.tanh(mix * 1.6)
write("music.wav", mix / np.abs(mix).max() * 10 ** (-3 / 20))
print("sounds written")
