"""Measure where speech sits inside every VO recording (voiceovers 2/*.wav) so the word-by-word highlight
can follow the real voice: start/end of speech and the speech segments between pauses (>= 140 ms).
Writes CARD.assets.audio_timing = {audio_id: {"s": ms, "e": ms, "segs": [[ms, ms], ...]}} into index.html."""
import json, math, os, re, struct, wave
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(root, "voiceovers 2")
WIN = 0.02          # 20 ms frames
MIN_GAP = 0.14      # a pause this long splits two speech segments
def analyse(path):
    w = wave.open(path); sr = w.getframerate(); n = w.getnframes()
    d = struct.unpack("<%dh" % n, w.readframes(n)); hop = int(sr * WIN)
    rms = [math.sqrt(sum(x * x for x in d[i:i + hop]) / max(1, len(d[i:i + hop]))) for i in range(0, n, hop)]
    th = max(rms) * 0.07
    on = [r >= th for r in rms]
    segs, st, quiet = [], None, 0
    for k, v in enumerate(on):
        if v:
            if st is None: st = k
            quiet = 0
        elif st is not None:
            quiet += 1
            if quiet * WIN >= MIN_GAP:
                segs.append([st, k - quiet + 1]); st = None; quiet = 0
    if st is not None: segs.append([st, len(on)])
    segs = [[round(a * WIN * 1000), round(b * WIN * 1000)] for a, b in segs if (b - a) * WIN >= 0.06]
    return {"s": segs[0][0], "e": segs[-1][1], "segs": segs} if segs else None
timing = {}
for f in sorted(os.listdir(SRC)):
    if f.endswith(".wav") and "+" not in f:
        t = analyse(os.path.join(SRC, f))
        if t: timing[f[:-4]] = t
p = os.path.join(root, "index.html"); s = open(p, encoding="utf-8").read()
m = re.search(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', s, re.S)
card = json.loads(m.group(2)); card["assets"]["audio_timing"] = timing
s = s[:m.start(2)] + json.dumps(card, ensure_ascii=False) + s[m.end(2):]
open(p, "w", encoding="utf-8").write(s)
print(len(timing), "clips timed")
for k in ("vo_review_story_3", "vo_review_story_8a", "vo_fill_answer", "vo_o_t_nahi_mile_v2"):
    print(k, timing.get(k))
