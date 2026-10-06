from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
reference = Path(r'D:\_A FLN files\HI02H11_L03_S02-20260914T105504Z-1-001\HI02H11_L03_S02')
source = (reference / 'index.html').read_text(encoding='utf-8')
body = source.split('function confettiNew(host, n){', 1)[1].split('\nfunction starBurst(host, o){', 1)[0].rstrip()
assert body.endswith('}')
body = body[:-1]
colors = source.split('var CONF = [', 1)[1].split('\n];', 1)[0]
shapes = source.split('var SHAPES = ', 1)[1].split(';', 1)[0]
replacement = '''/* Correct-answer paper confetti copied from the HI02H11 reference toolkit. */
function confettiCannon() {
  const host = document.querySelector('.slide-stage') || document.body;
  const n = 80;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const CONF = [''' + colors + '\n];\n  const SHAPES = ' + shapes + ''';
  const cue = () => {
    try {
      const audio = new Audio('assets/Audio/reference_sfx_burst.wav');
      audio.volume = .7;
      audio.play().catch(() => {});
    } catch (_) {}
  };
''' + body + '\n}\n'
app = (root / 'app.js').read_text(encoding='utf-8')
start = app.index('/* confetti cannons from BOTH sides')
end = app.index('/* ---------- Block Town helpers', start)
(root / 'app.js').write_text(app[:start] + replacement + app[end:], encoding='utf-8')
css = source.split('.fx-confetti{', 1)[1].split('/* ===== FLN-KIT (quoted): answer-tempo END ===== */', 1)[0]
with (root / 'style.css').open('a', encoding='utf-8') as target:
    target.write('\n/* Reference toolkit paper confetti: identical physics and shapes. */\n.fx-confetti{' + css + '\n')
shutil.copyfile(reference / 'assets/SFX/sfx_burst.wav', root / 'assets/Audio/reference_sfx_burst.wav')
print('Copied reference confetti JS, CSS, and sound.')
