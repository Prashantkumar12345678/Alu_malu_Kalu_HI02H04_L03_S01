from pathlib import Path
from zipfile import ZipFile
import re, json, subprocess
root=Path(__file__).resolve().parent.parent
out=root/'_qa'/'story_reference'
source=(out/'HI02H04_L01_S01.html').read_text(encoding='utf-8')
card=json.loads(re.search(r'<script type="application/json" id="cardData">(.*?)</script>',source,re.S)[1])
print(json.dumps(card['slides'][0],ensure_ascii=True))
with ZipFile(r'D:\Downloads\HI02H04_L01_S01-20260916T080241Z-1-001.zip') as z:
    prefix=next(n for n in z.namelist() if n.endswith('/HI02H04_L01_S01.html')).rsplit('/',1)[0]+'/'
    image_id=card['slides'][0]['data'].get('image_id')
    for n in z.namelist():
        relative=n.removeprefix(prefix)
        if relative.startswith('assets/UI/') or relative.startswith('assets/Images/'+str(image_id)+'.'):
            if n.endswith('/'):continue
            target=out/relative
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(z.read(n))
audio='''<script>window.Audio=class{play(){this.t=setTimeout(()=>this.onended&&this.onended(),80);return Promise.resolve();}pause(){clearTimeout(this.t);}addEventListener(){}};</script>'''
checks='''<script>
(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));
document.getElementById('startGate').classList.add('hidden');document.body.classList.remove('is-start');mountSlide(0);await wait(1500);document.getAnimations().forEach(a=>a.cancel());
await document.fonts.ready;const sr=document.getElementById('stage').getBoundingClientRect(),scale=sr.width/1333;
const selectors=['.tut-card','.tut-prompt','.tut-content','.story-scene','.story-frame','.story-img','.story-caption','.tut-mascot','.tut-audio','#navBtn'];
const result=selectors.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return {s,x:(r.x-sr.x)/scale,y:(r.y-sr.y)/scale,w:r.width/scale,h:r.height/scale,border:c.border,background:c.backgroundColor,radius:c.borderRadius,font:c.fontSize,padding:c.padding};});
const report=document.createElement('pre');report.id='qa-report';report.hidden=true;report.textContent=JSON.stringify(result);document.body.appendChild(report);})();</script>'''
page=out/'measure.html';page.write_text(source.replace('</head>',audio+'</head>').replace('</body>',checks+'</body>'),encoding='utf-8')
run=subprocess.run([r'C:\Program Files\Google\Chrome\Application\chrome.exe','--headless=new','--disable-gpu','--allow-file-access-from-files','--user-data-dir='+str(root/'_qa'/'chrome-profile'),'--virtual-time-budget=5000','--window-size=1456,816','--screenshot='+str(out/'measure.png'),'--dump-dom',page.as_uri()],capture_output=True,encoding='utf-8',errors='replace',timeout=35)
match=re.search(r'<pre id="qa-report"[^>]*>(.*?)</pre>',run.stdout,re.S)
print(match[1] if match else run.stderr[-600:])
