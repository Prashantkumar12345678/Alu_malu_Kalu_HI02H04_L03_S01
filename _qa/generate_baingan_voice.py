from pathlib import Path
import asyncio, sys

root = Path(__file__).resolve().parent.parent
try:
    import edge_tts  # an installed edge-tts (any Python)
except ImportError:
    sys.path.insert(0, str(root / '_qa' / 'tts_dependencies'))  # bundled copy, built for Python 3.11
    import edge_tts

# Review 1, G1: the correct option टमाटर becomes बैंगन, so every clip that names the options changes.
voices = {
    'vo_o_opt_baingan': 'बैंगन',
    'vo_review_vegetable_prompt_v2': 'मालू ने बगीचे से कौन-सी सब्ज़ी तोड़ी? बैंगन। आलू। गाजर।',
    'vo_review_vegetable_hint2_v2': 'बैंगन, आलू, गाजर।',
    'vo_review_vegetable_hint3_v2': 'मालू ने बगीचे से बैंगन तोड़े। यह सही उत्तर है, इसपर टैप कीजिए।',
    # Review 1: every correct answer ends on this (reference HI02H11 plays its शाबाश after the tapped word)
    'vo_shabash': 'शाबाश!',
}

async def main():
    only = set(sys.argv[1:])
    for name, text in voices.items():
        if only and name not in only:
            continue
        path = root / 'assets' / 'Audio' / (name + '.mp3')
        await edge_tts.Communicate(text, 'hi-IN-SwaraNeural', rate='-10%').save(str(path))
        print(name, path.stat().st_size, flush=True)

if __name__ == '__main__':
    asyncio.run(main())
