from pathlib import Path
import copy, json, re

root = Path(__file__).resolve().parent.parent
path = root / 'index.html'
source = path.read_text(encoding='utf-8')
match = re.search(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', source, re.S)
card = json.loads(match[2])
slides = card['slides']
first = next(s for s in slides if s['id'] == 'T6')
texts = {
    'vo_review_story_8a': 'मालू आलू खोज रहा था कि उसे सुनाई दिया, “भौं, भौं, भौं।”',
    'vo_review_story_8b': 'कालू ने मिट्टी खोदी हुई थी, उसमें से निकले मोटे-मोटे आलू।',
}
first['data']['passage']['lines'] = [{'text': texts['vo_review_story_8a'], 'audio': 'vo_review_story_8a'}]
if not any(s['id'] == 'T6B' for s in slides):
    second = copy.deepcopy(first)
    second['id'] = 'T6B'
    second['audio'] = {}
    second['data']['passage']['lines'] = [{'text': texts['vo_review_story_8b'], 'audio': 'vo_review_story_8b'}]
    slides.insert(slides.index(first) + 1, second)
    card['phase_distribution']['tutorial'] += 1
stories = [s for s in slides if s['type'] == 'STORY_READALONG']
for number, slide in enumerate(stories, 1):
    slide['data']['page_no'] = number
    slide['data']['page_total'] = len(stories)
for name, text in texts.items():
    card['assets']['audio'][name] = 'assets/Audio/' + name + '.mp3'
    # Keep the authored spoken-text map consistent with the split narration.
    for key, value in card['assets'].items():
        if isinstance(value, dict) and value.get('vo_review_story_8', '').startswith('मालू'):
            value[name] = text
source = source[:match.start(2)] + json.dumps(card, ensure_ascii=False) + source[match.end(2):]
path.write_text(source, encoding='utf-8')
voices_path = root / '_qa' / 'review_voices.json'
voices = json.loads(voices_path.read_text(encoding='utf-8'))
voices.update(texts)
voices_path.write_text(json.dumps(voices, ensure_ascii=False, indent=2), encoding='utf-8')
print('Story screens:', len(stories), 'Lesson screens:', len(slides))
