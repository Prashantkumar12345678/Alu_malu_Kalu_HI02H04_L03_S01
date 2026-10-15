"""Build VO_Manifest.xlsx from the card in index.html, in play order.
Every question is followed by its options, one row each (repeated if another question already used
that clip), then its reveal line. Format follows the reference manifest: Audio ID | Script."""
import json, os, re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(root, "index.html"), encoding="utf-8").read()
card = json.loads(re.search(r'id="cardData">(.*?)</script>', html, re.S).group(1))
A = card["assets"]
text = json.load(open(os.path.join(root, "_qa", "review_voices.json"), encoding="utf-8"))
text.update(A["audio_text"])
NOTES = {  # lines whose script needs a production note
    "vo_review_story_8a": "मालू आलू खोज रहा था कि उसे सुनाई दिया, (VO यहीं रुकती है — “भौं, भौं, भौं” नहीं बोलना; उसकी जगह sfx_puppy_bark बजती है)",
}
SFX = [("sfx_dog_bark", "SFX (असली रिकॉर्डिंग, AI नहीं): बड़े कुत्ते (St. Bernard) की 3 भारी भौंक — भौं, भौं, भौं (~1.3 सेकंड)। "
        "कहानी पेज 8 पर VO “…उसे सुनाई दिया,” के तुरंत बाद बजती है। "
        "स्रोत: freesound.org/s/784914 (Primitv094), लाइसेंस CC0।")]

rows, seen = [], set()
def fid(k):
    return os.path.splitext(os.path.basename(A["audio"][k].split("?")[0]))[0]
def add(k, repeat=False):
    if not k or (k in seen and not repeat):
        return
    seen.add(k)
    path = os.path.join(root, A["audio"][k].split("?")[0])
    assert os.path.exists(path), path
    rows.append([fid(k), NOTES.get(fid(k), text[k])])

def slide(sl):
    au, d = sl.get("audio", {}), sl.get("data", {})
    add(au.get("prompt"))
    if sl["type"] == "STORY_READALONG":
        for ln in d["passage"]["lines"]:
            add(ln.get("audio"))
    if sl["type"] == "TAP_IN_SCENE":   # G0 speaks its two names on hint 2
        add("vo_o_kaalu", True); add("vo_review_identify_correct", True)
        for k in ("try_again", "hint", "reveal"):
            add(au.get(k))
    for o in d.get("options", []):
        add(o.get("audio"), True)
    if d.get("hint1_vo"):   # the 1st miss speaks the hint-1 line on this slide
        add(au.get("try_again"))
    if d.get("options"):
        add(au.get("reveal") if d.get("walk_hint") or d.get("kind") == "fill_blanks" else None)
        if not d.get("walk_hint") and d.get("kind") != "fill_blanks":
            for k in ("try_again", "hint", "reveal"):
                add(au.get(k))
        if d.get("kind") == "fill_blanks":
            add(au.get("correct"))
    if d.get("options") or sl["type"] == "TAP_IN_SCENE":
        add("vo_shabash")

add("vo_landing")
for sl in card["slides"]:
    slide(sl)
    if sl["type"] == "PICTURE_PUZZLE":
        for q in sl["data"]["questions"]:
            slide(q)
        add("vo_review_puzzle_assemble")
rows += [list(r) for r in SFX]

wb = openpyxl.Workbook(); ws = wb.active; ws.title = "VO Manifest"
ws.append(["Audio ID", "Script"])
for r in rows:
    ws.append(r)
for c in ws[1]:
    c.font = Font(bold=True, color="FFFFFF", size=12)
    c.fill = PatternFill("solid", fgColor="1F3864")
    c.alignment = Alignment(horizontal="center")
ws.column_dimensions["A"].width = 30; ws.column_dimensions["B"].width = 118; ws.freeze_panes = "A2"
wb.save(os.path.join(root, "VO_Manifest.xlsx"))
print(len(rows), "rows")
