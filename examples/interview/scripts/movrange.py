# Prints the byte range that holds a span of time in a QuickTime file, read from its index (the `moov` box: chunk
# offsets, sample sizes and timing). With it, a few seconds of a very large remote file can be fetched by range.
#
#   python3 movrange.py <the file's first bytes, with the whole moov box> <from seconds> <to seconds>
import struct, sys
b = open(sys.argv[1], 'rb').read()
t0, t1 = float(sys.argv[2]), float(sys.argv[3])
def boxes(o, end):
    while o + 8 <= end:
        size, typ = struct.unpack('>I4s', b[o:o+8]); h = 8
        if size == 1: size = struct.unpack('>Q', b[o+8:o+16])[0]; h = 16
        if size < 8: break
        yield typ, o + h, o + size
        o += size
def find(o, end, path):
    for typ, s, e in boxes(o, end):
        if typ == path[0]:
            if len(path) == 1: yield s, e
            else: yield from find(s, e, path[1:])
lo, hi = None, 0
for ts, te in find(0, len(b), [b'moov', b'trak']):
    (ms, me), = find(ts, te, [b'mdia', b'mdhd'])
    ver = b[ms]; scale = struct.unpack('>I', b[ms+(20 if ver else 12):ms+(24 if ver else 16)])[0]
    stbl = list(find(ts, te, [b'mdia', b'minf', b'stbl']))[0]
    def one(name):
        r = list(find(stbl[0], stbl[1], [name])); return r[0] if r else None
    stts = one(b'stts'); stsc = one(b'stsc'); stsz = one(b'stsz'); co = one(b'co64'); wide = True
    if not co: co = one(b'stco'); wide = False
    if not (stts and stsc and stsz and co): continue
    n = struct.unpack('>I', b[stts[0]+4:stts[0]+8])[0]
    deltas = [struct.unpack('>II', b[stts[0]+8+i*8:stts[0]+16+i*8]) for i in range(n)]
    size0, count = struct.unpack('>II', b[stsz[0]+4:stsz[0]+12])
    sizes = None if size0 else struct.unpack(f'>{count}I', b[stsz[0]+12:stsz[0]+12+4*count])
    nco = struct.unpack('>I', b[co[0]+4:co[0]+8])[0]
    offs = struct.unpack(f'>{nco}{"Q" if wide else "I"}', b[co[0]+8:co[0]+8+nco*(8 if wide else 4)])
    nsc = struct.unpack('>I', b[stsc[0]+4:stsc[0]+8])[0]
    sc = [struct.unpack('>III', b[stsc[0]+8+i*12:stsc[0]+20+i*12]) for i in range(nsc)]
    # sample times
    times = []; t = 0
    for c, d in deltas:
        for _ in range(c): times.append(t / scale); t += d
    s = 0
    for ci in range(nco):
        per = [x for x in sc if x[0] <= ci + 1][-1][1]
        pos = offs[ci]
        for _ in range(per):
            if s >= count: break
            sz = size0 or sizes[s]
            if s < len(times) and t0 <= times[s] <= t1:
                lo = pos if lo is None else min(lo, pos); hi = max(hi, pos + sz)
            pos += sz; s += 1
    print('track scale', scale, 'samples', count, file=sys.stderr)
print(lo, hi)
