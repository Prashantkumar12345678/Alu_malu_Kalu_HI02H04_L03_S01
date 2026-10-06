from pathlib import Path
import json, re
root = Path(__file__).resolve().parent.parent
path = root / 'index.html'
source = path.read_text(encoding='utf-8')
match = re.search(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', source, re.S)
card = json.loads(match[2])
puzzle = next(s for s in card['slides'] if s['id'] == 'PUZZLE_INTRO')
questions = [s for s in card['slides'] if s['data'].get('puzzle')]
if questions:
    puzzle['data']['questions'] = questions
    card['slides'] = [s for s in card['slides'] if s not in questions]
    card['phase_distribution']['practice'] -= len(questions)
puzzle['data']['interactive_questions'] = True
puzzle['prompt_hi'] = 'प्रश्नों के उत्तर देकर चित्र पूरा कीजिए।'
puzzle['audio']['prompt'] = 'vo_review_puzzle_cards'
voices = {
    'vo_review_puzzle_cards': 'प्रश्नचिह्न पर टैप करके प्रश्नों के उत्तर दीजिए। फिर चित्र के टुकड़ों को खिसकाकर चित्र पूरा कीजिए।',
    'vo_review_puzzle_assemble': 'अब चित्र के टुकड़ों को खिसकाकर चित्र पूरा कीजिए।',
}
for name in voices:
    card['assets']['audio'][name] = 'assets/Audio/' + name + '.mp3'
source = source[:match.start(2)] + json.dumps(card, ensure_ascii=False) + source[match.end(2):]
source = source.replace('20261006-full-question-image', '20261006-question-puzzle')
path.write_text(source, encoding='utf-8')
voice_path = root / '_qa' / 'review_voices.json'
existing = json.loads(voice_path.read_text(encoding='utf-8'))
existing.update(voices)
voice_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding='utf-8')
print('Puzzle questions:', len(puzzle['data']['questions']))
