from pathlib import Path
root = Path(__file__).resolve().parent.parent
app = root / 'app.js'
text = app.read_text(encoding='utf-8')
start = text.index('      // celebration SFX', text.index('  CELEBRATION:'))
end = text.index('      const masteryScore', start)
text = text[:start] + '''      state.ownsAudio = true;
      const es = $("endScreen");
      $("endTitle").textContent = "";
      es.classList.add("show", "hint-glow");
      document.body.classList.add("is-end");
      $("confetti").textContent = "";
      const stopBurst = celebrationStarBurst($("confetti"));
      const mascot = es.querySelector(".end-mascot");
      let active = true, spoke = false, talkTimer, backTimer, capTimer;
      let jingle = null;
      const sw = name => {
        if (!active || !mascot) return;
        mascot.removeAttribute("src");
        void mascot.offsetWidth;
        window.__endSwN = (window.__endSwN || 0) + 1;
        mascot.src = "assets/Images/last_swifty_" + name + ".webp?n=" + window.__endSwN;
      };
      const lineDone = () => {
        clearTimeout(talkTimer); clearTimeout(backTimer);
        sw("happy");
      };
      const speak = () => {
        if (!active || spoke) return;
        spoke = true;
        clearTimeout(capTimer);
        if (jingle) jingle.pause();
        sw("shabaash");
        talkTimer = setTimeout(() => sw("talk"), 1450);
        backTimer = setTimeout(lineDone, 6000);
        play(audioFor(slide, "prompt") || null, lineDone);
      };
      sw("happy");
      capTimer = setTimeout(speak, 1800);
      try {
        jingle = new Audio("assets/Audio/sfx_celebrate.wav");
        jingle.volume = 0.7;
        jingle.onended = speak;
        jingle.onerror = speak;
        jingle.play().catch(speak);
      } catch (e) { speak(); }
      state.slideCleanup = () => {
        active = false;
        clearTimeout(capTimer); clearTimeout(talkTimer); clearTimeout(backTimer);
        if (jingle) { jingle.onended = null; jingle.onerror = null; jingle.pause(); }
        stopBurst();
      };
''' + text[end:]
text = text.replace('''      // "आगे बढ़ें" appears only AFTER the celebration VO finishes (see autoPlayChain onDone)
      const eb = $("endBtn");
      eb.classList.remove("show");
      state.endBtnPending = true;''', '''      const eb = $("endBtn");
      eb.classList.add("show", "hint-glow");
      state.endBtnPending = false;''')
text = text.replace('function clearHost() {', '''function clearHost() {
  document.body.classList.remove("is-end");
  $("endScreen").classList.remove("show", "hint-glow");
  $("endBtn").classList.remove("show", "hint-glow");''')
# Reference FLNKit burst, with slide cleanup for dev navigation.
reference = Path(r'D:\_A FLN files\HI02H11_L03_S02-20260914T105504Z-1-001\HI02H11_L03_S02\index.html').read_text(encoding='utf-8')
start = reference.index('function starBurst(host, o){')
end = reference.index('\nfunction starPath(r){', start)
burst = reference[start:end].replace('function starBurst(host, o){\n  cue(host, "celebrate");', '''function celebrationStarBurst(host){
  if (document.documentElement.classList.contains("no-anim")) return () => {};
  const o = {stars:32, circles:8, startV:14, decay:0.975, ticks:150,
    shots:[0,220,440], spin:0.18, starScale:1.8, circleScale:1.0};
  let active = true, animation;
  const timers = [];''')
burst = burst.replace('o.shots.forEach(function(ms){ ms ? setTimeout(shoot, ms) : shoot(); });','o.shots.forEach(function(ms){ ms ? timers.push(setTimeout(shoot, ms)) : shoot(); });')
burst = burst.replace('    ctx.clearRect(0, 0, W, H);','    if (!active) return;\n    ctx.clearRect(0, 0, W, H);')
burst = burst.replace('requestAnimationFrame(frame);','animation = requestAnimationFrame(frame);').replace('else setTimeout(function(){ cv.remove(); }, 300);','else timers.push(setTimeout(function(){ cv.remove(); }, 300));')
burst = burst.replace('  })();\n}', '''  })();
  return () => { active = false; cancelAnimationFrame(animation); timers.forEach(clearTimeout); cv.remove(); };
}''')
text = text.replace('/* ---------- 13. CONTROLLER ---------- */', burst + '\n\n/* ---------- 13. CONTROLLER ---------- */')
app.write_text(text, encoding='utf-8')
