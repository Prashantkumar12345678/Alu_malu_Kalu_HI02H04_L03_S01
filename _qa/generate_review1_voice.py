from pathlib import Path
import asyncio, sys

root = Path(__file__).resolve().parent.parent
try:
    import edge_tts  # an installed edge-tts (any Python)
except ImportError:
    sys.path.insert(0, str(root / '_qa' / 'tts_dependencies'))  # bundled copy, built for Python 3.11
    import edge_tts

# Review 1 fixes. Question-only clips: the options now arrive one by one, each speaking its own word,
# so the question VO no longer reads the options out itself (and is repeated alone on the 2nd wrong tap).
voices = {
    'vo_q_dadi': 'मालू से आलू लाने को किसने कहा?',
    'vo_q_kaalu': 'कालू कौन है?',
    'vo_q_vegetable': 'मालू ने बगीचे से कौन-सी सब्ज़ी तोड़ी?',
    'vo_q_soil': 'आलू कहाँ उगते हैं?',
    'vo_q_sad': 'आलू न मिलने पर मालू कैसा महसूस कर रहा था?',
    'vo_q_basket': 'मालू ने दादी के आगे खाली टोकरी क्यों रख दी थी?',
    'vo_q_p4': 'दादी ने ‘ध्यान से देखो’ क्यों कहा?',
    'vo_q_khoj': 'आलू मिलने पर मालू ने कालू से क्या कहा?',
    'vo_o_t_nahi_mile_v2': 'उसे आलू नहीं मिले थे',
    'vo_review_celebrate_v2': 'बहुत बढ़िया, दोस्त! तुमने कमाल कर दिया!',
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
