from pathlib import Path
import json, re
from generate_question_voice import voices

root = Path(__file__).resolve().parent.parent
path = root / 'index.html'
source = path.read_text(encoding='utf-8')
pattern = r'(<script type="application/json" id="cardData">)(.*?)(</script>)'
match = re.search(pattern, source, re.S)
card = json.loads(match[2])
slide = next(s for s in card['slides'] if s['id'] == 'T8')
slide['phase'] = 'guided'
slide['prompt_hi'] = 'मालू से आलू लाने को किसने कहा?'
slide['audio'] = {'prompt': 'vo_dadi_question', 'try_again': 'vo_dadi_hint1',
                  'hint': 'vo_dadi_hint2', 'reveal': 'vo_dadi_hint3', 'correct': 'vo_dadi_dadi'}
slide['data'].update(picture_only=True, auto=False, shuffle=False, evidence=[])
slide['data']['passage']['lines'] = []
slide['data']['options'] = [
    {'label_hi': 'कालू ने', 'audio': 'vo_dadi_kaalu'},
    {'label_hi': 'दादी ने', 'audio': 'vo_dadi_dadi', 'correct': True},
    {'label_hi': 'माँ ने', 'audio': 'vo_dadi_maa'},
]
card['slides'].remove(slide)
position = next(i for i,s in enumerate(card['slides']) if s['id'] == 'PT2')
card['slides'].insert(position + 1, slide)
print('phase_distribution before:', card.get('phase_distribution'))
card['phase_distribution'] = {phase: sum(s['phase'] == phase for s in card['slides'])
                              for phase in ('tutorial', 'guided', 'practice')}
for name, text in voices.items():
    card['assets']['audio'][name] = 'assets/Audio/' + name + '.mp3'
    card['assets']['audio_text'][name] = text
path.write_text(source[:match.start(2)] + json.dumps(card, ensure_ascii=False) + source[match.end(2):], encoding='utf-8')
print('Slide order:', [(s['id'],s['phase']) for s in card['slides']])
