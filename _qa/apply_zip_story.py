from pathlib import Path
import re, shutil
root=Path(__file__).resolve().parent.parent
reference=(root/'_qa/story_reference/HI02H04_L01_S01.html').read_text(encoding='utf-8')
svg=re.search(r"const SPK_SVG = '(.*?)';",reference)[1].replace('spChip','readingChip')
app=root/'app.js'
text=app.read_text(encoding='utf-8')
start=text.index('function mountReadingPractice(host, slide) {')
end=text.index('\nconst SlideModules =',start)
replacement='''function mountReadingPractice(host, slide) {
  const wrap = document.createElement("div");
  wrap.className = "ev-read story-read-layout read-with-mic";
  const prompt = document.createElement("div");
  prompt.className = "reading-prompt";
  prompt.textContent = "चित्र देखिए और वाक्य पढ़िए।";
  wrap.appendChild(prompt);
  const card = evPassage(slide.data.passage, {big:true});
  card.classList.remove("dense");
  card.querySelector(".ev-pic").classList.add("story-frame");
  card.querySelector(".ev-img").classList.add("story-img");
  card.querySelector(".ev-text").classList.add("story-caption");
  wrap.appendChild(card);
  host.appendChild(wrap);
  const line = card._lines[0];
  const mic = document.createElement("button");
  mic.className = "reading-mic";
  mic.type = "button";
  mic.setAttribute("aria-label", "वाक्य पढ़ने के लिए माइक्रोफ़ोन");
  mic.innerHTML = REFERENCE_SVG;
  card.querySelector(".ev-text").appendChild(mic);
  let timer, stopWords=()=>{}, closed=false, mode="ready";
  const current=()=>!closed && CARD.slides[state.idx]===slide;
  state.slideCleanup=()=>{closed=true;clearTimeout(timer);stopWords();mic.classList.remove("p2-rec");};
  const narrate=()=>{
    if(!current() || mode==="narrating")return;
    clearTimeout(timer);stopWords();
    mode="narrating";
    mic.classList.remove("p2-rec");
    mic.classList.add("p2-rec-done");
    mic.disabled=true;
    mic.setAttribute("aria-disabled", "true");
    setNavActive(false);
    play(line._src,()=>{
      if(!current())return;
      stopWords();mode="done";setNavActive(true);
    });
    stopWords=evWordKaraoke(line);
  };
  mic.onclick=()=>{
    if(!current() || mic.disabled || mode!=="ready")return;
    stopAudio();stopNudge();stopWords();
    mode="reading";
    setNavActive(false);
    mic.classList.add("p2-rec");
    // Match the reference's reading beat: a visual voice meter, without audio capture.
    stopWords=evWordKaraoke(line,12000);
    timer=setTimeout(narrate,12000);
  };
  state.ownsAudio=true;
  state.replayAudio=()=>{if(mode!=="reading")narrate();};
  $("navBtn").onclick=()=>{
    if(!$("navBtn").disabled && !isPlaying && current())completeSlide(true);
  };
  setNavActive(false);
  const instruction=audioFor(slide,"prompt");
  if(instruction)play(instruction,()=>{});
}
'''.replace('REFERENCE_SVG',repr(svg))
text=text[:start]+replacement+text[end:]
text=text.replace('? "assets/UI/story_mascot.webp"','? "assets/UI/reading_mascot.webp"')
app.write_text(text,encoding='utf-8')
for name in ['start_mascot.webp','btn-next-arrow.svg','btn-next-disabled-arrow.svg','btn-next-pill.svg','btn-next-disabled-pill.svg']:
    target='reading_mascot.webp' if name=='start_mascot.webp' else 'reading-'+name
    shutil.copyfile(root/'_qa/story_reference/assets/UI'/name,root/'assets/UI'/target)
path=root/'index.html'
path.write_text(path.read_text(encoding='utf-8').replace('20261006-question-puzzle','20261006-zip-story'),encoding='utf-8')
