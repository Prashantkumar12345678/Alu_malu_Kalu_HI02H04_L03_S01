from pathlib import Path
import subprocess, re, json, sys

root = Path(__file__).resolve().parent.parent
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
source = (root / 'index.html').read_text(encoding='utf-8')
# Deterministic audio timing exercises the production play()/input-lock paths.
audio = '''<script>
window.NativeAudio = window.Audio;
window.Audio = class {
  constructor(src){this.src=src;}
  play(){ (window.qaAudioLog ||= []).push(this.src);this.timer=setTimeout(()=>{if(this.onended)this.onended();},location.search.includes('mode=celebration')&&this.src?.includes('vo_review_celebrate')?3200:80); return Promise.resolve(); }
  pause(){clearTimeout(this.timer);}
};
</script>'''
checks = '''<script>
(async()=>{
 const results=[];
 const assert=(ok,name)=>{results.push({name,ok:!!ok});};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const mount=id=>{stopAudio(); document.getElementById('startGate').classList.add('hidden');document.body.classList.remove('is-start');mountSlide(CARD.slides.findIndex(s=>s.id===id));};
 const mode=new URLSearchParams(location.search).get('mode');
 try{
 if(mode==='phase_gate'){
   mount('PT1');await wait(450);await document.fonts.ready;
   const gate=document.getElementById('phaseGate'),bird=document.getElementById('phaseGateImg'),title=document.getElementById('phaseGateTitle');
   bird.getAnimations().forEach(a=>a.finish());
   const r=bird.getBoundingClientRect(), expected=Math.min(624,Math.max(360,innerHeight*.528)),ts=getComputedStyle(title);
   assert(gate.classList.contains('show')&&bird.complete&&bird.naturalWidth===900&&bird.naturalHeight===900,'Reference 900-square animated Swifty loads');
   assert(Math.abs(r.width-expected)<.1&&Math.abs(r.height-expected)<.1&&Math.abs(r.bottom-innerHeight)<.1&&Math.abs(r.x+r.width/2-innerWidth/2)<.1,'Square Swifty uses 52.8vh clamp and bottom-center anchor');
   assert(title.textContent==='चलिए, शुरू करते हैं!'&&ts.fontSize==='96px'&&ts.color==='rgb(205, 15, 213)'&&ts.webkitTextStrokeWidth==='10px'&&Math.abs(title.getBoundingClientRect().top-271)<.1,'Reference magenta title, outline and y271 position');
 }
 else if(['zip_story','zip_story_ready','zip_story_reading','zip_story_done'].includes(mode)){
   mount('T1');await wait(200);
   const mic=document.querySelector('.reading-mic'),line=document.querySelector('.ev-line');
   const hand=document.getElementById('nudgeHand'),micRect=mic.getBoundingClientRect(),surfaceRect=document.querySelector('.slide-stage').getBoundingClientRect(),scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale'));
   assert(hand.classList.contains('show')&&Math.abs(parseFloat(hand.style.left)-((micRect.left-surfaceRect.left)/scale+micRect.width/scale/2-48))<.2,'T1 instruction points hand at mic button');
   assert(mic.querySelectorAll('.mic-wave rect').length===5,'Reference five-bar meter inside mic');
   assert(getComputedStyle(mic).width==='64px'&&getComputedStyle(mic).height==='64px','Reference 64-pixel mic chip');
   assert(document.getElementById('navBtn').disabled,'Next waits for reading and sentence audio');
   if(mode!=='zip_story_ready'){
     const before=mic.getBoundingClientRect();mic.click();await wait(700);
     assert(!hand.classList.contains('show'),'Mic tap removes instruction hand');
     document.getAnimations().filter(a=>a.constructor.name==='CSSTransition'&&mic.contains(a.effect.target)).forEach(a=>a.finish());
     assert(mic.classList.contains('p2-rec')&&getComputedStyle(mic.querySelector('.mic')).opacity==='0'&&getComputedStyle(mic.querySelector('.mic-wave')).opacity==='1','Tap changes microphone into animated white level bars');
     const after=mic.getBoundingClientRect();
     assert(Math.abs(before.x-after.x)<.2&&Math.abs(before.y-after.y)<.2,'Mic stays in place during shape change');
     assert(document.getAnimations().filter(a=>a.animationName==='readingReferenceWave').length===5,'All five level bars animate');
     assert(line.querySelector('.ev-word.ev-word-now'),'Words highlight during reading beat');
     if(mode!=='zip_story_reading'){
       await wait(10500);assert(document.getElementById('navBtn').disabled&&mic.classList.contains('p2-rec'),'Twelve-second reading beat has not ended at 11.2 seconds');
       await wait(1200);
       assert(mic.disabled&&mic.classList.contains('p2-rec-done')&&!mic.classList.contains('p2-rec'),'Mic returns grey and stays disabled after reading');
       assert(!document.getElementById('navBtn').disabled,'Narrated sentence enables next');
       assert([...line.querySelectorAll('.ev-word')].every(word=>!word.classList.contains('ev-word-now')&&getComputedStyle(word).color==='rgb(11, 61, 140)'),'Finished sentence returns every word to navy');
       const log=window.qaAudioLog.length;mic.click();await wait(100);
       assert(window.qaAudioLog.length===log,'Finished mic cannot restart reading');
     }
   }
   if(mode==='zip_story'){
     for(const s of CARD.slides.filter(s=>s.type==='STORY_READALONG')){
       mount(s.id);await wait(180);
       const caption=document.querySelector('.story-caption'),photo=document.querySelector('.story-img'),button=document.querySelector('.reading-mic');
       const cr=caption.getBoundingClientRect(),br=button.getBoundingClientRect(),pr=photo.getBoundingClientRect(),stage=document.getElementById('stage').getBoundingClientRect(),scale=stage.width/1333;
       assert(Math.abs((cr.left-br.right)/scale-12)<.2&&Math.abs((br.top+br.height/2)-(cr.top+cr.height/2))<.2,'Reference mic anchor, 15px CSS gap including caption border: '+s.id);
       assert(cr.right<stage.right&&br.left>stage.left&&pr.height>0&&pr.bottom<=cr.top+1&&cr.height/scale<120,'Full photo and sentence fit: '+s.id+' '+JSON.stringify([caption.scrollHeight,caption.clientHeight,pr.bottom,cr.top,cr.height/scale]));
       assert(getComputedStyle(caption).fontWeight==='650'&&getComputedStyle(document.querySelector('.reading-prompt')).fontWeight==='800','Slightly heavier semi-bold sentence and bold heading: '+s.id);
       const frameStyle=getComputedStyle(document.querySelector('.story-frame')),photoStyle=getComputedStyle(photo),captionStyle=getComputedStyle(caption);
       assert(frameStyle.width==='525px'&&frameStyle.height==='295px'&&photoStyle.width==='517px'&&photoStyle.height==='287px'&&captionStyle.width==='520px'&&captionStyle.height==='80px','Smaller photo and caption sizes: '+s.id);
       assert(caption.scrollHeight<=caption.clientHeight,'Sentence stays inside fixed caption: '+s.id);
       assert(!photo.getAnimations().length&&photoStyle.objectFit==='cover','Photo remains still and fills reference frame: '+s.id);
       const nav=document.getElementById('navBtn').getBoundingClientRect();
       assert(Math.abs((nav.x-stage.x)/scale-581.5)<.2&&Math.abs((nav.y-stage.y)/scale-560)<.2&&getComputedStyle(document.getElementById('navBtn')).width==='170px'&&getComputedStyle(document.getElementById('navBtn')).height==='62px'&&cr.bottom<nav.top,'Original next size and position restored: '+s.id);
     }
     mount('T1B');document.querySelector('.reading-mic').click();await wait(500);mount('G1');await wait(13000);
     assert(CARD.slides[state.idx].id==='G1'&&!document.getAnimations().some(a=>a.animationName==='readingReferenceWave'),'Leaving story cancels reading timer and bars');
     mount('T1B');await wait(200);
   }
 }
 else if(mode==='reference_confetti'){
   mount('T8');await wait(200);confettiCannon();
   assert(document.querySelectorAll('.fx-confetti .p').length===80,'Reference count: 80 paper pieces');
   assert(document.querySelectorAll('.fx-confetti .w .f').length===80&&!document.querySelector('.conf-shot'),'Reference nested paper faces replace old effect');
   const allowed=['#8B2FC9','#3F51B5','#1E88E5','#22B24C','#FFD21E','#FF8A1E','#E5322D'];
   assert([...document.querySelectorAll('.fx-confetti .p')].every(p=>allowed.includes(p.style.getPropertyValue('--c'))),'Exact reference palette');
   assert(window.qaAudioLog.some(src=>src?.includes('reference_sfx_burst.wav')),'Reference burst sound plays');
   await wait(300);
   assert(document.getAnimations().some(a=>a.animationName==='cfRock')&&document.getAnimations().some(a=>a.animationName==='cfGlide'),'Reference flutter and sway animations');
   completeSlide(true);await wait(200);
   assert(CARD.slides[state.idx].id==='T8','Screen waits while reference paper falls');
   await wait(3000);
   assert(CARD.slides[state.idx].id==='T9'&&!document.querySelector('.fx-confetti'),'Advance after paper finishes');
   confettiCannon();mount('T1');
   assert(!document.querySelector('.fx-confetti'),'Direct page change clears old confetti');
 }
 else if(['puzzle_cards','puzzle_game','puzzle_assembly','puzzle_complete'].includes(mode)){
   mount('PUZZLE_INTRO');await wait(200);
   const tiles=[...document.querySelectorAll('.qp-tile')];
   const originalSurface=document.querySelector('.qp-surface').getBoundingClientRect();
   const surfaceStyle=getComputedStyle(document.querySelector('.qp-surface'));
   assert(Math.abs((parseFloat(surfaceStyle.width)-8)/(parseFloat(surfaceStyle.height)-8)-1671/941)<.002,'Puzzle board preserves source image proportions');
   assert(new Set(tiles.map(t=>t.querySelector('svg').getAttribute('viewBox'))).size===4&&new Set(tiles.map(t=>t.querySelector('image').getAttribute('href'))).size===1,'Four distinct cuts from one complete image');
   assert(tiles.length===4&&tiles.every(t=>t.textContent==='?'),'Four white question-mark cards');
   assert(document.getElementById('nudgeHand').classList.contains('show'),'Puzzle introduction shows one hand cue');
   assert(document.getElementById('navBtn').style.display==='none','No next button bypasses questions');
   if(mode!=='puzzle_cards'){
     for(const i of [2,0,3,1]){
       tiles[i].click();await wait(200);
       assert(!document.getElementById('nudgeHand').classList.contains('show'),'Opening question removes puzzle introduction hand: '+i);
       assert(CARD.slides[state.idx].id==='PUZZLE_INTRO'&&!document.querySelector('.qp-question').hidden,'Question opens on same screen: '+i);
       assert(!tiles[i].classList.contains('unlocked'),'Question card stays covered before answer: '+i);
       if(i===2){
         for(let n=0;n<3;n++){document.querySelector('.ev-opt:not([data-ok="1"])').click();await wait(1400);}
         assert(document.querySelector('.reveal-hold')&&!tiles[i].classList.contains('unlocked'),'Terminal hint waits for correct tap before unlock');
       }
       document.querySelector('.ev-opt[data-ok="1"]').click();await wait(900);
       assert(tiles[i].classList.contains('unlocked')&&!tiles[i].textContent,'Answer reveals only the tapped picture card: '+i);
       assert(+tiles[i].style.order!==i,'Revealed piece is not already in its correct position: '+i);
       assert(!document.querySelector('.qp-slot.filled'),'Answer does not assemble puzzle automatically: '+i);
     }
     assert(document.querySelector('.question-puzzle.assembling')&&!document.querySelector('.qp-board').hidden,'All four answers unlock assembly');
     const assemblingSurface=document.querySelector('.qp-surface').getBoundingClientRect();
     assert(Math.abs(originalSurface.x-assemblingSurface.x)<.2&&Math.abs(originalSurface.y-assemblingSurface.y)<.2&&Math.abs(originalSurface.width-assemblingSurface.width)<.2&&Math.abs(originalSurface.height-assemblingSurface.height)<.2,'Reveals and draggable pieces stay on the same unchanged board');
     assert(!SwiftPAL.firedSet.has('puzzle_completed'),'Completion waits for learner to move pieces');
     if(mode==='puzzle_complete'){
       completeSlide=()=>{};
       const zones=[...document.querySelectorAll('.qp-slot')];
       for(const i of [0,2,1,3]){tiles[i].click();zones[i].click();}
       assert(document.querySelector('.question-puzzle.complete')&&zones.every(z=>z.querySelector('image').style.opacity==='1'),'All original image pieces complete in same board');
     }
     if(mode==='puzzle_game'){
       const zones=[...document.querySelectorAll('.qp-slot')];
       const drag=(i,slot,outside=false,cancel=false)=>{
         const tile=tiles[i],start=tile.getBoundingClientRect(),end=zones[slot].getBoundingClientRect();
         tile.setPointerCapture=()=>{};tile.hasPointerCapture=()=>false;
         const common={pointerId:7,pointerType:'touch',bubbles:true};
         tile.dispatchEvent(new PointerEvent('pointerdown',{...common,clientX:start.x+40,clientY:start.y+40}));
         tile.dispatchEvent(new PointerEvent('pointermove',{...common,clientX:end.x+40,clientY:end.y+40}));
         tile.dispatchEvent(new PointerEvent(cancel?'pointercancel':'pointerup',{...common,clientX:outside?0:end.x+40,clientY:outside?0:end.y+40}));
       };
       drag(0,1);await wait(800);
       assert(!document.querySelector('.qp-slot.filled')&&!tiles[0].hidden,'Wrong drop leaves card available and board empty');
       drag(0,0,true);assert(!tiles[0].style.transform&&!tiles[0].hidden,'Outside drop returns piece to tray');
       drag(0,0,false,true);assert(!tiles[0].classList.contains('dragging'),'Cancelled touch releases dragging');
       drag(0,0);drag(2,2);
       assert(document.querySelectorAll('.qp-slot.filled').length===2,'Touch pointer drops place matching pieces');
       tiles[1].click();zones[1].click();
       assert(document.querySelectorAll('.qp-slot.filled').length===4&&document.querySelector('.question-puzzle.complete'),'Three correct moves complete the last piece without an extra tap');
       assert(SwiftPAL.firedSet.has('puzzle_completed'),'Assembly emits completion');
       await wait(3500);
       assert(CARD.slides[state.idx].id==='CEL','Celebration follows actual assembly');
       mount('PUZZLE_INTRO');await wait(200);tiles[0].click();
       assert(document.querySelectorAll('.qp-tile.unlocked').length===0,'Re-entering puzzle starts clean');
       document.querySelector('.qp-tile').click();await wait(200);
       document.querySelector('.ev-opt[data-ok="1"]').click();mount('T1B');await wait(2000);
       assert(CARD.slides[state.idx].id==='T1B'&&!document.querySelector('.qp-question'),'Leaving during answer cancels pending unlock');
     }
   }
 }
 else if(mode==='guided_layout'){
   for(const id of ['T8','T9','G1']){
     mount(id);await wait(250);
     const photo=document.querySelector('.ev-passage'),image=document.querySelector('.ev-img');
     const options=[...document.querySelectorAll('.ev-opt')];
     assert(!document.querySelector('.ev-text,.ev-qtype'),'No story text or question-type label: '+id);
     const picRect=photo.getBoundingClientRect(),rects=options.map(o=>o.getBoundingClientRect());
     assert(rects.every(r=>r.top>picRect.bottom)&&rects.every(r=>Math.abs(r.top-rects[0].top)<1),'Image above horizontal options: '+id);
     const stage=document.getElementById('stage').getBoundingClientRect();
     const scale=stage.width/1333, cells=[...document.querySelectorAll('.opt-cell')];
     assert(Math.abs((picRect.x-stage.x)/scale-411.5)<.2&&Math.abs((picRect.y-stage.y)/scale-160)<.2&&getComputedStyle(photo).width==='510px'&&getComputedStyle(photo).height==='286.875px','Larger landscape picture card at y160: '+id);
     assert(cells.every(c=>getComputedStyle(c).width==='228px'&&getComputedStyle(c).height==='96px'&&Math.abs((c.getBoundingClientRect().y-stage.y)/scale-531)<.2),'Reference option size and y531 row: '+id);
     const mascot=getComputedStyle(document.getElementById('stage').querySelector('.sw-buddy'));
     assert(mascot.left==='20px'&&mascot.top==='20px'&&mascot.width==='110px','Reference Swifty placement: '+id);
     assert(rects.every(r=>r.left>=stage.left&&r.right<=stage.right&&r.bottom<=stage.bottom),'Options fit within screen: '+id);
     assert(image.complete&&image.naturalWidth>0,'Question picture loads: '+id);
     assert(options.filter(o=>o.querySelector('.ev-opt-img')).length===CARD.slides[state.idx].data.options.filter(o=>o.img).length,'Authored option pictures retained: '+id);
   }
 }
 else if(mode==='celebration'){
   mount('CEL');
   const mascot=document.querySelector('.end-mascot');
   assert(document.body.classList.contains('is-end'),'Celebration opens immersive background');
   assert(getComputedStyle(document.querySelector('.end-bg')).backgroundImage.includes('end_screen.webp'),'Reference sunburst background');
   assert(getComputedStyle(document.querySelector('.stage-inner')).visibility==='hidden','Lesson frame hidden during celebration');
   assert(!document.getElementById('endTitle').textContent,'No sentence on celebration');
   assert(document.getElementById('endBtn').classList.contains('show'),'Finish button visible immediately');
   assert(parseFloat(getComputedStyle(mascot).width)===330,'Reference mascot size');
   assert(mascot.src.includes('last_swifty_happy'),'Happy mascot during jingle');
   assert(document.querySelector('#confetti canvas.fx'),'Reference gold star burst starts');
   await wait(200);
   assert(mascot.src.includes('last_swifty_shabaash'),'Swifty jumps on praise');
   await wait(1500);
   assert(mascot.src.includes('last_swifty_talk'),'Swifty talks after shabaash');
   await wait(1900);
   assert(mascot.src.includes('last_swifty_happy'),'Happy pose after praise ends');
   assert(window.qaAudioLog.filter(s=>s?.includes('vo_review_celebrate')).length===1,'Praise speaks exactly once');
   assert(window.qaAudioLog.findIndex(s=>s?.includes('sfx_celebrate.wav'))<window.qaAudioLog.findIndex(s=>s?.includes('vo_review_celebrate')),'Reference jingle before praise');
   for(const name of ['happy','shabaash','talk']){
     const im=new Image();im.src='assets/Images/last_swifty_'+name+'.webp';document.getElementById('confetti').appendChild(im);await wait(300);assert(im.complete&&im.naturalWidth>0,'Reference animation loads: '+name);im.remove();
   }
   mount('CEL');await wait(200);mount('T1B');await wait(1800);
   assert(!document.body.classList.contains('is-end')&&!document.getElementById('endScreen').classList.contains('show'),'Leaving finale restores lesson');
   assert(!document.querySelector('#confetti canvas'),'Burst removed on page jump');
   assert(!mascot.src.includes('last_swifty_talk'),'Old mascot timer cancelled on page jump');
   mount('CEL');await wait(3700);
 }
 else if(mode==='static_images'){
   for(const id of ['T1','T1B','G0','G1']){
     mount(id);await wait(200);
     const image=document.querySelector('.story-img,.tis-img,.ev-img');
     const rect=image.getBoundingClientRect();
     const ancestors=[];for(let el=image;el&&el.id!=='stage';el=el.parentElement)ancestors.push(el);
     assert(!document.getAnimations().some(a=>ancestors.includes(a.effect.target)),'Image and its containers have no movement animation: '+id);
     assert(!document.getElementById('slideHost').classList.contains('slide-in'),'No picture entrance movement: '+id);
     await wait(1500);
     const next=image.getBoundingClientRect();
     assert(Math.abs(rect.x-next.x)<.2&&Math.abs(rect.y-next.y)<.2&&Math.abs(rect.width-next.width)<.2&&Math.abs(rect.height-next.height)<.2,'Image stays fixed over time: '+id);
   }
   mount('T1B');await wait(200);
 }
 else if(mode==='new_assets'){
   const expected=['Cheerful Boy in the Vegetable Garden.png','Joyful Eggplant Harvest in the Garden.png','A Joyful Garden Basket Gift.png','Curious Garden Search with Puppy.png','Dadi Explains Beside the Eggplant.png','Boy and Dog on the Country Path.png','Potato Pals in the Garden.png','Boy and Puppy Harvest Potatoes.png'];
   assert(expected.every(name=>Object.values(CARD.assets.image).includes('assets/Images/'+name)),'All eight added assets mapped');
   for(const slide of CARD.slides.filter(s=>s.type==='STORY_READALONG')){
     mount(slide.id);await wait(250);
     const image=document.querySelector('.ev-img');
     assert(image.complete&&image.naturalWidth>0&&decodeURIComponent(image.src).endsWith(imageAsset(slide.data.passage.image_id)),'New story image loads: '+slide.id);
   }
   mount('G1');await wait(250);
   assert(decodeURIComponent(document.querySelector('.ev-img').src).includes('Joyful Eggplant Harvest'),'Harvest question uses new harvesting picture');
   mount('P_BASKET');await wait(250);
   assert(decodeURIComponent(document.querySelector('.ev-img').src).includes('Dadi Explains'),'Basket question uses new Dadi scene');
   assert([...document.querySelectorAll('.puzzle-art')].every(p=>p.getAttribute('href').includes('Boy and Puppy Harvest Potatoes')),'Puzzle uses new potato harvest picture');
   mount('G0');await wait(250);
   const hotspots=[...document.querySelectorAll('.tis-hot')];
   assert(hotspots[0].style.left==='32%'&&hotspots[1].style.left==='18%','Identify boxes repositioned for new dog and boy');
 }
 else if(mode==='dev_menu'){
   const bar=document.getElementById('devNav');
   assert(bar&&!bar.hidden,'Dev mode shows bottom navigation menu');
   const select=bar.querySelector('select');
   assert(select.options.length===CARD.slides.length+1,'Menu includes landing and every page');
   assert(select.options[0].textContent==='T1 Title Page','Title page has code and screen name');
   const storyNames=[...select.options].filter(o=>/^T\d+ Story \d+$/.test(o.textContent));
   assert(storyNames.length===10&&storyNames.every((o,i)=>o.textContent==='T'+(i+2)+' Story '+(i+1)),'Stories have sequential codes and names');
   assert(['G1','Q1','P1','C1'].every(code=>[...select.options].some(o=>o.textContent.startsWith(code+' '))),'Every screen code is followed by its name');
   const jump=id=>{select.value=String(CARD.slides.findIndex(s=>s.id===id));select.dispatchEvent(new Event('change'));};
   jump('T1');await wait(200);
   assert(CARD.slides[state.idx].id==='T1'&&!document.querySelector('.reading-mic').disabled,'First story instruction finishes before mic enables');
   jump('T1B');
   assert(!isPlaying&&!document.querySelector('.reading-mic').disabled,'Later story pages do not repeat reading instruction');
   const stories=CARD.slides.filter(s=>s.type==='STORY_READALONG');
   assert(stories[0].audio.prompt==='vo_review_reading_instruction'&&stories.slice(1).every(s=>!s.audio.prompt),'Reading instruction authored only on first page');
   jump('PT2');await wait(100);jump('PUZZLE_INTRO');await wait(2600);
   assert(CARD.slides[state.idx].id==='PUZZLE_INTRO','Jumping out of gate cancels old gate navigation');
   jump('CEL');await wait(200);jump('T2');
   assert(!document.getElementById('endScreen').classList.contains('show'),'Jumping out of end screen clears overlay');
   bar.querySelector('[aria-label="Landing"]').click();
   assert(document.body.classList.contains('is-start')&&!document.getElementById('startGate').classList.contains('hidden'),'Home button restores landing');
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}));
   assert(bar.hidden,'F2 hides menu');
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}));
   assert(!bar.hidden,'F2 reopens menu');
   jump('T8');await wait(200);
 }
 else if(mode==='review_flow'){
   mount('PT1');await wait(2500);
   let pages=0;
   while(CARD.slides[state.idx].type==='STORY_READALONG'&&pages<12){
     await wait(150);state.replayAudio();await wait(150);
     assert(!document.getElementById('navBtn').disabled,'Story audio enables next: '+CARD.slides[state.idx].id);
     document.getElementById('navBtn').click();pages++;await wait(150);
   }
   assert(pages===10,'Whole story progresses through ten screens');
   await wait(2500);
   assert(CARD.slides[state.idx].id==='G0','Story goes directly to guided identify question');
   document.querySelector('.tis-hot.correct-hot').click();await wait(3500);
   for(const id of ['T8','T9','G1']){
     assert(CARD.slides[state.idx].id===id,'Guided order: '+id);
     document.querySelector('.ev-opt[data-ok="1"]').click();await wait(3500);
   }
   await wait(2500);
   assert(CARD.slides[state.idx].id==='PUZZLE_INTRO','Practice gate opens puzzle instruction');
   const puzzleTiles=[...document.querySelectorAll('.qp-tile')];
   for(let i=0;i<4;i++){
     puzzleTiles[i].click();await wait(200);
     document.querySelector('.ev-opt[data-ok="1"]').click();await wait(900);
     assert(CARD.slides[state.idx].id==='PUZZLE_INTRO'&&puzzleTiles[i].classList.contains('unlocked'),'Practice answer unlocks card on same screen: '+i);
   }
   for(let i=0;i<4;i++){puzzleTiles[i].click();document.querySelectorAll('.qp-slot')[i].click();}
   await wait(3500);
   assert(CARD.slides[state.idx].id==='CEL'&&document.getElementById('endScreen').classList.contains('show'),'All questions reach revised celebration');
   assert(SwiftPAL.validatorReport.passed,'Whole lesson emits all required signals');
 }
 else if(mode==='review_mic'){
   let tracksStopped=0,contextsClosed=0;
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>tracksStopped++}]})}});
   window.AudioContext=class{
     resume(){return Promise.resolve();}close(){contextsClosed++;return Promise.resolve();}
     createMediaStreamSource(){return{connect(){}};}
     createAnalyser(){return{fftSize:256,getByteTimeDomainData(a){a.fill(141);}};}
   };
   mount('T1');await wait(200);document.querySelector('.reading-mic').click();await wait(200);
   assert(document.querySelector('.reading-mic.speaking'),'Detected speech activates mic waves');
   await wait(10000);
   assert(tracksStopped===1&&contextsClosed===1&&!document.querySelector('.reading-mic.speaking'),'Recording resources stop before narrated sentence');
   assert(!document.getElementById('navBtn').disabled,'Narration after recording enables next');
   document.querySelector('.reading-mic').click();await wait(200);
   mount('T2');await wait(200);
   assert(tracksStopped===2&&contextsClosed===2,'Changing slides releases microphone immediately');
 }
 else if(mode==='review_story'){
   const stories=CARD.slides.filter(s=>s.type==='STORY_READALONG');
   assert(stories.length===10,'Ten revised story screens');
   const splitIndex=stories.findIndex(s=>s.id==='T6');
   assert(stories[splitIndex].data.passage.lines[0].text.endsWith('“भौं, भौं, भौं।”')&&stories[splitIndex+1].id==='T6B'&&stories[splitIndex+1].data.passage.lines[0].text.startsWith('कालू ने मिट्टी'),'T6 splits after the barking into the next story screen');
   mount('T1');await wait(200);
   assert(!document.querySelector('.reading-heading'),'Story has no heading above image');
   const blueBox=getComputedStyle(document.querySelector('.stage-inner'));
   assert(blueBox.left==='100px'&&blueBox.right==='100px'&&blueBox.top==='96px'&&blueBox.bottom==='92px','Original blue box size and position restored');
   assert(document.getElementById('navBtn').disabled,'Next waits for reading');
   const mic=document.querySelector('.reading-mic');mic.click();await wait(9000);
   assert(mic.classList.contains('listening')&&document.getElementById('navBtn').disabled,'Ten second reading opportunity before narration');
   assert(document.querySelector('.ev-word-now'),'Words highlight one by one');
   await wait(1400);
   assert(!document.getElementById('navBtn').disabled&&!mic.classList.contains('listening'),'Next unlocks after narration');
   document.getElementById('navBtn').click();await wait(200);
   assert(CARD.slides[state.idx].id==='T1B','Second sentence is the next story screen');
   for(const slide of stories){
     mount(slide.id);await wait(200);await document.fonts.ready;
     const text=document.querySelector('.ev-text').getBoundingClientRect();
     const nav=document.getElementById('navBtn').getBoundingClientRect();
     const picture=document.querySelector('.ev-pic').getBoundingClientRect();
     const image=document.querySelector('.ev-img').getBoundingClientRect();
     const stage=document.getElementById('stage').getBoundingClientRect();
     const scale=stage.width/1333;
     const dimensions=element=>({x:(element.left-stage.left)/scale,y:(element.top-stage.top)/scale,width:element.width/scale,height:element.height/scale});
     const matches=(rect,expected)=>Object.entries(expected).every(([key,value])=>Math.abs(dimensions(rect)[key]-value)<.2);
     assert(matches(picture,{x:383,y:114,width:567,height:324}),'Exact specified frame measurements: '+slide.id);
     assert(matches(image,{x:387,y:118,width:559,height:316}),'Exact specified image measurements: '+slide.id);
     assert(matches(text,{x:397,y:444,width:539,height:110}),'Exact specified caption measurements: '+slide.id);
     assert(matches(nav,{x:567,y:564,width:198,height:90}),'Exact specified next button measurements: '+slide.id);
     assert(text.width<=picture.width&&text.width>=picture.width*.94,'Text box matches reference width within image edges: '+slide.id);
     assert(Math.abs(image.width-(picture.width-8*scale))<2,'Image fills photo frame with specified four-pixel inset: '+slide.id);
     const line=document.querySelector('.story-caption .ev-line').getBoundingClientRect();
     assert(line.top>=text.top+2*scale&&line.bottom<=text.bottom-2*scale,'Full story text fits caption: '+slide.id);
     assert(text.bottom<nav.top&&picture.bottom<=text.top,'Story text and controls fit: '+slide.id);
     if(text.bottom>=nav.top)assert(false,'Spacing '+slide.id+': '+JSON.stringify({textHeight:text.height,textBottom:text.bottom,navTop:nav.top,pictureHeight:picture.height}));
     assert(!document.querySelector('.ev-read-footer'),'No credits or page numbers: '+slide.id);
   }
   mount('T6');await wait(200);
 }
 else if(mode==='review_guided'){
   mount('G0');await wait(200);
   const slide=CARD.slides[state.idx];
   const boxes=[...document.querySelectorAll('.tis-hot')];
   assert(boxes.length===2&&boxes.every(b=>getComputedStyle(b).borderTopWidth==='4px'),'Malu and Kaalu have white target boxes');
   assert(!document.querySelector('.ev-text'),'Identify picture has no passage text');
   for(let i=0;i<3;i++){boxes[0].click();await wait(1000);}
   assert(state.attempts===3&&boxes[1].classList.contains('reveal-hold')&&boxes[0].classList.contains('faded'),'Identify terminal hint highlights Malu and disables Kaalu');
   boxes[1].style.transition='none';boxes[1].click();await wait(100);
   assert(getComputedStyle(boxes[1]).borderColor==='rgb(0, 177, 50)','Correct Malu box has green outline');
   await wait(1100);assert(CARD.slides[state.idx].id==='T8','Identify question followed by Dadi question');
   const ids=CARD.slides.filter(s=>s.phase==='guided'&&s.type!=='PHASE_TRANSITION').map(s=>s.id);
   assert(ids.join('|')==='G0|T8|T9|G1','Guided questions follow PDF order');
   mount('G1');await wait(200);
   assert([...document.querySelectorAll('.ev-opt')].map(o=>o.textContent.trim()).join('|')==='टमाटर|आलू|गाजर','Vegetable options follow Recommendations');
   mount('G0');await wait(200);
 }
 else if(mode==='review_puzzle'){
   mount('PUZZLE_INTRO');await wait(200);
   assert(document.querySelectorAll('.puzzle-piece').length===4&&!document.querySelector('.puzzle-piece.placed'),'Puzzle starts with four empty interlocking pieces');
   document.getElementById('navBtn').click();await wait(200);
   assert(CARD.slides[state.idx].id==='P_SOIL','First practice question is soil');
   assert([...document.querySelectorAll('.ev-opt')].map(o=>o.textContent.trim()).join('|')==='पेड़ पर|मिट्टी के अंदर|पानी के अंदर','Water replaces third soil option');
   let options=[...document.querySelectorAll('.ev-opt')];
   for(let i=0;i<3;i++){options[0].click();await wait(1000);}
   assert(!document.querySelector('.puzzle-piece.placed'),'Hints do not place pieces automatically');
   options[1].click();await wait(300);
   assert(document.querySelectorAll('.puzzle-piece.placed').length===1,'Learner answer places first piece');
   await wait(2000);
   assert(CARD.slides[state.idx].id==='P2','Second practice question is feelings');
   assert([...document.querySelectorAll('.ev-opt')].map(o=>o.textContent.trim()).join('|')==='उदास|डरा हुआ|खुश','Feelings options follow Recommendations');
   document.querySelector('.ev-opt[data-ok="1"]').click();await wait(2300);
   assert(CARD.slides[state.idx].id==='P_BASKET'&&document.querySelectorAll('.puzzle-piece.placed').length===2,'Puzzle progress persists to basket question');
   assert(decodeURIComponent(document.querySelector('.practice-puzzle-card .ev-img').src).endsWith(imageAsset('scene_empty_basket')),'Updated empty basket scene appears on its question');
   assert(document.getElementById('promptText').textContent==='मालू ने दादी के आगे खाली टोकरी क्यों रख दी थी?','Revised empty basket question');
   document.querySelector('.ev-opt[data-ok="1"]').click();await wait(2300);
   assert(CARD.slides[state.idx].id==='P4'&&document.querySelectorAll('.puzzle-piece.placed').length===3,'Three answers place three pieces');
   document.querySelector('.ev-opt[data-ok="1"]').click();await wait(300);
   assert(document.querySelectorAll('.puzzle-piece.placed').length===4&&document.querySelector('.picture-puzzle.complete'),'Last answer completes entire picture');
   assert(SwiftPAL.firedSet.has('puzzle_completed'),'Puzzle completion signal emitted');
   completeSlide=()=>{};
 }
 else if(mode==='review_assets'){
   await Promise.all(Object.keys(CARD.assets.audio).filter(id=>id.startsWith('vo_review_')).map(id=>new Promise(resolve=>{
     const sound=new NativeAudio();sound.preload='metadata';
     sound.onloadedmetadata=()=>{assert(sound.duration>0,'Revised voice decodes: '+id);resolve();};
     sound.onerror=()=>{assert(false,'Revised voice decodes: '+id);resolve();};
     sound.src=audioAsset(id);
   })));
   for(const id of ['scene_empty_basket','opt_water']){
     await new Promise(resolve=>{const img=new Image();img.onload=()=>{assert(img.naturalWidth>0,'Revised illustration loads: '+id);resolve();};img.onerror=()=>{assert(false,'Revised illustration loads: '+id);resolve();};img.src=imageAsset(id);});
   }
   mount('P_BASKET');await wait(200);
 }
 else if(mode==='correct_outline'){
   for(const id of ['T8','T9','P_BASKET']){
     mount(id);await wait(200);
     const options=[...document.querySelectorAll('.ev-opt')];
     const correct=options.find(o=>o.dataset.ok==='1');
     correct.style.transition='none';
     const original=getComputedStyle(correct).backgroundColor;
     correct.click();await wait(300);
     assert(correct.classList.contains('correct'),'Correct answer accepted: '+id);
     assert(getComputedStyle(correct).borderColor==='rgb(0, 177, 50)','Green outline: '+id+' '+getComputedStyle(correct).borderColor);
     assert(getComputedStyle(correct).backgroundColor===original,'Card fill stays unchanged: '+id);
     const badge=getComputedStyle(correct,'::after');
     assert(badge.content==='none'&&badge.display==='none','No tick badge: '+id);
     stopAudio();
     await wait(700);
   }
 }
 else if(mode==='kaalu'){
   mount('T9');
   const slide=CARD.slides[state.idx];
   const options=[...document.querySelectorAll('.ev-opt')];
   options[0].click();
   assert(!options[0].classList.contains('correct'),'Question narration blocks early answers');
   await wait(200);
   assert(slide.phase==='guided'&&CARD.slides[state.idx-1].id==='T8','Kaalu question immediately follows Dadi question');
   assert(document.getElementById('promptText').textContent==='कालू कौन है?','Exact Kaalu question header');
   assert(options.map(o=>o.textContent.trim()).join('|')==='कुत्ता|गाय|बिल्ली','Three options in reference order');
   assert(options.every(o=>o.querySelector('img')),'All options have animal pictures');
   assert(slide.data.options[0].correct===true,'Dog is the correct answer');
   assert(document.querySelector('.ev-qtype.inference'),'Inference question badge');
   assert(audioFor(slide,'prompt').endsWith('vo_kaalu_question.mp3'),'Speaker narrates question and all options');
   await Promise.all(Object.keys(CARD.assets.audio).filter(id=>id.startsWith('vo_kaalu_')).map(id=>new Promise(resolve=>{
     const sound=new NativeAudio();sound.preload='metadata';
     sound.onloadedmetadata=()=>{assert(sound.duration>0,'Voice clip decodes: '+id);resolve();};
     sound.onerror=()=>{assert(false,'Voice clip decodes: '+id);resolve();};
     sound.src=audioAsset(id);
   })));
   for(let i=0;i<3;i++){options[1].click();await wait(1000);}
   assert(state.attempts===3,'All three hints reachable');
   assert(CARD.slides[state.idx]===slide&&options[0].classList.contains('reveal-hold'),'Third hint points to dog and waits for tap');
   options[0].click();await wait(1800);
   assert(CARD.slides[state.idx].id==='G1','Dog tap completes question');
   mount('T9');await wait(200);
 }
 else if(mode==='question'){
   mount('T8');await wait(200);
   const slide=CARD.slides[state.idx];
   assert(slide.phase==='guided'&&CARD.slides[state.idx-1].id==='PT2','Question is first guided practice');
   assert(document.getElementById('promptText').textContent.includes('मालू से आलू लाने को किसने कहा?'),'Exact question header');
   const options=[...document.querySelectorAll('.ev-opt')];
   assert(options.map(o=>o.textContent.trim()).join('|')==='कालू ने|दादी ने|माँ ने','Three text options in specified order');
   assert(!document.querySelector('.ev-opt img')&&!document.querySelector('.picture-only .ev-text'),'Picture only on left and no option images');
   assert(slide.data.options[1].correct===true,'Dadi is the correct answer');
   assert(audioFor(slide,'prompt').endsWith('vo_dadi_question.mp3'),'Speaker uses new question and options narration');
   await Promise.all(Object.keys(CARD.assets.audio).filter(id=>id.startsWith('vo_dadi_')).map(id=>new Promise(resolve=>{
     const sound=new NativeAudio();sound.preload='metadata';
     sound.onloadedmetadata=()=>{assert(sound.duration>0,'Voice clip decodes: '+id);resolve();};
     sound.onerror=()=>{assert(false,'Voice clip decodes: '+id);resolve();};
     sound.src=audioAsset(id);
   })));
   for(let i=0;i<3;i++){options[0].click();await wait(1000);}
   assert(CARD.slides[state.idx]===slide&&options[1].classList.contains('reveal-hold'),'Third hint points to Dadi and waits for learner tap');
   assert(state.attempts===3,'All three hint stages reachable');
   options[1].click();await wait(1800);
   assert(CARD.slides[state.idx].id==='T9','Correct answer tap continues to Kaalu question');
   mount('T8');await wait(200);
 }
 else if(mode==='story_checks'){
   mount('T1');await wait(220);
   let count=0, geometry=true, sameFont=true, locked=true;
   while(CARD.slides[state.idx].type==='STORY_READALONG'&&count<25){
     const text=document.querySelector('.story-read-layout .ev-text');
     const visible=[...text.querySelectorAll('.ev-line')].filter(l=>!l.hidden);
     const rect=text.getBoundingClientRect();
     const button=document.getElementById('navBtn').getBoundingClientRect();
     const image=document.querySelector('.story-read-layout .ev-pic').getBoundingClientRect();
     const fits=visible.length===1&&text.scrollHeight<=text.clientHeight+1&&rect.bottom<button.top&&image.bottom<=rect.top;
     if(!fits)results.push({name:'Spacing details '+count+' '+JSON.stringify({textBottom:rect.bottom,buttonTop:button.top,imageBottom:image.bottom,textTop:rect.top,scroll:text.scrollHeight,client:text.clientHeight}),ok:false});
     geometry=geometry&&fits;
     sameFont=sameFont&&getComputedStyle(text).fontSize==='26px';
     const prior=visible[0].textContent;
     document.getElementById('navBtn').click();
     if(CARD.slides[state.idx].type==='STORY_READALONG'){
       const next=document.querySelector('.ev-line:not([hidden])').textContent;
       document.getElementById('navBtn').click();
       locked=locked&&document.querySelector('.ev-line:not([hidden])').textContent===next;
     }
     count++;await wait(220);
   }
   assert(count===16,'All 16 story sentences reachable');
   assert(geometry,'Every story sentence fits between image and next button');
   assert(sameFont,'All story sentences use reference 26px font');
   assert(locked,'Next sentence waits until narration ends');
   mount('T6');await wait(220);
 }
 else if(mode==='story'){
   mount('T6');await wait(1600);
   const swifty=getComputedStyle(document.getElementById('swBuddy'));
   const speaker=getComputedStyle(document.getElementById('audioChip'));
   assert(document.getElementById('swBuddyImg').getAttribute('src')==='assets/UI/story_mascot.webp','Story uses exact reference standing Swifty asset');
   assert(swifty.width==='208px'&&swifty.height==='208px'&&swifty.left==='-34px'&&swifty.bottom==='-14px','Story Swifty has reference size and position');
   assert(speaker.left==='92px'&&speaker.bottom==='-16px'&&speaker.width==='58px','Story speaker has reference position');
 }
 else if(mode==='sort'){mount('G6');await wait(200);}
 else if(mode==='scene'){mount('G5');await wait(200);}
 else if(mode==='recap'){mount('T10');await wait(800);}
 else if(mode==='landing'){
   await wait(200);
   assert(document.querySelectorAll('.sg-sky i').length===87,'Reference sky has 87 moving decorations');
   const flights=document.getAnimations().filter(a=>a.animationName==='sgFly');
   assert(flights.length===87&&flights.every(a=>a.playState==='running'),'Landing background animations are running');
   assert(getComputedStyle(document.querySelector('.start-bg')).backgroundImage.includes('startnew_bg_plain.webp'),'Reference plain background plate loaded');
   const center=getComputedStyle(document.querySelector('.sg-card'));
   const panel=getComputedStyle(document.querySelector('.sg-card'),'::before');
   assert(panel.backgroundImage.includes('TITLE%20PAGE.png'),'Landing uses supplied title artwork');
   assert(center.borderRadius==='43px'&&center.borderTopWidth==='9px'&&panel.borderRadius==='32.5px','Reference outer and inner corners and white border');
   assert(getComputedStyle(document.querySelector('.sg-content')).display==='none','Old title and subtitle hidden');
   assert(document.getElementById('sgBtn').offsetWidth>0&&document.getElementById('sgVo').offsetWidth>0,'Play and speaker controls remain visible');
   const standing=getComputedStyle(document.querySelector('.sg-mascot'));
   const speaker=getComputedStyle(document.querySelector('.sg-vo'));
   assert(standing.width==='208px'&&standing.height==='204px','Reference Swifty size');
   assert(speaker.width==='58px'&&speaker.height==='58px','Reference speaker size');
   document.getAnimations().filter(a=>a.effect.target===document.getElementById('sgBtn')).forEach(a=>a.cancel());
   const stageRect=document.getElementById('stage').getBoundingClientRect(),scale=stageRect.width/1333;
   for(const [selector,x,y,w,h] of [['.sg-card',110,147,1114,456],['.sg-btn',595,432,143,143],['.sg-mascot',85,411,208,204],['.sg-vo',199,551,58,58]]){
     const rect=document.querySelector(selector).getBoundingClientRect();
     assert(Math.abs((rect.x-stageRect.x)/scale-x)<.2&&Math.abs((rect.y-stageRect.y)/scale-y)<.2&&Math.abs(rect.width/scale-w)<.2&&Math.abs(rect.height/scale-h)<.2,'Exact reference dimensions: '+selector);
   }
   document.getAnimations().filter(a=>a.animationName==='sgSwiftyIn').forEach(a=>a.finish());
 }
 else{
 mount('G1');
 const slide=CARD.slides[state.idx];
 const wrong=document.querySelector('.opt-cell:not([data-ok="1"])');
 wrong.click();assert(state.attempts===0,'Prompt audio blocks answers');
 await wait(150);
 const band=getComputedStyle(document.querySelector('.prompt-band'));
 const mascot=getComputedStyle(document.getElementById('swBuddy'));
 const chip=getComputedStyle(document.getElementById('audioChip'));
 assert(band.top==='36px'&&band.height==='78px','Reference header geometry');
 assert(mascot.display!=='none'&&mascot.top==='16px'&&mascot.width==='118px'&&mascot.borderTopWidth==='4px','Reference Swifty position and white ring');
 assert(chip.left==='94.5px'&&chip.top==='80px'&&chip.width==='66px','Reference speaker position');
 assert(getComputedStyle(document.getElementById('hintBtn')).display==='none','Hint button matches reference');
 wrong.click();assert(state.attempts===1,'First miss recorded');
 const cs=getComputedStyle(wrong);
 assert(cs.borderColor!=='rgb(249, 53, 68)'&&!cs.boxShadow.includes('249, 53, 68'),'Wrong answer has no red');
 assert(['none','normal','""'].includes(getComputedStyle(wrong,'::after').content),'Wrong answer has no cross');
 wrong.click();assert(state.attempts===1,'Feedback audio blocks repeated answer');
 await wait(800);wrong.click();await wait(800);
 assert(!wrong.classList.contains('faded'),'Second miss still allows terminal hint');
 wrong.click();await wait(300);
 assert(state.idx===CARD.slides.indexOf(slide),'Terminal hint does not auto-advance');
 assert(document.querySelector('.reveal-hold'),'Terminal answer stays highlighted');
 document.querySelector('.reveal-hold').click();await wait(1800);
 assert(state.idx===CARD.slides.indexOf(slide)+1,'Learner tap completes terminal help');
 mount('G3');await wait(150);
 const sentenceSlide=CARD.slides[state.idx];
 const lines=[...document.querySelectorAll('.ev-line')];
 const miss=lines.find((_,i)=>i!==sentenceSlide.data.answer_line);
 for(let i=0;i<3;i++){miss.click();await wait(1900);}
 assert(CARD.slides[state.idx]===sentenceSlide&&document.querySelector('.reveal-hold'),'Find sentence hint waits for learner');
 mount('G5');await wait(150);
 assert(!document.querySelector('.tis-hot.pulse'),'Scene has no idle answer pulse');
 const sceneSlide=CARD.slides[state.idx];
 for(let i=0;i<3;i++){document.querySelector('.tis-frame').click();await wait(150);}
 assert(state.attempts===3&&document.querySelector('.tis-hot.reveal-hold'),'Scene uses graduated terminal help');
 assert(CARD.slides[state.idx]===sceneSlide,'Scene hint waits for learner');
 mount('G6');await wait(150);
 const tile=document.querySelector('.ev-sort-item');
 tile.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:500,clientY:500}));
 assert(tile.classList.contains('dragging'),'Sorting drag starts while its own name plays');
 document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:500,clientY:500}));
 await wait(150);
 const wrongBin=[...document.querySelectorAll('.ev-sort-bin')].find(b=>b.dataset.kind!==tile.dataset.kind);
 wrongBin.click();assert(state.attempts===1,'Wrong sort drop is recorded');
 assert(getComputedStyle(wrongBin).borderColor!=='rgb(249, 53, 68)','Sorting miss keeps neutral border');
 mount('G1');await wait(150);
 }
 await document.fonts.ready;
 document.getElementById('slideHost').classList.remove('slide-in');
 const broken=[...document.images].filter(im=>im.offsetWidth&&(!im.complete||!im.naturalWidth)).map(im=>im.getAttribute('src'));
 assert(!broken.length,'Visible image assets load: '+broken.join(','));
 }catch(e){results.push({name:e.stack,ok:false});}
 const report=document.createElement('pre');report.id='qa-report';report.style.display='none';report.textContent=JSON.stringify(results);document.body.appendChild(report);
})();
</script>'''
html = source.replace('<head>', '<head><base href="../">').replace('<script src="app.js"></script>', audio+'<script src="app.js"></script>')
page=root/'_qa'/'reference_check.html'
page.write_text(html.replace('</body>', checks+'</body>'),encoding='utf-8')
for mode in (sys.argv[1:] or ['checks','landing','story','story_checks','sort','scene','recap']):
    command=[chrome,'--headless=new','--disable-gpu','--allow-file-access-from-files','--no-first-run','--no-default-browser-check',
      '--user-data-dir='+str(root/'_qa'/'chrome-profile'),'--virtual-time-budget='+('60000' if mode in ['review_flow','zip_story'] else '1300' if mode in ['zip_story_reading','phase_gate'] else '20000'),'--window-size=1456,816',
      '--screenshot='+str(root/'_qa'/f'{mode}.png'),'--dump-dom',page.as_uri()+'?mode='+mode+('&dev=1' if mode=='dev_menu' else '')]
    run=subprocess.run(command,capture_output=True,encoding='utf-8',errors='replace',timeout=35)
    match=re.search(r'<pre id="qa-report"[^>]*>(.*?)</pre>',run.stdout,re.S)
    print(mode,match[1] if match else 'NO REPORT: '+run.stderr[-800:])
