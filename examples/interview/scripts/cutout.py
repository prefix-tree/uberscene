# The speaker over pure green, from RobustVideoMatting (GPL-3.0; fetched by prepare.sh, not part of this repository):
# its matte, and its own estimate of his colour at the edges, so the studio wall's tint does not come along. The film
# keys the green out with `colorKey`.
#
#   python3 cutout.py <take.mov> <RobustVideoMatting folder> <rvm_resnet50.pth> <out.webm> <seconds>
import subprocess, sys, os, numpy as np, torch
src, rvm, weights, out, seconds = sys.argv[1:6]
sys.path.insert(0, rvm)
from model import MattingNetwork
W, H, FPS = 1920, 1080, "24000/1001"
torch.set_num_threads(4)
net = MattingNetwork("resnet50").eval(); net.load_state_dict(torch.load(weights, map_location="cpu"))
rd = subprocess.Popen(["ffmpeg", "-v", "error", "-t", seconds, "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
wr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", FPS, "-i", "-",
                       "-c:v", "libvpx-vp9", "-b:v", "9M", "-g", "24", "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", out], stdin=subprocess.PIPE)
green = torch.tensor([0.0, 1.0, 0.0]).view(3, 1, 1)
rec = [None] * 4; n = 0; first = None
with torch.no_grad():
    while True:
        buf = rd.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        x = torch.from_numpy(np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()).permute(2, 0, 1).float().div(255).unsqueeze(0)
        # The model is recurrent and starts cold: the first frame is run a few times so it has settled by frame 0.
        if first is None:
            first = x
            for _ in range(6): _, _, *rec = net(first, *rec, downsample_ratio=0.25)
        fgr, pha, *rec = net(x, *rec, downsample_ratio=0.25)
        com = fgr[0] * pha[0] + green * (1 - pha[0])
        wr.stdin.write((com.clamp(0, 1) * 255).byte().permute(1, 2, 0).numpy().tobytes()); n += 1
wr.stdin.close(); wr.wait(); print(n, "frames")
