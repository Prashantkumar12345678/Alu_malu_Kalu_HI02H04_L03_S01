from pathlib import Path
import asyncio, sys, json

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / '_qa' / 'tts_dependencies'))
import edge_tts

voices = {
    'vo_dadi_question': 'मालू से आलू लाने को किसने कहा? कालू ने। दादी ने। माँ ने।',
    'vo_dadi_kaalu': 'कालू ने।',
    'vo_dadi_dadi': 'दादी ने।',
    'vo_dadi_maa': 'माँ ने।',
    'vo_dadi_hint1': 'फिर से कोशिश कीजिए, कहानी याद कीजिए।',
    'vo_dadi_hint2': 'कालू ने, दादी ने, माँ ने।',
    'vo_dadi_hint3': 'मालू से आलू लाने के लिए दादी ने कहा था। यह सही उत्तर है, इसपर टैप कीजिए।',
    'vo_kaalu_question': 'कालू कौन है? कुत्ता। गाय। बिल्ली।',
    'vo_kaalu_hint1': 'फिर से कोशिश कीजिए, चित्र देखकर पहचानिए।',
    'vo_kaalu_hint2': 'कुत्ता, गाय, बिल्ली।',
    'vo_kaalu_hint3': 'कालू एक कुत्ता है। यह सही उत्तर है, इसपर टैप कीजिए।',
}

async def main():
    review = root / '_qa' / 'review_voices.json'
    if review.exists():
        voices.update(json.loads(review.read_text(encoding='utf-8')))
    for name, text in voices.items():
        path = root / 'assets' / 'Audio' / (name + '.mp3')
        if path.exists() and path.stat().st_size > 1000:
            continue
        await edge_tts.Communicate(text, 'hi-IN-SwaraNeural', rate='-10%').save(str(path))
        print(name, path.stat().st_size, flush=True)

if __name__ == '__main__':
    asyncio.run(main())
