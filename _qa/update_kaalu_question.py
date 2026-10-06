from pathlib import Path
import json, re
from generate_question_voice import voices

root = Path(__file__).resolve().parent.parent
path = root / 'index.html'
source = path.read_text(encoding='utf-8')
match = re.search(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', source, re.S)
card = json.loads(match[2])
slide = next(s for s in card['slides'] if s['id'] == 'T9')
slide['phase'] = 'guided'
slide['prompt_hi'] = 'कालू कौन है?'
slide['audio'] = {'prompt': 'vo_kaalu_question', 'try_again': 'vo_kaalu_hint1',
                  'hint': 'vo_kaalu_hint2', 'reveal': 'vo_kaalu_hint3',
                  'correct': 'vo_o_opt_kutta'}
slide['data'].update(auto=False, shuffle=False, evidence=[])
slide['data']['options'] = [
    {'img': 'opt_kutta', 'label_hi': 'कुत्ता', 'audio': 'vo_o_opt_kutta', 'correct': True},
    {'img': 'opt_gaay', 'label_hi': 'गाय', 'audio': 'vo_o_opt_gaay'},
    {'img': 'opt_billi', 'label_hi': 'बिल्ली', 'audio': 'vo_o_opt_billi'},
]
card['slides'].remove(slide)
position = next(i for i,s in enumerate(card['slides']) if s['id'] == 'T8')
card['slides'].insert(position + 1, slide)
card['phase_distribution'] = {phase: sum(s['phase'] == phase for s in card['slides'])
                              for phase in ('tutorial', 'guided', 'practice')}
for name, text in voices.items():
    if name.startswith('vo_kaalu_'):
        card['assets']['audio'][name] = 'assets/Audio/' + name + '.mp3'
        card['assets']['audio_text'][name] = text
path.write_text(source[:match.start(2)] + json.dumps(card, ensure_ascii=False) + source[match.end(2):], encoding='utf-8')
print('Updated T9: guided practice immediately after T8, ordered picture options and four new voice clips.')
