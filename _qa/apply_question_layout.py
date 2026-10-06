from pathlib import Path
import json, re
root = Path(__file__).resolve().parent.parent
path = root / 'index.html'
source = path.read_text(encoding='utf-8')
match = re.search(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', source, re.S)
card = json.loads(match[2])
for slide in card['slides']:
    if slide['id'] in ('T8', 'T9', 'G1'):
        slide['data']['image_above_options'] = True
source = source[:match.start(2)] + json.dumps(card, ensure_ascii=False) + source[match.end(2):]
source = source.replace('20261006-title-stretch', '20261006-image-above-options')
path.write_text(source, encoding='utf-8')
