from pathlib import Path
import asyncio, sys

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / '_qa' / 'tts_dependencies'))
import edge_tts

# 6th puzzle question (review deck): आलू मिलने पर मालू ने कालू से क्या कहा? — correct: option 2
voices = {
    'vo_khoj_prompt': 'आलू मिलने पर मालू ने कालू से क्या कहा? घर चलो, कालू। वाह कालू! ढूँढ निकाले आलू। कालू, आओ खाएँ आलू।',
    'vo_khoj_ghar': 'घर चलो, कालू।',
    'vo_khoj_wah': 'वाह कालू! ढूँढ निकाले आलू।',
    'vo_khoj_khaen': 'कालू, आओ खाएँ आलू।',
    'vo_khoj_hint2': 'घर चलो, कालू। वाह कालू! ढूँढ निकाले आलू। कालू, आओ खाएँ आलू।',
    'vo_khoj_hint3': 'मालू ने कहा, वाह कालू! ढूँढ निकाले आलू। यह सही उत्तर है, इसपर टैप कीजिए।',
}

async def main():
    for name, text in voices.items():
        path = root / 'assets' / 'Audio' / (name + '.mp3')
        await edge_tts.Communicate(text, 'hi-IN-SwaraNeural', rate='-10%').save(str(path))
        print(name, path.stat().st_size, flush=True)

if __name__ == '__main__':
    asyncio.run(main())
