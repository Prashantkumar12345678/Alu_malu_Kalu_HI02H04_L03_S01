const CARD = JSON.parse(document.getElementById("cardData").textContent);
const AUDIO_EXT = (CARD.assets && CARD.assets.audio_ext) || "mp3"; // .ogg (maths) / .ogg (Hindi FLN)
const IMG_EXT = (CARD.assets && CARD.assets.img_ext) || "png"; // .webp (working) / .webp (delivered/FLN) — twin of AUDIO_EXT (fixes A3)
const ENGINE_VERSION = "2026.07.21b-unified"; // ENGINE STAMP — the receipt (verify_bundle.py) asserts a built game carries THIS exact string; a stale/divergent engine → hard FAIL, so the wrong engine can never silently ship. BUMP IN LOCKSTEP with engine_guard.py + swiftpal_build.py + unified_build.py + verify_bundle.py on EVERY engine change (r2: drag/pattern feedback standard + PHASE_TRANSITION; r3c: off-white toybox bg, dual-coded counting options numeral+hand, full-body landing mascot, true-corner square/rect; r3d: Swiftie mouth-stops-when-silent (still frame), Arabic display numerals 1/2/3, landing shows full 1..n hand row, volume-chip aligned in header pill; r4a: ADDITIVE rhyme modules MEET_RHYME + RHYME_YESNO + RHYME_PICK for phonological-awareness तुक games — no existing module touched; r4b: ADDITIVE sentence-reading modules SENTENCE_READ + SENTENCE_FIND for H06 वाक्य reading — no existing module touched; r4c: ADDITIVE TAP_ALL_WITH_SOUND multi-select for repeated-sound/alliteration; r4d: ADDITIVE SENTENCE_SOUND — read an alliterative line, tap the repeated sound; r4e: ADDITIVE middle-sound modules MEET_MIDDLE + TAP_MIDDLE_SOUND + MIDDLE_PICK_WORD + MIDDLE_YESNO for H02 बीच-की-ध्वनि games; r4f: ADDITIVE reading-direction modules READ_PATH + TAP_READ_ARROW + TAP_READ_POS + TRACK_FOLLOW (guided "animated tracker" variant of READ_PATH) (+ readPage helper) for H03 पठन-दिशा/tracking print-concept games; r4g: ADDITIVE classroom-label modules MEET_LABEL + TAP_LABEL_SCENE + TAP_WORD_FOR_OBJECT (+ MATCH_DRAG_N word-tile mode) for H03 environmental-print/label games; r4h: ADDITIVE READ_TRACE (finger-swipe drag across words) + FIX_TRACKING (correct a confused reader's wrong finger via TAP_READ_POS confused_at marker) for H03 finger-tracking games; r4i: ADDITIVE USE_INTERFACE (operate a mini media-player/device by tapping the right button — H03 symbol/button recognition) — no existing module touched; r4j: ADDITIVE syllable-clap modules MEET_SYLLABLE + SYLLABLE_CLAP + TAP_SYLLABLE_COUNT for H02 ताली syllable-counting (no-मात्रा words, one clap per अक्षर, match count→numeral) — no existing module touched; r4k: ADDITIVE DECODE_TAP — the decode-tap reader for H04 L02 (tap each अक्षर of a no-मात्रा 2-letter word L→R to hear its sound, then a BLEND button merges them into the spoken word + reveals its picture; ordered tapping counters the letter-reversal misconception) — no existing module touched; r4l: ADDITIVE MEET_GENDER_PAIR — teaches पुल्लिंग→स्त्रीलिंग word-FORM change by doing (masculine noun → feminine noun with the ending change badged; tap each to hear) for H11 L03 लिंग-रूप games — no existing module touched; r4m: ADDITIVE STORY_READ_PAGE — picture-cue sentence reading (child taps words + reads the whole sentence, picture as support) for H04 चित्र-संकेत कहानी-पठन games — no existing module touched).
try {
  window.SWIFTPAL_ENGINE = ENGINE_VERSION;
} catch (e) {}
const $ = (id) => document.getElementById(id);

/* ---------- 1. SCALE THE 1333x750 STAGE ---------- */
function fit() {
  const vw =
    (window.visualViewport
      ? window.visualViewport.width
      : document.documentElement.clientWidth) || window.innerWidth;
  const vh =
    (window.visualViewport
      ? window.visualViewport.height
      : document.documentElement.clientHeight) || window.innerHeight;
  // contain-fit, scaling UP to fill the screen (no 1× cap, no margin) so a 16:9
  // viewport is covered edge-to-edge. Any leftover bars on non-16:9 are blue, not white.
  const s = Math.min(vw / 1333, vh / 750);
  document.documentElement.style.setProperty("--scale", s);
}
window.addEventListener("resize", fit);
window.addEventListener("load", fit);
if (window.visualViewport)
  window.visualViewport.addEventListener("resize", fit);
fit();

/* ---------- 2. SIGNAL BUS + OFFLINE TELEMETRY ---------- */
/* TELEMETRY: offline self-capture. Every signal is buffered to localStorage so
   the run survives a reload / works with NO host app. A full results record can
   be pulled via SwiftPAL.downloadResults() (or the ?dev=1 button on the end
   screen). If `endpoint` is set AND the device is online, the final record is
   also POSTed — left null so the lesson is fully offline by default. */
const TELEMETRY = {
  endpoint: null, // e.g. "https://lrs.example.com/swiftpal" — null = offline only
  storageKey:
    "swiftpal:run:" + CARD.skill_code + "_" + (CARD.part_label || "P1"),
};
const SwiftPAL = (window.SwiftPAL = {
  signals: [],
  validatorReport: { missing_signals: [], errors: [], passed: false },
  firedSet: new Set(),
  startedAt: Date.now(),
  emit(name, payload) {
    const evt = Object.assign(
      {
        ts: Date.now(),
        skill_code: CARD.skill_code,
        lo_code: CARD.lo_code,
        signal: name,
      },
      payload || {},
    );
    this.signals.push(evt);
    this.firedSet.add(name);
    try {
      console.log("[signal]", name, evt);
    } catch (e) {}
    try {
      window.parent?.postMessage(
        { type: "swiftpal:signal", payload: evt },
        "*",
      );
    } catch (e) {}
    this.persist();
  },
  /* full results record (used for download / POST / end-of-lesson dump) */
  exportResults() {
    const ms = typeof state !== "undefined" ? state.masteryAttempts : 0;
    const mh = typeof state !== "undefined" ? state.masteryHits : 0;
    return {
      skill_code: CARD.skill_code,
      lo_code: CARD.lo_code,
      part: CARD.part_label || null,
      started_at: this.startedAt,
      exported_at: Date.now(),
      mastery: { hits: mh, attempts: ms, score: ms ? mh / ms : 0 },
      validatorReport: this.validatorReport,
      signals: this.signals,
    };
  },
  /* silent: flush the running buffer to localStorage (survives reload / offline) */
  persist() {
    try {
      localStorage.setItem(
        TELEMETRY.storageKey,
        JSON.stringify(this.exportResults()),
      );
    } catch (e) {
      /* private mode / quota — non-fatal, postMessage + memory still work */
    }
  },
  /* pull the run as a JSON file (teacher/dev; not in the child's flow) */
  downloadResults() {
    try {
      const blob = new Blob([JSON.stringify(this.exportResults(), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        CARD.skill_code + "_" + (CARD.part_label || "P1") + "_results.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("[telemetry] download failed", e);
    }
  },
});

/* ---------- 3. AUDIO ---------- */
let isPlaying = false,
  currentAudio = null;
function setPlaying(on) {
  // the dynamic Swiftie sits header-left; the audio-chip (header-right) pulses to signal playback
  isPlaying = on;
  document.body.classList.toggle("vo-lock", on);
  const c = $("audioChip");
  if (c) c.classList.toggle("playing", on);
  swApplyPose(); // freeze/unfreeze Swiftie's mouth: animate only while a clip is sounding
}
function stopAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch (e) {}
    currentAudio = null;
  }
  setPlaying(false);
}
/* play(src, onEnd): real MP3 if path exists; silent 1.5s beat if missing/blocked. */
function play(src, onEnd) {
  stopAudio();
  setPlaying(true);
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    setPlaying(false);
    if (onEnd) onEnd();
  };
  if (src) {
    const a = new Audio(src);
    currentAudio = a;
    a.onended = fire;
    a.onerror = () => {
      currentAudio = null;
      setTimeout(fire, 1200);
    };
    a.play().catch(() => {
      currentAudio = null;
      setTimeout(fire, 1200);
    });
  } else {
    setTimeout(fire, 800);
  }
}
/* playSfx(id): fire-and-forget sound effect on its OWN Audio element so it can
   overlap the spoken VO (does NOT touch currentAudio / the play() chain).
   Silently no-ops if the file is missing or playback is blocked. */
function playSfx(id) {
  if (!id) return;
  try {
    const a = new Audio("assets/Audio/" + id + "." + AUDIO_EXT);
    a.volume = 0.7;
    a.play().catch(() => {});
  } catch (e) {}
}
/* ---------- game-feel: procedural SFX (no audio files) + success particle burst ----------
   WebAudio resumes on the first user tap (autoplay policy), so taps/answers always sound. */
let _juiceAC = null;
function _ac() {
  if (!_juiceAC) {
    try {
      _juiceAC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (_juiceAC && _juiceAC.state === "suspended") {
    try {
      _juiceAC.resume();
    } catch (e) {}
  }
  return _juiceAC;
}
function _tone(freqs, type, dur, vol) {
  const c = _ac();
  if (!c) return;
  const t0 = c.currentTime;
  freqs.forEach((f, i) => {
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    const t = t0 + i * (dur / freqs.length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / freqs.length);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur / freqs.length);
  });
}
const sfxTap = () => _tone([520], "sine", 0.09, 0.09);
const sfxCorrect = () => _tone([660, 880, 1180], "sine", 0.42, 0.13); // rising major arpeggio
const sfxWrongSoft = () => _tone([300, 235], "triangle", 0.2, 0.08); // gentle, never harsh
/* a joyful star/confetti pop, centred on the play stage (upper-middle) */
function burstStars() {
  const stage = document.querySelector(".slide-stage") || document.body;
  const cx = stage.offsetWidth / 2,
    cy = stage.offsetHeight * 0.38,
    emo = ["⭐", "✨", "🌟", "💫", "🎉"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    s.textContent = emo[i % emo.length];
    const ang = Math.PI * 2 * (i / 14) + Math.random() * 0.5,
      dist = 70 + Math.random() * 110;
    s.style.left = cx + "px";
    s.style.top = cy + "px";
    s.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(0) + "px");
    s.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(0) + "px");
    s.style.animationDelay = i * 10 + "ms";
    stage.appendChild(s);
    setTimeout(() => s.remove(), 950);
  }
}
/* dynamic Swiftie buddy: swap pose + a little pop on every reaction (correct/wrong/explain/celebrate) */
const SW_POSE = {
  talk: "talking", point: "talking", idle: "talking",
  happy: "celebrate", celebrate: "celebrate",
  tryagain: "tryagain", hint: "hint", teach: "hint", idea: "hint",
};
let swMood = "point";
/* Swiftie's mouth animates ONLY while a voice clip is sounding; the instant audio ends we freeze to
   the still closed-mouth frame. Driven off isPlaying (toggled by setPlaying at every clip start/end). */
function swApplyPose() {
  const img = document.getElementById("swBuddyImg");
  if (!img) return;
  const expr = SW_POSE[swMood] || "talking";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const src = $("stage").classList.contains("story-reading")
    ? "assets/UI/story_mascot.webp"
    : "assets/UI/sw_head_" + expr +
      (expr !== "talking" && !still ? "_anim" : "") + ".webp";
  if (img.getAttribute("src") !== src) img.src = src;
  img.onerror = () => { img.onerror = null; img.src = "assets/UI/mascot.webp"; };
  img.style.display = "";
}
function setSwMood(m) {
  swMood = m;
  swApplyPose();
  const w = document.getElementById("swBuddy");
  if (w) w.dataset.expr = SW_POSE[m] || "talking";
}
/* confetti cannons from BOTH sides — the correct-answer celebration (replaces the popup) */
function confettiCannon() {
  const colors = ["#FCB717", "#386AF6", "#21A74A", "#7048D6", "#2BC4D8"];
  for (let i = 0; i < 48; i++) {
    const piece = document.createElement("i");
    piece.className = "conf-shot";
    piece.style.position = "fixed";
    piece.style.zIndex = "1100";
    piece.style.left = (Math.random() * window.innerWidth) + "px";
    piece.style.top = "-20px";
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--tx", (Math.random() * 160 - 80) + "px");
    piece.style.setProperty("--ty", (window.innerHeight + 50) + "px");
    piece.style.animationDelay = (i * 8) + "ms";
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}
/* ---------- Block Town helpers (flagship) ---------- */
const BT_COLORS = ["#F9695E", "#FDC23C", "#4EBE6A", "#4EA3F0", "#9B7BE8"];
function btBlock(i) {
  const b = document.createElement("div");
  b.className = "blk";
  b.style.background = BT_COLORS[i % BT_COLORS.length];
  return b;
}
function btThunk(n) {
  _tone([360 + n * 46], "sine", 0.12, 0.1);
} // pitch climbs one step per block — HEAR the count
function btDust(plot) {
  const d = document.createElement("span");
  d.className = "bt-dust";
  d.textContent = "💨";
  plot.appendChild(d);
  setTimeout(() => d.remove(), 520);
}
function btSkyline(done, total) {
  const s = document.createElement("div");
  s.className = "bt-skyline";
  for (let i = 0; i < total; i++) {
    const b = document.createElement("div");
    b.className = "bt-bldg" + (i < done ? " done" : "");
    b.style.height = 26 + ((i * 17) % 32) + "px";
    s.appendChild(b);
  }
  return s;
}
/* the teach scene: the crane drops N blocks ONE AT A TIME (ascending thunk + spoken count) then a
   cardinality "freeze" (vo_total_N). Reached from MEET_NUMBER via data.present==='crane'. */
function btCraneMeet(host, slide) {
  const d = slide.data,
    N = d.count;
  state.ownsAudio = true; // the crane drops+counts blocks on its own timed VO — skip autoPlayChain
  const stage = document.createElement("div");
  stage.className = "bt-stage";
  const board = document.createElement("div");
  board.className = "bt-board";
  board.innerHTML =
    `<span class="bt-numeral">${N}</span>` +
    (d.word ? `<span class="bt-goallbl">${d.word}</span>` : ""); // Arabic numeral (from the integer, not card Devanagari)
  const track = document.createElement("div");
  track.className = "bt-track";
  const cells = [];
  for (let i = 1; i <= N; i++) {
    const c = document.createElement("div");
    c.className = "bt-nt";
    track.appendChild(c);
    cells.push(c);
  }
  const yard = document.createElement("div");
  yard.className = "bt-yard";
  const crane = document.createElement("div");
  crane.className = "bt-crane";
  crane.innerHTML = `<img src="assets/Images/obj_crane.webp" alt="">`;
  const plotwrap = document.createElement("div");
  plotwrap.className = "bt-plotwrap";
  const plot = document.createElement("div");
  plot.className = "bt-plot ground";
  plot.style.setProperty(
    "--bh",
    Math.max(20, Math.min(46, Math.floor(230 / N) - 2)) + "px",
  );
  plotwrap.appendChild(plot);
  yard.appendChild(crane);
  yard.appendChild(plotwrap);
  stage.appendChild(board);
  stage.appendChild(track);
  stage.appendChild(yard);
  host.appendChild(stage);
  state.gateNavUntilAudio = false;
  setNavActive(false);
  $("navBtn").onclick = () => completeSlide(true);
  let i = 0;
  const step = () => {
    if (i >= N) {
      if (d.topper) {
        const t = document.createElement("div");
        t.className = "bt-topper snap";
        t.innerHTML = `<img src="assets/Images/${d.topper}.webp" alt="">`;
        plot.appendChild(t);
      }
      burstStars();
      play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, () =>
        setNavActive(true),
      );
      return;
    }
    const b = btBlock(i);
    b.classList.add("drop");
    plot.appendChild(b);
    i++;
    if (cells[i - 1]) {
      cells[i - 1].classList.add("lit");
      cells[i - 1].textContent = i;
    }
    btThunk(i);
    btDust(plot);
    play("assets/Audio/vo_num_" + i + "." + AUDIO_EXT, () =>
      setTimeout(step, 340),
    );
  };
  // play the slide prompt FIRST, then start the crane count sequence — so the count VO never cuts the
  // prompt off (we own the audio here; mountSlide's autoPlayChain is skipped via state.ownsAudio).
  play(audioFor(slide, "prompt") || null, () => setTimeout(step, 400));
}
/* slide audio path: per slide, we look at slide.audio.prompt / .phoneme / etc.
   In this v0.1 the embedded card holds short ids; the compiler would replace
   them with base64 data URIs. We resolve to assets/Audio/{id}.ogg with fallback. */
function audioFor(slide, key) {
  if (!slide.audio || !slide.audio[key]) return null;
  return audioAsset(slide.audio[key]);
}
function audioAsset(id) {
  return (CARD.assets && CARD.assets.audio && CARD.assets.audio[id]) ||
    "assets/Audio/" + id + "." + AUDIO_EXT;
}
/* audioText(slide,key): the exact Hindi line the VO for this slot speaks, so a
   popup can SHOW what it SAYS (shown == spoken). Looks up the build-injected
   CARD.assets.audio_text map by the slot's audio_id. null if unknown. */
function audioText(slide, key) {
  const id = slide.audio && slide.audio[key];
  if (!id) return null;
  return (
    (CARD.assets && CARD.assets.audio_text && CARD.assets.audio_text[id]) ||
    null
  );
}
/* Play a SEQUENCE of audio sources back-to-back. Each one finishes (or
   falls back to silent beat if missing) before the next starts. */
function playChain(srcs, i, onDone) {
  i = i || 0;
  if (i >= srcs.length) {
    if (onDone) onDone();
    return;
  }
  play(srcs[i], () => playChain(srcs, i + 1, onDone));
}
/* On slide mount, play prompt → phoneme/word_name → instruction in order.
   KG learners can't read prompt_hi — the chain gives them both the
   instruction AND the cue (letter sound or picture name) audibly.
   onDone fires after the whole chain finishes (used to gate the नav button). */
function autoPlayChain(slide, onDone) {
  const order = ["prompt", "phoneme", "shape_name", "word_name", "instruction"];
  const chain = [];
  for (const k of order) {
    const src = audioFor(slide, k);
    if (src) chain.push(src);
  }
  if (chain.length) playChain(chain, 0, onDone);
  else if (onDone) onDone();
}

/* nav button: enable/disable the kit-style pill. When it becomes active (the
   activity is done) but the child doesn't tap आगे, the hand-nudge points at it. */
function setNavActive(on) {
  const btn = $("navBtn");
  btn.disabled = !on;
  btn.classList.toggle("active", on);
  clearTimeout(state.navNudgeTimer);
  if (on) state.navNudgeTimer = setTimeout(nudgeNavBtn, 4500);
}
function nudgeNavBtn() {
  const btn = $("navBtn");
  if (!btn.classList.contains("active") || state.hintActive) return;
  const nh = $("nudgeHand");
  const r = btn.getBoundingClientRect();
  const sw = document.querySelector(".slide-stage").getBoundingClientRect();
  const scale =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--scale"),
    ) || 1;
  nh.style.left = (r.left - sw.left) / scale + r.width / scale / 2 - 48 + "px";
  nh.style.top = (r.top - sw.top) / scale + r.height / scale / 2 - 6 + "px";
  nh.classList.add("show");
}

/* ---------- 4. STATE ---------- */
const state = {
  idx: 0,
  slideStart: Date.now(),
  attempts: 0,
  audioReplays: 0,
  hintUsed: false,
  nudgeUsed: false,
  scaffoldLevel: 0, // 0 none, 1 nudge, 2 hint, 3 reveal
  selectedKey: null,
  locked: false,
  hintActive: false,
  masteryHits: 0,
  masteryAttempts: 0,
  nudgeTimer: null,
};

/* ---------- 5. NUDGE ----------
   target may be a CSS selector OR an element. Used ONLY for flow guidance
   (e.g. the "listen" button / prompt) — never to point at the correct answer. */
function startNudge(slide, target) {
  clearTimeout(state.nudgeTimer);
  if (!target) return;
  const ms = (CARD.scaffold_rules.nudge_timeout_ms || {})[slide.phase];
  if (!ms) return;
  state.nudgeTimer = setTimeout(() => {
    if (state.locked || state.hintActive) return;
    const el =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const nh = $("nudgeHand");
    const r = el.getBoundingClientRect();
    // reference the nudge's positioning context (.slide-stage), NOT the whole stage,
    // or the hand lands ~140px (header height) too low.
    const sw = document.querySelector(".slide-stage").getBoundingClientRect();
    const scale =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--scale"),
      ) || 1;
    nh.style.left =
      (r.left - sw.left) / scale + r.width / scale / 2 - 48 + "px";
    nh.style.top = (r.top - sw.top) / scale + r.height / scale - 30 + "px";
    nh.classList.add("show");
    state.nudgeUsed = true;
    state.scaffoldLevel = Math.max(state.scaffoldLevel, 1);
    SwiftPAL.emit("nudge_invoked", { slide_id: slide.id, phase: slide.phase });
  }, ms);
}
function stopNudge() {
  clearTimeout(state.nudgeTimer);
  $("nudgeHand").classList.remove("show");
}
/* Show the hand-nudge immediately on a specific element (INTRO uses it to guide
   tapping each letter). Finger points up; fingertip sits just inside the tile's
   lower edge. References .slide-stage (the nudge's positioning context). */
function pointNudgeAt(el) {
  if (!el) return;
  const nh = $("nudgeHand");
  const r = el.getBoundingClientRect();
  const sw = document.querySelector(".slide-stage").getBoundingClientRect();
  const scale =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--scale"),
    ) || 1;
  nh.style.left = (r.left - sw.left) / scale + r.width / scale / 2 - 48 + "px";
  // fingertip overlaps the lower part of the tile (close to it, not far below)
  nh.style.top = (r.top - sw.top) / scale + r.height / scale - 56 + "px";
  nh.classList.add("show");
}

/* ---------- 7. HINT / FEEDBACK BOX ----------
   No button: the popup plays its VO, then auto-dismisses. onEnd runs after it
   closes (callers add a short pause there so the revealed answer shows). */
function showBox(emoji, text, theme, audioSrc, onEnd) {
  // CORRECT: no popup (lead review) — confetti cannons from both sides + Swiftie cheer, then onEnd.
  if (theme === "correct") {
    sfxCorrect();
    confettiCannon();
    setSwMood("celebrate");
    play(audioSrc || null, () =>
      setTimeout(() => {
        if (onEnd) onEnd();
      }, 300),
    );
    return;
  }
  state.hintActive = true;
  // wrong/hint/reveal keep a light card (mechanics use it for a short cue); Swiftie reacts too.
  // one-Swiftie rule: the popup shows the reacting Swiftie (animated), so HIDE the header buddy
  // while it's open — never two Swifties on screen at once (MoM flag).
  const swMap = {
    wrong: "sw_anim_tryagain",
    hint: "sw_anim_teach",
    reveal: "sw_anim_teach",
  };
  const sw = $("hintMascot");
  if (sw) {
    sw.style.display = "";
    sw.src = "assets/UI/" + (swMap[theme] || "sw_anim_talk") + ".gif";
  }
  const buddy = $("swBuddy");
  if (buddy) buddy.style.visibility = "hidden";
  setSwMood(theme === "wrong" ? "tryagain" : "hint");
  $("hintBox").classList.remove("celebrate");
  sfxWrongSoft();
  const ht = $("hintText");
  ht.textContent = text;
  ht.className = "hint-text " + theme;
  $("stage").classList.add("blurred");
  $("hintOverlay").classList.add("show");
  $("hintBtn").disabled = true;
  const hi = $("hintImg");
  if (hi) hi.src = "assets/UI/hint_active.webp";
  const close = () => {
    $("hintOverlay").classList.remove("show");
    $("stage").classList.remove("blurred");
    if (buddy) buddy.style.visibility = ""; // header Swiftie returns when the popup closes
    state.hintActive = false;
    if (hi) hi.src = "assets/UI/hint.webp";
    if (!state.locked) $("hintBtn").disabled = false;
    if (onEnd) onEnd();
  };
  // auto-dismiss after the VO finishes (small buffer so it never just flashes); freeze the popup
  // Swiftie's mouth to the still frame the instant its line ends
  play(audioSrc, () => {
    if (sw) sw.src = "assets/UI/" + SW_REST + ".webp";
    setTimeout(close, 300);
  });
}

/* ---------- 8. TAP-OPTION HELPER (shared by 5 slide types) ---------- */
function mountTapOptions({
  slide,
  host,
  signalName,
  stimulus,
  options,
  isCorrect,
  optionRenderer,
  columnsHint,
  mastery,
  hintAction,
  nudgeTarget,
  shuffle,
}) {
  state.attempts = 0;
  state.selectedKey = null;
  state.locked = false;
  state.audioReplays = 0;
  state.hintUsed = false;
  state.nudgeUsed = false;
  state.scaffoldLevel = 0;
  // idle hand-nudge target: defaults to the stimulus (re-listen), but a slide can pass
  // nudgeTarget:null to suppress it entirely (e.g. "how many?" — nothing to re-tap).
  const _nudge = nudgeTarget !== undefined ? nudgeTarget : stimulus || null;
  // optional custom hint (runs on the live slide instead of a text popup), e.g. a
  // count-demonstration. Wrapped to block option taps while it plays.
  const runHint = hintAction
    ? (after) => {
        state.hintActive = true;
        hintAction(() => {
          state.hintActive = false;
          if (after) after();
        });
      }
    : null;

  // Shuffle options once so the correct answer isn't pinned to one position (engine-wide anti
  // positional-bias — otherwise "always tap the same spot" can pass mastery). Opt out with
  // shuffle:false for inherently-ordered options (e.g. a number line).
  const _opts =
    shuffle === false
      ? options.slice()
      : (function (a) {
          a = a.slice();
          for (let i = a.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        })(options);

  const wrap = document.createElement("div");
  wrap.className = "q-row";
  if (stimulus) {
    wrap.appendChild(stimulus);
  }
  const grid = document.createElement("div");
  const cols =
    columnsHint || (_opts.length <= 2 ? 2 : _opts.length <= 3 ? 3 : 4);
  grid.className = "opt-grid cols-" + cols;
  _opts.forEach((opt, i) => {
    const cell = optionRenderer(opt, i);
    cell.classList.add("opt-cell");
    cell.dataset.key = String(i);
    cell.onclick = () => {
      if (
        state.locked ||
        isPlaying ||
        state.hintActive ||
        cell.classList.contains("faded") ||
        cell.classList.contains("wrong-flash") ||
        cell.classList.contains("correct")
      )
        return;
      stopNudge();
      // SME rule: SPEAK THE TAPPED WORD on EVERY tap (right or wrong), then the feedback — never two
      // voices at once (buzz/confetti are sfx, they ride alongside the word). opt.audio = word clip id.
      // Fallback wiring for LETTER options (SME: the tapped item's own sound speaks EVERYWHERE): options
      // authored as {letter:"आ"} carry no audio id, but the slide's data.phonemes map has each letter's
      // clip — derive it here centrally so every TAP_LETTER_* / mastery module inherits speak-on-tap
      // without per-module or per-card changes. Explicit opt.audio always wins.
      const _aid =
        opt.audio ||
        (opt.letter &&
          slide.data &&
          slide.data.phonemes &&
          slide.data.phonemes[opt.letter]) ||
        null;
      const _word = _aid ? audioAsset(_aid) : null;
      const _afterWord = (cb) => {
        if (_word) play(_word, cb);
        else cb();
      };
      if (isCorrect(opt, i)) {
        state.locked = true;
        cell.classList.add("correct");
        sfxCorrect();
        confettiCannon();
        setSwMood("happy");
        if (mastery) {
          state.masteryAttempts++;
          if (state.attempts === 0) state.masteryHits++;
        }
        SwiftPAL.emit(signalName, {
          slide_id: slide.id,
          phase: slide.phase,
          value: true,
          first_try: state.attempts === 0,
          attempts: state.attempts + 1,
          scaffold_level: state.scaffoldLevel,
          latency_ms: Date.now() - state.slideStart,
        });
        _afterWord(() => setTimeout(() => completeSlide(true), 700)); // speak the word → then advance (confetti is the reward)
      } else {
        state.attempts++;
        cell.classList.add("wrong-flash");
        setTimeout(() => cell.classList.remove("wrong-flash"), 700);
        sfxWrongSoft();
        setSwMood("tryagain");
        // (do NOT count masteryAttempts here — the correct branch counts one attempt PER ITEM.)
        SwiftPAL.emit("answer_wrong", {
          slide_id: slide.id,
          phase: slide.phase,
          attempts: state.attempts,
        });
        // LAYERED SCAFFOLD (A1): L1 re-listen → L2 hint → L3 REVEAL at max_attempts (never stuck).
        const _maxA =
          (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
        $("hintBtn").classList.add("show");
        _afterWord(() => {
          // speak the tapped word FIRST, then the layered feedback VO (no overlap)
          if (state.attempts >= _maxA) {
            revealAnswer("wrong");
          } else if (state.attempts >= 2) {
            state.scaffoldLevel = Math.max(state.scaffoldLevel, 2);
            if (runHint) runHint();
            else
              play(
                audioFor(slide, "hint") || audioFor(slide, "try_again") || null,
                () => {},
              );
          } else {
            state.scaffoldLevel = Math.max(state.scaffoldLevel, 1);
            play(audioFor(slide, "try_again") || null, () => {});
          }
        });
      }
    };
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  host.appendChild(wrap);

  // ---- layered-hint helpers (A1/B2): reveal-on-max + a wired manual hint button ----
  function _correctCell() {
    return [...grid.querySelectorAll(".opt-cell")].find((c) =>
      isCorrect(_opts[+c.dataset.key], +c.dataset.key),
    );
  }
  function revealAnswer(reason) {
    if (state.locked) return;
    state.locked = true;
    state.scaffoldLevel = 3;
    setSwMood("hint");
    const el = _correctCell();
    [...grid.querySelectorAll(".opt-cell")].forEach((c) => {
      if (c !== el) c.classList.add("faded");
    });
    if (el) {
      el.classList.add("reveal-hold");
      // Terminal help waits for the learner to tap the answer, as in the reference.
      el.onclick = () => {
        if (isPlaying || CARD.slides[state.idx] !== slide) return;
        el.onclick = null;
        stopNudge();
        el.classList.remove("reveal-hold");
        el.classList.add("correct");
        sfxCorrect();
        confettiCannon();
        setSwMood("happy");
        play(audioFor(slide, "correct") || null,
          () => setTimeout(() => completeSlide(false), 700));
      };
      if (slide.phase === "guided") pointNudgeAt(el);
    }
    SwiftPAL.emit("answer_revealed", {
      slide_id: slide.id,
      phase: slide.phase,
      attempts: state.attempts,
      reason,
    });
    play(
      audioFor(slide, "reveal") ||
        audioFor(slide, "correct") ||
        audioFor(slide, "try_again") ||
        null,
      () => {},
    );
  }
  $("hintBtn").onclick = () => {
    if (state.locked || state.hintActive || isPlaying) return;
    state.hintUsed = true;
    if (state.attempts < 1) state.attempts = 1;
    SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
    if (runHint) runHint();
    else
      play(
        audioFor(slide, "hint") || audioFor(slide, "try_again") || null,
        () => {},
      );
  };

  // Answer guidance is earned through attempts, not an idle timer.
  // Tap-to-answer standard (lead review): a WRONG tap = soft buzz + ✕ + that card LOCKS (can't re-tap);
  // a RIGHT tap = confetti cannons + Swiftie cheer, then auto-advance. No select-then-आगे for pick questions.
  $("navBtn").style.display = "none";
  setNavActive(false);
}

/* ---------- 10. RENDER HELPERS ---------- */
/* Render a picture as the real PNG (assets/Images/<key>.webp); if the file is
   missing it falls back to the emoji. Pass the image id (e.g. "pic_anaar"). */
function imgOrEmoji(imgKey, emoji, imgClass, emojiClass) {
  if (imgKey) {
    const fb = String(emoji || "❓").replace(/'/g, "");
    return (
      `<img class="${imgClass}" src="assets/Images/${imgKey}.${IMG_EXT}" alt="" ` +
      `onerror="var s=document.createElement('span');s.className='${emojiClass}';s.textContent='${fb}';this.replaceWith(s);">`
    );
  }
  return `<span class="${emojiClass}">${emoji || "❓"}</span>`;
}
function letterCell(letter) {
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="big-glyph ink-glyph">${letter}</span>`;
  return cell;
}
function pictureCell(picture, emoji, imgKey) {
  const cell = document.createElement("div");
  cell.innerHTML =
    imgOrEmoji(imgKey, emoji, "pic-img", "pic-emoji") +
    `<span class="lbl">${picture || ""}</span>`;
  return cell;
}
function stimulusLetter(letter) {
  const el = document.createElement("div");
  el.className = "stimulus-letter";
  el.innerHTML = `<span class="ink-glyph">${letter}</span>`;
  return el;
}
function stimulusPic(picture, emoji, imgKey) {
  const el = document.createElement("div");
  el.className = "stimulus-pic";
  el.innerHTML =
    imgOrEmoji(imgKey, emoji, "img", "emoji") +
    `<span class="lbl">${picture || ""}</span>`;
  return el;
}
/* gender helpers: an option card showing a gender label (पुल्लिंग/स्त्रीलिंग),
   and a stimulus card showing the target gender label. */
function genderLabelCell(label, gender) {
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="gender-label${gender === "F" ? " fem" : ""}">${label}</span>`;
  return cell;
}
function stimulusGender(label, gender) {
  const el = document.createElement("div");
  el.className = "stimulus-gender" + (gender === "F" ? " fem" : "");
  el.textContent = label;
  return el;
}

/* shape helpers (maths): render circle/square/triangle/rectangle as inline SVG in
   any colour / size / rotation (LO: recognise regardless of orientation or size).
   No image assets needed — shapes are pure geometry, so the sample renders offline. */
function shapeSVG(shape, opts) {
  opts = opts || {};
  const color = opts.color || "#386AF6";
  const size = opts.size || 120;
  const rot = opts.rotate || 0;
  let inner = "";
  if (shape === "circle")
    inner = `<circle cx="50" cy="50" r="42" fill="${color}"/>`;
  else if (shape === "square")
    inner = `<rect x="12" y="12" width="76" height="76" rx="0" fill="${color}"/>`; // TRUE corners — teachable geometry is never rounded
  else if (shape === "triangle")
    inner = `<polygon points="50,9 91,89 9,89" fill="${color}"/>`;
  else if (shape === "rectangle")
    inner = `<rect x="6" y="28" width="88" height="44" rx="0" fill="${color}"/>`; // TRUE corners
  const g = rot ? `<g transform="rotate(${rot} 50 50)">${inner}</g>` : inner;
  return (
    `<svg class="shape-svg" viewBox="0 0 100 100" width="${size}" height="${size}" ` +
    `xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${g}</svg>`
  );
}
function shapeCell(o) {
  const cell = document.createElement("div");
  cell.innerHTML = shapeSVG(o.shape, {
    color: o.color,
    size: 130,
    rotate: o.rotate,
  });
  return cell;
}
function stimulusShape(o) {
  const el = document.createElement("div");
  el.className = "stimulus-shape";
  el.innerHTML = shapeSVG(o.shape, {
    color: o.color,
    size: 150,
    rotate: o.rotate,
  });
  return el;
}

/* counting helpers (maths): a numeral option card (big numeral + small number word),
   and a stimulus box showing a set of `count` identical objects to be counted. */
function numberCell(numeral, word) {
  const cell = document.createElement("div");
  cell.innerHTML =
    `<span class="num-glyph">${numeral}</span>` +
    (word ? `<span class="num-word">${word}</span>` : "");
  return cell;
}
/* VISUAL-FIRST quantity: a HAND showing n fingers up (assets/UI/hand_1..5) — pre-reader,
   NO number-word text. Falls back to the numeral only if n is outside 1..5 or the art is missing. */
function fingerCount(n, cls) {
  cls = cls || "finger-hand";
  if (!(n >= 1 && n <= 5)) return `<span class="num-glyph">${n}</span>`;
  return (
    `<img class="${cls}" src="assets/UI/hand_${n}.webp" alt="" ` +
    `onerror="var s=document.createElement('span');s.className='num-glyph';s.textContent='${n}';this.replaceWith(s);">`
  );
}
function fingerCell(n) {
  const c = document.createElement("div");
  c.innerHTML = fingerCount(n, "opt-hand");
  return c;
}
/* DISPLAY numeral: ALWAYS Arabic (1 2 3) on screen — kids learn the universal digit.
   Spoken VO stays Hindi (एक/दो/तीन) via the separate vo_num_/vo_total_ audio files. */
function devNumeral(n) {
  return String(n);
}
/* DUAL-CODED counting option: the Devanagari NUMERAL the child is learning, big and on top,
   with a smaller finger-hand beneath it as a visual anchor. The point of counting is to learn the
   NUMBER SYMBOL, not just read a hand-sign — so the numeral leads and the hand supports. Falls back
   to the numeral alone if the hand art (1..5) is missing. */
function numFingerCell(n) {
  // outer div BECOMES the .opt-cell (mountTapOptions adds that class), so the stack lives in an
  // INNER .numfinger wrapper — otherwise ".opt-cell .numfinger x" selectors wouldn't match.
  const c = document.createElement("div");
  c.innerHTML = `<div class="numfinger"><span class="num-glyph">${devNumeral(n)}</span>${fingerCount(n, "nf-hand")}</div>`;
  return c;
}
function stimulusCountSet(count, obj) {
  const el = document.createElement("div");
  el.className = "count-set";
  for (let i = 0; i < count; i++) {
    const c = document.createElement("span");
    c.className = "cobj";
    c.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji");
    el.appendChild(c);
  }
  return el;
}
/* COMPARE_SETS helpers (one-to-one matching → ज़्यादा / कम / बराबर).
   Two left-aligned rows (columns line up), a dashed connector drawn top[i]↔bottom[i]
   for each matched pair, and the unmatched leftover item(s) in the longer row glow —
   that glow IS the "which has more" proof. Offsets (not getBoundingClientRect) so it
   works even when the preview tab is throttled. */
function cmpObj(obj) {
  const c = document.createElement("span");
  c.className = "cobj";
  c.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji");
  return c;
}
function stimulusCompareSets(data) {
  const nA = data.a_count,
    nB = data.b_count,
    A = data.a_object,
    B = data.b_object;
  const NS = "http://www.w3.org/2000/svg";
  const stage = document.createElement("div");
  stage.className = "compare-stage";
  const rowA = document.createElement("div");
  rowA.className = "cmp-row top";
  const rowB = document.createElement("div");
  rowB.className = "cmp-row bot";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "cmp-lines");
  for (let i = 0; i < nA; i++) rowA.appendChild(cmpObj(A));
  for (let i = 0; i < nB; i++) rowB.appendChild(cmpObj(B));
  stage.appendChild(rowA);
  stage.appendChild(svg);
  stage.appendChild(rowB);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cmp-match-btn";
  btn.textContent = "🔗 मिलाओ";
  stage.appendChild(btn);
  const min = Math.min(nA, nB);
  let drawn = false;
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const IA = [...rowA.children],
      IB = [...rowB.children];
    const y1 = rowA.offsetTop + rowA.offsetHeight - 4;
    const y2 = rowB.offsetTop + 4;
    for (let i = 0; i < min; i++) {
      const x = IA[i].offsetLeft + IA[i].offsetWidth / 2;
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", x);
      ln.setAttribute("y1", y1);
      ln.setAttribute("x2", x);
      ln.setAttribute("y2", y2);
      ln.setAttribute("class", "cmp-line");
      svg.appendChild(ln);
      setTimeout(() => ln.classList.add("show"), 130 * i);
    }
    const longer = nA > nB ? IA : nB > nA ? IB : null; // null when equal (nothing left over)
    if (longer)
      for (let i = min; i < longer.length; i++)
        setTimeout(() => longer[i].classList.add("leftover"), 130 * min + 160);
  }
  // reveal the matching (child taps मिलाओ, or the hint/tutorial calls this). cb fires after it settles.
  stage._revealMatches = (cb) => {
    if (!drawn) {
      drawn = true;
      btn.disabled = true;
      draw();
    }
    if (cb) setTimeout(cb, 130 * min + 800);
  };
  btn.onclick = () => stage._revealMatches();
  if (data.show_matches) {
    btn.style.display = "none";
    setTimeout(() => stage._revealMatches(), 420);
  }
  return stage;
}
/* HINT for "how many": instead of a text popup, COUNT the set FOR the child —
   highlight each object left→right, say एक/दो/तीन, show the numeral on top of it.
   The child sees + hears the count modelled, then answers from the options. */
function demoCount(items, numerals, onDone) {
  numerals = numerals || [];
  const clear = () =>
    items.forEach((o) => {
      o.classList.remove("counting");
      const c = o.querySelector(".count-callout");
      if (c) c.remove();
    });
  clear();
  let i = 0;
  (function step() {
    if (i >= items.length) {
      // last count landed → clear, then continue
      setTimeout(() => {
        clear();
        if (onDone) onDone();
      }, 1000);
      return;
    }
    const o = items[i];
    o.classList.add("counting");
    let cal = o.querySelector(".count-callout");
    if (!cal) {
      cal = document.createElement("span");
      cal.className = "count-callout";
      o.appendChild(cal);
    }
    cal.textContent = String(i + 1); // Arabic count callout; Hindi number-word is spoken separately
    play("assets/Audio/vo_num_" + (i + 1) + "." + AUDIO_EXT, () => {
      i++;
      setTimeout(step, 320);
    });
  })();
}
function demoCountSet(setEl, count, numerals, onDone) {
  // count the "how many?" stimulus set
  demoCount(
    [...setEl.querySelectorAll(".cobj")].slice(0, count),
    numerals,
    onDone,
  );
}

/* ---------- 10b. DEVANAGARI GLYPH INK-CENTERING ----------
   Devanagari glyphs carry matras above (ओ, औ, अं) and below (ऋ) the shirorekha,
   so plain flex `align-items:center` leaves them sitting high with a gap below —
   and the offset differs per glyph. Measure each glyph's real ink box (canvas
   actualBoundingBox) + its baseline in the DOM, then translateY so the INK is
   truly centred in its tile/box. Font-agnostic; recomputed on mount + fonts.ready. */
let _inkCtx = null;
function centerInkGlyph(span) {
  if (!span || !span.parentElement) return;
  const glyph = (span.textContent || "").trim();
  if (!glyph) return;
  const box = span.parentElement;
  const cs = getComputedStyle(span);
  const fpx = parseFloat(cs.fontSize);
  if (!fpx) return;
  _inkCtx = _inkCtx || document.createElement("canvas").getContext("2d");
  _inkCtx.font = `${cs.fontWeight} ${fpx}px ${cs.fontFamily}`;
  const m = _inkCtx.measureText(glyph);
  const a = m.actualBoundingBoxAscent,
    d = m.actualBoundingBoxDescent;
  if (!isFinite(a) || !isFinite(d)) return;
  const scale =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--scale"),
    ) || 1;
  span.style.transform = ""; // reset before measuring baseline
  const probe = document.createElement("span");
  probe.style.cssText =
    "display:inline-block;width:0;height:0;vertical-align:baseline;";
  span.appendChild(probe);
  const baseScreen = probe.getBoundingClientRect().top;
  span.removeChild(probe);
  const br = box.getBoundingClientRect();
  if (br.height < 5) return; // not laid out yet
  const boxCenter = br.top + br.height / 2;
  const inkCenter = baseScreen + ((d - a) / 2) * scale; // screen px
  const dy = (boxCenter - inkCenter) / scale; // css px to move glyph down
  span.style.transform = `translateY(${dy}px)`;
}
function centerAllGlyphs(root) {
  (root || document).querySelectorAll(".ink-glyph").forEach(centerInkGlyph);
}

/* ---------- 11. DRAG-DROP PRIMITIVE ---------- */
function makeDraggable(tileEl, onDrop) {
  let startX = 0,
    startY = 0,
    dx = 0,
    dy = 0,
    dragging = false;
  let scale = 1;
  const refScale = () =>
    (scale =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--scale"),
      ) || 1);
  function onDown(e) {
    if (
      (isPlaying && !tileEl.classList.contains("sel")) || state.locked || state.hintActive ||
      tileEl.classList.contains("snapped") ||
      tileEl.classList.contains("matched")
    )
      return;
    refScale();
    dragging = true;
    // bind move/up on the document ONLY while dragging (removed in onUp) — otherwise every tile leaves
    // stale document listeners that pile up across the 11 drag slides.
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX;
    startY = p.clientY;
    dx = 0;
    dy = 0;
    tileEl.classList.add("dragging");
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    dx = (p.clientX - startX) / scale;
    dy = (p.clientY - startY) / scale;
    tileEl.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;
    // highlight zone under — hide the tile from hit-testing so the dragged tile
    // (z-index 50, now covering the zone) doesn't mask the zone beneath it.
    const cx = p.clientX,
      cy = p.clientY;
    document
      .querySelectorAll(".dd-zone")
      .forEach((z) => z.classList.remove("hover"));
    tileEl.style.pointerEvents = "none";
    const under = document.elementFromPoint(cx, cy);
    tileEl.style.pointerEvents = "";
    const zone = under?.closest?.(".dd-zone");
    if (zone && !zone.classList.contains("filled")) zone.classList.add("hover");
    e.preventDefault();
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchend", onUp);
    tileEl.classList.remove("dragging");
    const p = e.changedTouches ? e.changedTouches[0] : e;
    // hide the tile from hit-testing so we detect the zone underneath it
    tileEl.style.pointerEvents = "none";
    const under = document.elementFromPoint(p.clientX, p.clientY);
    tileEl.style.pointerEvents = "";
    const zone = under?.closest?.(".dd-zone");
    document
      .querySelectorAll(".dd-zone")
      .forEach((z) => z.classList.remove("hover"));
    if (zone && !zone.classList.contains("filled")) {
      // snap
      tileEl.style.transform = "";
      onDrop(zone, tileEl);
    } else {
      tileEl.style.transform = "";
    }
  }
  tileEl.addEventListener("mousedown", onDown);
  tileEl.addEventListener("touchstart", onDown, { passive: false });
}
/* shared wrong-drop response for drag/sort/sequence modules: soft buzz + Swiftie try-again pose + the
   authored spoken "try_again". Pre-readers need the SPOKEN recovery, not just the visual spring-back. */
function dragWrong(slide) {
  sfxWrongSoft();
  setSwMood("tryagain");
  play(audioFor(slide, "try_again") || null, () => {});
}

/* shared SUCCESS response — the engine-wide answer-feedback standard (lead-confirmed): side confetti
   cannons + rising sfx + Swiftie celebrates + the authored "correct" VO, then AUTO-ADVANCE. Never a
   celebration popup, never a "press आगे to continue" gate on a solved activity. `revealed` = the child
   got there via the reveal scaffold → quieter settle (no confetti/cheer) + completeSlide(false) so
   mastery telemetry stays honest. */
function celebrateThenAdvance(slide, revealed) {
  if (revealed) {
    play(audioFor(slide, "reveal") || null, () => {});
    setTimeout(() => completeSlide(false), 1400);
    return;
  }
  sfxCorrect();
  confettiCannon();
  setSwMood("celebrate");
  play(audioFor(slide, "correct") || null, () => {});
  setTimeout(() => completeSlide(true), 1400);
}

/* Reading-direction (H03 print concepts) shared builder: render `lines` (array of word arrays) as a
   book "page" of word-cards; return the page with page._cards (flat, in reading order, each tagged
   ._li/._wi) and optional page._buddy (a reading buddy sprite). Used by READ_PATH / TAP_READ_ARROW /
   TAP_READ_POS. ADDITIVE (r4f) — no existing module reads it. */
function readPage(lines, opts) {
  opts = opts || {};
  const page = document.createElement("div");
  page.className = "read-page";
  const flat = [];
  (lines || []).forEach((words, li) => {
    const lineEl = document.createElement("div");
    lineEl.className = "read-line";
    words.forEach((w, wi) => {
      const c = document.createElement("div");
      c.className = "read-word";
      c.innerHTML = `<span class="rw-text ink-glyph">${w}</span>`;
      c._li = li;
      c._wi = wi;
      lineEl.appendChild(c);
      flat.push(c);
    });
    page.appendChild(lineEl);
  });
  if (opts.buddy) {
    const b = document.createElement("div");
    b.className = "read-buddy";
    b.innerHTML = imgOrEmoji(
      opts.buddy_img,
      opts.buddy_emoji || "🐞",
      "rb-img",
      "rb-emoji",
    );
    page.appendChild(b);
    page._buddy = b;
  }
  page._cards = flat;
  return page;
}

/* EVIDENCE comprehension helpers (H04 L03 शाब्दिक एवं अनुमान-आधारित बोध) — ADDITIVE (r4n); used only by
   STORY_READALONG / EVIDENCE_QA / FIND_EVIDENCE / QTYPE_RECAP. A passage = optional picture + the story
   text as sentence spans (each sentence has its own clip, so it can be read along / re-heard / tapped).
   evMark() lights the proof: literal → yellow highlight + "📖 उत्तर यहाँ लिखा है"; inference → dashed
   purple outline + "🔍 सुराग़" (the curriculum's "सुराग़ अलग टैग से दिखता है"). */
function evPassage(p, opts) {
  p = p || {};
  opts = opts || {};
  const card = document.createElement("div");
  card.className =
    "ev-passage" +
    (opts.big ? " big" : "") +
    (opts.big && (p.lines || []).length > 2 ? " dense" : "");
  if (p.image_id)
    card.insertAdjacentHTML(
      "beforeend",
      `<div class="ev-pic">${imgOrEmoji(p.image_id, "📖", "ev-img", "ev-emoji")}</div>`,
    );
  const txt = document.createElement("div");
  txt.className = "ev-text";
  const lines = [];
  (p.lines || []).forEach((ln, i) => {
    const s = document.createElement("span");
    s.className = "ev-line";
    s.dataset.idx = String(i);
    const lineText = document.createElement("span");
    lineText.className = "ev-l-text";
    String(ln.text || "")
      .split(/(\s+)/)
      .forEach((token) => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          lineText.appendChild(document.createTextNode(token));
          return;
        }
        const word = document.createElement("span");
        word.className = "ev-word";
        word.textContent = token;
        lineText.appendChild(word);
      });
    s.appendChild(lineText);
    s._src = ln.audio ? "assets/Audio/" + ln.audio + "." + AUDIO_EXT : null;
    txt.appendChild(s);
    txt.appendChild(document.createTextNode(" "));
    lines.push(s);
  });
  card.appendChild(txt);
  card._lines = lines;
  return card;
}
function evWordKaraoke(line) {
  const words = [...line.querySelectorAll(".ev-word")];
  if (!words.length) return () => {};
  const weights = words.map((word) => {
    const text = word.textContent || "";
    return Math.max(
      1,
      Array.from(text).length +
        (/[।!?]$/.test(text) ? 3 : /[,;:]$/.test(text) ? 1 : 0),
    );
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const startedAt = performance.now();
  const fallbackDuration = Math.max(900, total * 65);
  let active = -1;
  const timer = setInterval(() => {
    const audio = currentAudio;
    const hasAudioTime =
      audio &&
      Number.isFinite(audio.duration) &&
      audio.duration > 0 &&
      !audio.paused;
    const progress = hasAudioTime
      ? audio.currentTime / audio.duration
      : (performance.now() - startedAt) / fallbackDuration;
    const target = Math.min(0.999, Math.max(0, progress)) * total;
    let elapsed = 0,
      next = words.length - 1;
    for (let i = 0; i < weights.length; i++) {
      elapsed += weights[i];
      if (target < elapsed) {
        next = i;
        break;
      }
    }
    if (next === active) return;
    words.forEach((word, i) =>
      word.classList.toggle("ev-word-now", i === next),
    );
    active = next;
  }, 60);
  return () => {
    clearInterval(timer);
    words.forEach((word) => word.classList.remove("ev-word-now"));
  };
}
function evMark(lines, idxs, qtype) {
  (idxs || []).forEach((i) => {
    const l = lines[i];
    if (!l || l.classList.contains("ev-hl") || l.classList.contains("ev-clue"))
      return;
    l.classList.add(qtype === "inference" ? "ev-clue" : "ev-hl");
    const t = document.createElement("span");
    t.className = "ev-tag";
    t.textContent =
      qtype === "inference" ? "🔍 सुराग़" : "📖 उत्तर यहाँ लिखा है";
    l.insertBefore(t, l.firstChild);
  });
}
function evQtypeChip(qtype) {
  const el = document.createElement("div");
  el.className =
    "ev-qtype " + (qtype === "inference" ? "inference" : "literal");
  el.innerHTML =
    qtype === "inference"
      ? `<span class="ic">🔍</span><span>अनुमान प्रश्न</span>`
      : `<span class="ic">📖</span><span>सीधा प्रश्न</span>`;
  return el;
}

/* ---------- 12. SLIDE MODULES ---------- */
const SlideModules = {
  INTRO: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "intro-stage";
      const row = document.createElement("div");
      row.className = "intro-letters";
      const letters = slide.data.letters;
      const tapped = new Set();
      const tiles = [];
      // Size tiles to the letter count so the single row ALWAYS fits the stage.
      // Available width = stage(1333) - slide padding(2×150) + intro breakout(2×100)
      // ≈ 1233; use 1220 for safety. Cap at 184 (so a 6-letter set looks unchanged),
      // floor at 110. font scales with the tile (≈0.565 of size, i.e. 104/184).
      const GAP = 20,
        MAXW = 1220,
        n = letters.length;
      const tSize = Math.max(
        110,
        Math.min(184, Math.floor((MAXW - (n - 1) * GAP) / n)),
      );
      const tFont = Math.round(tSize * 0.565);
      row.style.gap = GAP + "px";
      // hand-nudge points at the first letter not yet tapped — guides every box
      function nudgeNext() {
        for (let i = 0; i < letters.length; i++) {
          if (!tapped.has(letters[i])) {
            pointNudgeAt(tiles[i]);
            return;
          }
        }
        stopNudge();
      }
      letters.forEach((L, i) => {
        const tile = document.createElement("div");
        tile.className = "intro-letter";
        tile.style.width = tile.style.height = tSize + "px";
        tile.style.fontSize = tFont + "px";
        tile.innerHTML = `<span class="ink-glyph">${L}</span>`;
        tile.onclick = () => {
          tile.classList.add("played");
          const phon = slide.data.phonemes && slide.data.phonemes[L];
          play(phon ? "assets/Audio/" + phon + "." + AUDIO_EXT : null);
          SwiftPAL.emit("intro_letter_tap", { slide_id: slide.id, letter: L });
          tapped.add(L);
          // नav unlocks only after EVERY letter has been heard
          if (tapped.size >= letters.length) {
            stopNudge();
            setNavActive(true);
          } else {
            nudgeNext();
          }
        };
        row.appendChild(tile);
        tiles.push(tile);
      });
      wrap.appendChild(row);
      host.appendChild(wrap);

      setNavActive(false);
      $("navBtn").onclick = () => {
        if (tapped.size >= letters.length) completeSlide(true);
      };
      nudgeNext(); // start by guiding the first letter
    },
  },

  MEET_LETTER: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "meet-stage";
      if (slide.data.pair) {
        const pair = document.createElement("div");
        pair.className = "meet-pair";
        slide.data.pair.forEach((p) => {
          const item = document.createElement("div");
          item.className = "meet-pair-item";
          item.innerHTML = `
            <div class="meet-letter-box"><span class="glyph ink-glyph">${p.letter}</span></div>
            <div class="meet-arrow">→</div>
            <div class="meet-pic-box">
              ${imgOrEmoji(p.picture_img, p.picture_emoji, "pic-img", "pic-emoji")}
              <span class="pic-label">${p.word_hi}</span>
            </div>`;
          pair.appendChild(item);
        });
        wrap.appendChild(pair);
      } else {
        wrap.innerHTML = `
          <div class="meet-letter-box"><span class="glyph ink-glyph">${slide.data.letter}</span></div>
          <div class="meet-arrow">→</div>
          <div class="meet-pic-box">
            ${imgOrEmoji(slide.data.picture_img, slide.data.picture_emoji, "pic-img", "pic-emoji")}
            <span class="pic-label">${slide.data.word_hi}</span>
          </div>`;
      }
      host.appendChild(wrap);
      // नav unlocks only after the VO has played once (students can't skip the model)
      state.gateNavUntilAudio = true;
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
    },
  },

  /* ===== SHAPES (maths) — reuse the same scaffold/nudge/feedback as letters ===== */
  SHAPE_INTRO: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "intro-stage";
      const row = document.createElement("div");
      row.className = "intro-shapes";
      const shapes = slide.data.shapes;
      const tapped = new Set();
      const tiles = [];
      const GAP = 28,
        MAXW = 1220,
        n = shapes.length;
      const tSize = Math.max(
        120,
        Math.min(184, Math.floor((MAXW - (n - 1) * GAP) / n)),
      );
      row.style.gap = GAP + "px";
      function nudgeNext() {
        for (let i = 0; i < shapes.length; i++) {
          if (!tapped.has(i)) {
            pointNudgeAt(tiles[i]);
            return;
          }
        }
        stopNudge();
      }
      shapes.forEach((sh, i) => {
        const tile = document.createElement("div");
        tile.className = "intro-shape";
        tile.style.width = tile.style.height = tSize + "px";
        // name label (revealed on tap — child hears the name AND sees it on top of the shape)
        tile.innerHTML =
          `<span class="shape-name">${sh.name || ""}</span>` +
          shapeSVG(sh.shape, {
            color: sh.color,
            size: Math.round(tSize * 0.62),
            rotate: sh.rotate,
          });
        tile.onclick = () => {
          tile.classList.add("played");
          play(
            sh.name_audio
              ? "assets/Audio/" + sh.name_audio + "." + AUDIO_EXT
              : null,
          );
          SwiftPAL.emit("intro_shape_tap", {
            slide_id: slide.id,
            shape: sh.shape,
          });
          tapped.add(i);
          if (tapped.size >= shapes.length) {
            stopNudge();
            setNavActive(true);
          } else {
            nudgeNext();
          }
        };
        row.appendChild(tile);
        tiles.push(tile);
      });
      wrap.appendChild(row);
      host.appendChild(wrap);
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (tapped.size >= shapes.length) completeSlide(true);
      };
      nudgeNext();
    },
  },

  MEET_SHAPE: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "meet-stage";
      wrap.innerHTML = `
        <div class="meet-shape-box">
          ${shapeSVG(slide.data.shape, { color: slide.data.color, size: 190, rotate: slide.data.rotate })}
          <span class="label">${slide.data.name}</span>
        </div>
        <div class="meet-arrow">→</div>
        <div class="meet-pic-box">
          ${imgOrEmoji(slide.data.object_img, slide.data.object_emoji, "pic-img", "pic-emoji")}
          <span class="pic-label">${slide.data.object_hi}</span>
        </div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
    },
  },

  TAP_SHAPE_BY_NAME: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "shape_name_first_try",
        stimulus: (() => {
          const el = document.createElement("div");
          el.className = "stimulus-pic";
          el.style.cursor = "pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">${slide.data.name || "नाम सुनो"}</span>`;
          el.onclick = () => {
            state.audioReplays++;
            play(audioFor(slide, "shape_name") || null);
          };
          return el;
        })(),
        options: slide.data.options,
        isCorrect: (opt) => opt.shape === slide.data.target,
        optionRenderer: (opt) => shapeCell(opt),
      });
    },
  },

  TAP_SHAPE_BY_PICTURE: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "shape_env_first_try",
        stimulus: stimulusPic(
          slide.data.object_hi,
          slide.data.object_emoji,
          slide.data.object_img,
        ),
        options: slide.data.options,
        isCorrect: (opt) => opt.shape === slide.data.target,
        optionRenderer: (opt) => shapeCell(opt),
      });
    },
  },

  TAP_PICTURE_BY_SHAPE: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "shape_object_first_try",
        stimulus: stimulusShape({
          shape: slide.data.shape,
          color: slide.data.color,
          rotate: slide.data.rotate,
        }),
        options: slide.data.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) =>
          pictureCell(opt.object_hi, opt.object_emoji, opt.object_img),
      });
    },
  },

  SORT_SHAPE: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "sort-stage shape-sort";
      const binsRow = document.createElement("div");
      binsRow.className =
        "sort-bins" + (slide.data.bins.length >= 4 ? " many" : "");
      slide.data.bins.forEach((b) => {
        const bin = document.createElement("div");
        bin.className = "sort-bin dd-zone"; // dd-zone → drop detection
        bin.dataset.shape = b.shape;
        // header (faint reference shape + label) INSIDE the box, then a clear drop area
        bin.innerHTML =
          `<div class="bin-head-row"><span class="bin-ref">${shapeSVG(b.shape, { color: "#AEB9CC", size: 34 })}</span><span class="bin-title">${b.label}</span></div>` +
          `<div class="bin-items"></div>`;
        binsRow.appendChild(bin);
      });
      const tray = document.createElement("div");
      tray.className = "sort-tray";
      const items = slide.data.items.slice().sort(() => Math.random() - 0.5);
      items.forEach((it) => {
        const t = document.createElement("div");
        t.className = "sort-item";
        t.dataset.shape = it.shape;
        t.innerHTML = shapeSVG(it.shape, {
          color: it.color,
          size: 70,
          rotate: it.rotate,
        });
        tray.appendChild(t);
      });
      wrap.appendChild(binsRow);
      wrap.appendChild(tray);
      host.appendChild(wrap);

      state.attempts = 0;
      state.locked = false;
      let placed = 0;
      const need = slide.data.items.length;
      [...tray.children].forEach((tile) => {
        makeDraggable(tile, (zone, t) => {
          const bin = zone.closest(".sort-bin");
          if (!bin) return;
          state.attempts++;
          if (bin.dataset.shape === t.dataset.shape) {
            t.classList.add("snapped");
            bin.querySelector(".bin-items").appendChild(t);
            placed++;
            SwiftPAL.emit("shape_sort_item", {
              slide_id: slide.id,
              shape: t.dataset.shape,
              attempts: state.attempts,
            });
            if (placed === need) {
              state.locked = true;
              SwiftPAL.emit("shape_sort_correct", {
                slide_id: slide.id,
                phase: slide.phase,
                value: true,
                attempts: state.attempts,
                latency_ms: Date.now() - state.slideStart,
              });
              setTimeout(() => celebrateThenAdvance(slide, false), 250); // standard: confetti + VO + auto-advance, no popup
            }
          } else {
            bin.classList.add("hover");
            bin.style.borderColor = "var(--wrong)";
            setTimeout(() => {
              bin.classList.remove("hover");
              bin.style.borderColor = "";
            }, 500);
            dragWrong(slide); // buzz + Swiftie + spoken try_again (pre-readers need the spoken recovery)
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
          }
        });
      });
    },
  },

  /* ===== COUNTING (maths) — OTO tap-count, cardinality, meet-number, make-set ===== */
  COUNT_TAP: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "count-stage";
      const row = document.createElement("div");
      row.className = "count-row";
      const N = slide.data.count,
        obj = slide.data.object,
        nums = slide.data.numerals || [];
      const items = [];
      let c = 0;
      for (let i = 0; i < N; i++) {
        const it = document.createElement("div");
        it.className = "count-item";
        it.innerHTML =
          imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") +
          `<span class="count-badge"></span>`;
        row.appendChild(it);
        items.push(it);
      }
      wrap.appendChild(row);
      host.appendChild(wrap);

      function nudgeNext() {
        const nx = items.find((x) => !x.classList.contains("counted"));
        if (nx) pointNudgeAt(nx);
        else stopNudge();
      }
      items.forEach((it) => {
        it.onclick = () => {
          if (it.classList.contains("counted")) return; // one-to-one: never double-count
          c++;
          it.classList.add("counted");
          it.querySelector(".count-badge").textContent = String(c); // Arabic running count; Hindi word spoken separately
          SwiftPAL.emit("count_tap", {
            slide_id: slide.id,
            phase: slide.phase,
            n: c,
          });
          if (c >= N) {
            stopNudge();
            SwiftPAL.emit("count_oto_complete", {
              slide_id: slide.id,
              phase: slide.phase,
              total: N,
              value: true,
              latency_ms: Date.now() - state.slideStart,
            });
            // say the LAST number, then the total; enable आगे ONLY after "कुल N" finishes
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT, () =>
              setTimeout(
                () =>
                  play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, () =>
                    setNavActive(true),
                  ),
                300,
              ),
            );
          } else {
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT); // one number word per touch
            nudgeNext();
          }
        };
      });
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (c >= N) completeSlide(true);
      };
      nudgeNext();
    },
  },

  MEET_NUMBER: {
    mount(host, slide) {
      if (slide.data && slide.data.present === "crane") {
        return btCraneMeet(host, slide);
      } // Block Town teach
      const wrap = document.createElement("div");
      wrap.className = "meet-stage number-meet";
      let objs = "";
      for (let i = 0; i < slide.data.count; i++)
        objs += imgOrEmoji(
          slide.data.object.img,
          slide.data.object.emoji,
          "cobj-img",
          "cobj-emoji",
        );
      wrap.innerHTML = `
        <div class="meet-number-box"><span class="num-glyph">${slide.data.count}</span>${fingerCount(slide.data.count, "meet-hand")}</div>
        <div class="meet-arrow">→</div>
        <div class="count-set meet-set">${objs}</div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
    },
  },

  COUNT_HOW_MANY: {
    mount(host, slide) {
      const setEl = stimulusCountSet(slide.data.count, slide.data.object);
      mountTapOptions({
        slide,
        host,
        signalName: "cardinality_first_try",
        stimulus: setEl,
        nudgeTarget: null, // nothing to re-tap here → no idle hand
        options: slide.data.options,
        columnsHint: Math.min(slide.data.options.length, 5),
        isCorrect: (opt) => opt.value === slide.data.count,
        optionRenderer: (opt) => numFingerCell(opt.value), // DUAL-CODED: the numeral (what they're learning) + a supporting finger-hand
        mastery: slide.phase === "mastery",
        // HINT = count the set FOR the child (highlight + say एक/दो/तीन + numeral on top)
        hintAction: (done) =>
          demoCountSet(setEl, slide.data.count, slide.data.numerals, done),
      });
    },
  },

  MAKE_SET: {
    mount(host, slide) {
      const N = slide.data.target,
        obj = slide.data.object;
      const wrap = document.createElement("div");
      wrap.className = "makeset-stage";
      wrap.innerHTML = `
        <div class="makeset-target"><span class="ms-label">डालो</span><span class="num-glyph">${devNumeral(slide.data.target)}</span>${imgOrEmoji(obj.img, obj.emoji, "ms-goal-obj", "ms-goal-emoji")}</div>
        <div class="makeset-frame" id="msFrame"></div>
        <button class="makeset-add" id="msAdd"><span class="ms-add-plus">＋</span>${imgOrEmoji(obj.img, obj.emoji, "ms-add-obj", "ms-add-emoji")}</button>`;
      host.appendChild(wrap);
      const frame = wrap.querySelector("#msFrame"),
        addBtn = wrap.querySelector("#msAdd");
      const numerals = slide.data.numerals || [];
      const MAXITEMS = 5; // never allow more than 5
      let c = 0;
      state.attempts = 0;
      state.locked = false;
      state.hintActive = false;
      const refreshNav = () =>
        setNavActive(!state.locked && !state.hintActive && c === N); // आगे activates ONLY at exactly N — no premature/wrong submit; child self-corrects by adding more / removing (×). Nudge on the add-button guides an idle child.
      function makeItem() {
        const it = document.createElement("div");
        it.className = "ms-item";
        it.innerHTML =
          imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") +
          `<span class="ms-del" aria-label="हटाओ">×</span>`;
        const remove = (e) => {
          if (e) e.stopPropagation();
          if (state.locked || state.hintActive) return;
          it.remove();
          c--;
          refreshNav();
        };
        // remove ONLY via the explicit × badge — tapping the object itself must NOT delete it
        // (the count tutorial teaches "tap the object to count it"; a placed apple that vanishes on tap
        //  would silently destroy the child's work)
        it.querySelector(".ms-del").onclick = remove;
        frame.appendChild(it);
        return it;
      }
      addBtn.onclick = () => {
        if (state.locked || state.hintActive) return;
        if (c >= MAXITEMS) {
          addBtn.classList.add("shake");
          setTimeout(() => addBtn.classList.remove("shake"), 420);
          return;
        } // cap at 5
        c++;
        makeItem();
        play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT); // count up as you add
        SwiftPAL.emit("make_set_add", { slide_id: slide.id, count: c });
        refreshNav();
      };
      // HINT = count what the child actually placed (highlight + say the number)
      const runHint = (after) => {
        state.hintActive = true;
        refreshNav();
        demoCount([...frame.querySelectorAll(".ms-item")], numerals, () => {
          state.hintActive = false;
          refreshNav();
          if (after) after();
        });
      };
      $("hintBtn").onclick = () => {
        if (state.locked || state.hintActive) return;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
        runHint();
      };
      // आगे = SUBMIT. correct → celebrate & advance. wrong → graduated scaffold, same as
      // everywhere: 1st = try again, 2nd = count-demo hint, 3rd = REVEAL (auto-fix to N,
      // count 1..N automatically, then move to the next slide).
      $("navBtn").onclick = () => {
        if (state.locked || state.hintActive || c !== N) return; // gated to exactly N → only the correct-set path runs (self-correcting design)
        if (c === N) {
          state.locked = true;
          refreshNav();
          SwiftPAL.emit("make_set_correct", {
            slide_id: slide.id,
            phase: slide.phase,
            value: true,
            target: N,
            attempts: state.attempts + 1,
            latency_ms: Date.now() - state.slideStart,
          });
          play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, () =>
            celebrateThenAdvance(slide, false),
          ); // standard: confetti + VO + auto-advance, no popup
          return;
        }
        state.attempts++;
        SwiftPAL.emit("answer_wrong", {
          slide_id: slide.id,
          phase: slide.phase,
          attempts: state.attempts,
          made: c,
          target: N,
        });
        const maxA =
          (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
        $("hintBtn").classList.add("show");
        if (state.attempts >= maxA) {
          // 3rd wrong → reveal: correct the set to exactly N, count it 1..N, then advance
          state.locked = true;
          state.scaffoldLevel = 3;
          refreshNav();
          while (frame.querySelectorAll(".ms-item").length > N)
            frame.querySelector(".ms-item:last-child").remove();
          while (frame.querySelectorAll(".ms-item").length < N) makeItem();
          c = N;
          SwiftPAL.emit("answer_revealed", {
            slide_id: slide.id,
            phase: slide.phase,
            attempts: state.attempts,
          });
          state.hintActive = true;
          // count the (now-correct) set 1..N, then say the total "कुल N", then advance
          demoCount([...frame.querySelectorAll(".ms-item")], numerals, () => {
            state.hintActive = false;
            play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, () =>
              setTimeout(() => completeSlide(false), 500),
            );
          });
        } else if (state.attempts === 2) {
          runHint(); // 2nd wrong → count what they made
        } else {
          // 1st wrong → try again, WITH the spoken VO (was silent)
          showBox(
            "",
            audioText(slide, "try_again") || "फिर से कोशिश करो।",
            "wrong",
            audioFor(slide, "try_again"),
            () => {},
          );
        }
      };
      setNavActive(false);
      pointNudgeAt(addBtn);
    },
  },

  COMPARE_SETS: {
    // Two visible groups, TWO picture options — the child taps the object that has MORE (or LESS).
    // No बराबर chip (lead review): equality is taught in MEET_COMPARE + produced on the see-saw, so
    // a judge question always has one clear answer between the two objects. Tap-to-answer: a wrong
    // tap buzzes + crosses + locks that card; the right one confetti-cheers + advances.
    mount(host, slide) {
      const d = slide.data;
      const stage = stimulusCompareSets(d);
      // JUDGE (test): hide the "मिलाओ" reveal button — its one-to-one reveal + leftover glow gives the
      // answer away (and on a "less" question it glows the MORE set, pointing at the WRONG option).
      // The two rows stay visible so the child still compares by eye. (Reveal stays only on MEET_COMPARE.)
      const mb = stage.querySelector(".cmp-match-btn");
      if (mb) mb.style.display = "none";
      const answer =
        d.ask === "less"
          ? d.a_count < d.b_count
            ? "a"
            : "b"
          : d.a_count > d.b_count
            ? "a"
            : "b";
      const options = [
        { kind: "a", obj: d.a_object },
        { kind: "b", obj: d.b_object },
      ];
      // (option shuffle is now centralized in mountTapOptions — no per-module reverse needed)
      mountTapOptions({
        slide,
        host,
        signalName: "compare_first_try",
        stimulus: stage,
        nudgeTarget: null,
        options,
        columnsHint: 2,
        isCorrect: (opt) => opt.kind === answer,
        optionRenderer: (opt) => {
          const cell = document.createElement("div");
          cell.innerHTML =
            imgOrEmoji(
              opt.obj.img,
              opt.obj.emoji,
              "pic-img",
              "cmp-chip-emoji",
            ) + `<span class="cmp-chip-lbl">${opt.obj.word_hi || ""}</span>`;
          return cell;
        },
        mastery: slide.phase === "mastery",
      });
    },
  },

  MEET_COMPARE: {
    // TEACH BY DOING (lead review): the child COUNTS each group by tapping its objects one-by-one
    // (running numeral + spoken एक/दो/तीन), the top group then the bottom. Then the one-to-one
    // match reveals, the leftover glows, and Swiftie EXPLAINS the outcome by name — e.g.
    // "एक सेब बच गया, सेब ज़्यादा हैं, केले कम" / "कुछ नहीं बचा, दोनों बराबर". आगे appears after.
    mount(host, slide) {
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "meet-compare";
      const stage = stimulusCompareSets({
        a_object: d.a_object,
        a_count: d.a_count,
        b_object: d.b_object,
        b_count: d.b_count,
        show_matches: false,
      });
      const mb = stage.querySelector(".cmp-match-btn");
      if (mb) mb.style.display = "none";
      const verdict = document.createElement("div");
      verdict.className = "cmp-verdict " + (d.outcome || "more");
      verdict.textContent = d.label_hi || "";
      wrap.appendChild(stage);
      wrap.appendChild(verdict);
      host.appendChild(wrap);

      state.gateNavUntilAudio = false;
      state.locked = false;
      state.ownsAudio = true;
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (state.locked) completeSlide(true);
      };

      // 🔊 replay: re-hear the teach line (and, once revealed, the explanation). autoPlayChain skips
      // count_intro/explain, so without this the header chip would be silent on teach slides.
      let revealed = false;
      state.replayAudio = () => {
        const chain = [audioFor(slide, "count_intro")];
        if (revealed) chain.push(audioFor(slide, "explain"));
        playChain(chain.filter(Boolean), 0);
      };

      const rowA = [...stage.querySelectorAll(".cmp-row.top .cobj")];
      const rowB = [...stage.querySelectorAll(".cmp-row.bot .cobj")];

      // make one row countable-by-tapping; cb fires once every item in it is counted
      function countRow(items, cb) {
        const nudgeNext = () => {
          const nx = items.find((o) => !o.classList.contains("counted"));
          if (nx) pointNudgeAt(nx);
          else stopNudge();
        };
        let n = 0;
        items.forEach((o) => {
          o.classList.add("tappable");
          o.onclick = () => {
            if (state.locked || o.classList.contains("counted")) return;
            o.classList.add("counted", "counting");
            n++;
            sfxTap();
            let cal = o.querySelector(".count-callout");
            if (!cal) {
              cal = document.createElement("span");
              cal.className = "count-callout";
              o.appendChild(cal);
            }
            cal.textContent = n;
            play("assets/Audio/vo_num_" + n + "." + AUDIO_EXT, () => {});
            if (items.every((x) => x.classList.contains("counted"))) {
              stopNudge();
              setTimeout(cb, 550);
            } else nudgeNext();
          };
        });
        nudgeNext();
      }

      // intro VO → count group A → count group B → reveal match + explain the outcome.
      // NB: uses non-autochain role names (count_intro / explain) so mountSlide's autoPlayChain
      // does NOT also fire the intro — this module owns its own audio sequence.
      play(audioFor(slide, "count_intro") || null, () => {
        countRow(rowA, () =>
          countRow(rowB, () => {
            stage._revealMatches(() => {
              verdict.classList.add("show");
              setSwMood("point");
              state.locked = true;
              revealed = true;
              setNavActive(true);
              play(audioFor(slide, "explain") || null, () => {});
            });
          }),
        );
      });
    },
  },

  MAKE_EQUAL: {
    // PRODUCE mechanic (see-saw): the left pan holds a fixed group; the child taps + जोड़ो to
    // add to the right pan (tap an added item to take it back). The beam tilts toward the heavier
    // side in real time; at equal it levels, locks, celebrates. Overshoot is enacted (invite to
    // remove), never a red ✗ — the KG "produce, don't pick" model.
    mount(host, slide) {
      const d = slide.data,
        L = d.a_count,
        fixedObj = d.a_object,
        addObj = d.b_object;
      const MAXR = d.max || Math.max(L + 2, 6);
      const wrap = document.createElement("div");
      wrap.className = "balance-stage";
      wrap.innerHTML = `
        <div class="balance">
          <div class="beam-wrap" id="beamWrap"><div class="beam"></div>
            <div class="pan pan-left"><div class="pan-grid" id="panL"></div></div>
            <div class="pan pan-right"><div class="pan-grid" id="panR"></div></div></div>
          <div class="fulcrum"></div>
        </div>
        <button class="balance-add" id="balAdd" type="button"></button>`;
      host.appendChild(wrap);
      const panL = wrap.querySelector("#panL"),
        panR = wrap.querySelector("#panR");
      const beam = wrap.querySelector("#beamWrap"),
        addBtn = wrap.querySelector("#balAdd");
      const balance = wrap.querySelector(".balance");
      addBtn.innerHTML =
        imgOrEmoji(addObj.img, addObj.emoji, "cobj-img", "cobj-emoji") +
        `<span>+ जोड़ो</span>`;
      for (let i = 0; i < L; i++) {
        const c = document.createElement("span");
        c.className = "cobj";
        c.innerHTML = imgOrEmoji(
          fixedObj.img,
          fixedObj.emoji,
          "cobj-img",
          "cobj-emoji",
        );
        panL.appendChild(c);
      }
      let right = 0;
      state.locked = false;
      state.attempts = 0;
      let tipT = 0;
      const TILT = 6,
        TMAX = 15;
      const tilt = () => {
        const diff = right - L;
        const deg = Math.max(-TMAX, Math.min(TMAX, diff * TILT));
        beam.style.transform = `translateX(-50%) rotate(${deg}deg)`;
        balance.classList.toggle("level", diff === 0 && right > 0);
      };
      const check = () => {
        if (state.locked) return;
        const diff = right - L;
        if (diff === 0 && right > 0) {
          state.locked = true;
          setNavActive(true);
          SwiftPAL.emit("make_equal_correct", {
            slide_id: slide.id,
            phase: slide.phase,
            value: true,
            count: right,
            target: L,
            attempts: state.attempts + 1,
            latency_ms: Date.now() - state.slideStart,
          });
          showBox(
            "⚖️",
            audioText(slide, "balanced") || "बराबर! दोनों बराबर हैं।",
            "correct",
            audioFor(slide, "balanced") || null,
            () => {},
          );
        } else if (diff > 0) {
          state.attempts++;
          SwiftPAL.emit("answer_wrong", {
            slide_id: slide.id,
            phase: slide.phase,
            made: right,
            target: L,
          });
          if (Date.now() - tipT > 1200) {
            tipT = Date.now();
            showBox(
              "",
              audioText(slide, "too_many") || "बहुत ज़्यादा! एक हटाओ।",
              "hint",
              audioFor(slide, "too_many"),
              () => {},
            );
          }
        }
      };
      const addItem = () => {
        const c = document.createElement("span");
        c.className = "cobj added";
        c.innerHTML = imgOrEmoji(
          addObj.img,
          addObj.emoji,
          "cobj-img",
          "cobj-emoji",
        );
        c.onclick = () => {
          if (state.locked) return;
          c.remove();
          right = Math.max(0, right - 1);
          tilt();
          check();
        };
        panR.appendChild(c);
        right++;
      };
      addBtn.onclick = () => {
        if (state.locked) return;
        if (right >= MAXR) {
          addBtn.classList.add("shake");
          setTimeout(() => addBtn.classList.remove("shake"), 400);
          return;
        }
        addItem();
        tilt();
        sfxTap();
        // count EVERY added item aloud INCLUDING the final/target one (एक, दो, तीन) — then, on the
        // last count, the "बराबर" VO follows (check runs in the count's onEnd so the number isn't cut).
        if (right <= L)
          play(
            "assets/Audio/vo_num_" + right + "." + AUDIO_EXT,
            right === L ? () => check() : () => {},
          );
        else check(); // overshoot → "एक हटाओ" hint
      };
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (state.locked) completeSlide(true);
      };
      tilt(); // START tilted toward the heavier (left) group — the see-saw is NOT level yet
      pointNudgeAt(addBtn);
    },
  },

  MEET_PATTERN: {
    // TEACH: show a repeating pattern and pulse the repeating UNIT (first data.unit_len cells) a few
    // times so the child sees "this part comes again". Nav gated on the VO, like MEET_NUMBER.
    mount(host, slide) {
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "pattern-stage";
      const lbl = document.createElement("div");
      lbl.className = "pat-unit-lbl";
      lbl.textContent = "यह हिस्सा दोहराता है 🔁";
      const row = document.createElement("div");
      row.className = "pattern-row";
      d.items.forEach((o) => {
        const c = document.createElement("div");
        c.className = "pat-cell";
        c.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji");
        row.appendChild(c);
      });
      wrap.appendChild(lbl);
      wrap.appendChild(row);
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
      const cells = [...row.children];
      let rep = 0;
      const glow = () => {
        cells.forEach((c, i) => {
          if (i < d.unit_len) c.classList.add("unit-glow");
        });
        setTimeout(
          () => cells.forEach((c) => c.classList.remove("unit-glow")),
          1100,
        );
      };
      glow();
      const t = setInterval(() => {
        if (rep++ >= 2) {
          clearInterval(t);
          return;
        }
        glow();
      }, 1700);
    },
  },

  PATTERN_BUILD: {
    // PRODUCE: a pattern with empty ghost slot(s) — at the END (extend) or in the MIDDLE (fill the
    // gap). Tap a tray item to drop it into the active slot; the correct item = data.items[slot].
    // Wrong taps bounce (enacted, no ✗). Fill every blank → complete. data:{items[],blanks[],tray[]}.
    mount(host, slide) {
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "pattern-stage";
      const row = document.createElement("div");
      row.className = "pattern-row";
      const cells = d.items.map((o, i) => {
        const c = document.createElement("div");
        if (d.blanks.includes(i)) {
          c.className = "pat-ghost";
          c.innerHTML = `<span class="qmark">?</span>`;
        } else {
          c.className = "pat-cell";
          c.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji");
        }
        row.appendChild(c);
        return c;
      });
      const tray = document.createElement("div");
      tray.className = "pattern-tray";
      d.tray.forEach((o) => {
        const t = document.createElement("div");
        t.className = "pat-tray-item";
        t._obj = o;
        t.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji");
        tray.appendChild(t);
      });
      wrap.appendChild(row);
      wrap.appendChild(tray);
      host.appendChild(wrap);
      const blanks = d.blanks.slice();
      let bi = 0,
        wrongStreak = 0,
        revealedAny = false;
      state.locked = false;
      state.attempts = 0;
      const key = (o) => o.img || o.emoji;
      const activeGhost = () => cells[blanks[bi]];
      const markActive = () => {
        cells.forEach((c) => c.classList.remove("active"));
        // idle nudge points at the ACTIVE BLANK ('?' slot = "put one here"), re-armed per blank —
        // NEVER at a tray answer; startNudge is phase-aware so it's silent in practice/mastery.
        if (bi < blanks.length) {
          activeGhost().classList.add("active");
          startNudge(slide, activeGhost());
        } else stopNudge();
      };
      const flashHint = () => {
        const want = d.items[blanks[bi]],
          g = activeGhost();
        const prev = g.innerHTML;
        g.innerHTML = imgOrEmoji(
          want.img,
          want.emoji,
          "cobj-img",
          "cobj-emoji",
        );
        g.style.opacity = ".4";
        setTimeout(() => {
          if (g.classList.contains("pat-ghost")) {
            g.innerHTML = prev;
            g.style.opacity = "";
          }
        }, 950);
      };
      const placeCorrect = () => {
        // one placement path (tap AND reveal)
        const want = d.items[blanks[bi]],
          g = activeGhost();
        g.className = "pat-cell";
        g.innerHTML = imgOrEmoji(
          want.img,
          want.emoji,
          "cobj-img",
          "cobj-emoji",
        );
        g.classList.add("unit-glow");
        setTimeout(() => g.classList.remove("unit-glow"), 700);
        bi++;
        if (bi >= blanks.length) {
          state.locked = true;
          stopNudge();
          SwiftPAL.emit("pattern_extend_correct", {
            slide_id: slide.id,
            phase: slide.phase,
            value: !revealedAny,
            attempts: state.attempts + 1,
            latency_ms: Date.now() - state.slideStart,
          });
          // engine standard: confetti + cheer + correct VO + AUTO-advance — no popup, no आगे gate.
          celebrateThenAdvance(slide, revealedAny);
        } else markActive();
      };
      markActive();
      tray.querySelectorAll(".pat-tray-item").forEach((t) => {
        t.onclick = () => {
          if (state.locked || bi >= blanks.length) return;
          stopNudge();
          const want = d.items[blanks[bi]];
          if (key(t._obj) === key(want)) {
            wrongStreak = 0;
            placeCorrect();
          } else {
            state.attempts++;
            t.classList.add("shake");
            setTimeout(() => t.classList.remove("shake"), 420);
            activeGhost().classList.add("shake");
            setTimeout(() => activeGhost().classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            $("hintBtn").classList.add("show");
            // layered ladder, standard-aligned: L1 spoken try-again (buzz + Swiftie, no popup) →
            // L2 flash the answer ghost + spoken hint → L3 reveal ceiling: DEMONSTRATE the placement.
            if (++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)) {
              revealedAny = true;
              wrongStreak = 0;
              activeGhost().classList.add("reveal-glow");
              play(
                audioFor(slide, "reveal") || audioFor(slide, "hint") || null,
                () => {},
              );
              setTimeout(() => {
                placeCorrect();
              }, 1000);
            } else if (state.attempts >= 2) {
              flashHint();
              play(audioFor(slide, "hint") || null, () => {});
            } else dragWrong(slide);
          }
        };
      });
      setNavActive(false);
      $("navBtn").onclick = () => {}; // completion is automatic now — आगे never gates a solved pattern
      $("hintBtn").onclick = () => {
        if (!state.locked && bi < blanks.length) flashHint();
      };
      // NB: the idle nudge is armed by markActive() → startNudge(activeGhost) above — it points at the
      // BLANK, phase-aware. (Bug fix: was pointNudgeAt(first tray tile) = an immediate hand on the WRONG
      // answer on most slides, and it showed even in mastery.)
    },
  },

  BUILD_TO_NUMBER: {
    // Signature produce module. data: {target, mode:'guided'|'independent', topper, friend, goal_hi,
    // skyline_done, skyline_total}. Guided = dashed blueprint, auto-completes on fill. Independent =
    // free stack + "बन गया!" serve with world-enacted feedback (short/teeter, never a ✗). Ascending-
    // pitch thunk + spoken एक/दो/… per block. Geometry via offsets (throttle-safe).
    mount(host, slide) {
      const d = slide.data,
        N = d.target,
        mode = d.mode || "independent";
      const stage = document.createElement("div");
      stage.className = "bt-stage";
      const board = document.createElement("div");
      board.className = "bt-board";
      board.innerHTML =
        `<span class="bt-numeral">${N}</span>` +
        (d.topper
          ? `<img class="bt-goalpic" src="assets/Images/${d.topper}.webp" alt="">`
          : "") +
        (d.goal_hi ? `<span class="bt-goallbl">${d.goal_hi}</span>` : "");
      const track = document.createElement("div");
      track.className = "bt-track";
      const cells = [];
      for (let i = 1; i <= N; i++) {
        const c = document.createElement("div");
        c.className = "bt-nt";
        track.appendChild(c);
        cells.push(c);
      }
      const yard = document.createElement("div");
      yard.className = "bt-yard";
      const crane = document.createElement("div");
      crane.className = "bt-crane";
      crane.innerHTML = `<img src="assets/Images/obj_crane.webp" alt="">`;
      const pile = document.createElement("div");
      pile.className = "bt-pile";
      pile.innerHTML = `<div class="bt-pile-blocks"></div><span class="bt-pile-lbl">＋ ब्लॉक</span>`;
      const pb = pile.querySelector(".bt-pile-blocks");
      for (let i = 0; i < 3; i++) {
        const b = btBlock(i + 1);
        b.style.left = i * 12 + "px";
        b.style.bottom = i * 18 + "px";
        pb.appendChild(b);
      }
      const plotwrap = document.createElement("div");
      plotwrap.className = "bt-plotwrap";
      const plot = document.createElement("div");
      plot.className = "bt-plot ground " + mode;
      plot.style.setProperty(
        "--bh",
        Math.max(20, Math.min(46, Math.floor(230 / N) - 2)) + "px",
      ); // tall towers auto-shrink to fit
      plotwrap.appendChild(plot);
      const friend = document.createElement("div");
      friend.className = "bt-friend";
      if (d.friend)
        friend.innerHTML = `<img src="assets/Images/${d.friend}.webp" alt="">`;
      yard.appendChild(crane);
      yard.appendChild(pile);
      yard.appendChild(plotwrap);
      if (d.friend) yard.appendChild(friend);
      stage.appendChild(board);
      stage.appendChild(track);
      stage.appendChild(yard);
      if (d.skyline_total)
        stage.appendChild(btSkyline(d.skyline_done || 0, d.skyline_total));
      let serveBtn = null;
      if (mode === "independent") {
        serveBtn = document.createElement("button");
        serveBtn.type = "button";
        serveBtn.className = "bt-serve";
        serveBtn.textContent = "बन गया!";
        stage.appendChild(serveBtn);
      }
      host.appendChild(stage);

      let count = 0;
      state.locked = false;
      state.attempts = 0;
      const lit = () =>
        cells.forEach((c, i) => {
          const on = i < count;
          c.classList.toggle("lit", on);
          c.textContent = on ? i + 1 : "";
        });
      const addSound = () => {
        btThunk(count);
        btDust(plot);
        play("assets/Audio/vo_num_" + count + "." + AUDIO_EXT);
      };

      function success() {
        state.locked = true;
        if (serveBtn) serveBtn.disabled = true;
        if (d.topper) {
          const t = document.createElement("div");
          t.className = "bt-topper snap";
          t.innerHTML = `<img src="assets/Images/${d.topper}.webp" alt="">`;
          plot.appendChild(t);
          if (d.topper === "top_rocket")
            setTimeout(() => t.classList.add("rocket-go"), 750);
        }
        if (d.friend) friend.classList.add("hop");
        sfxCorrect();
        burstStars();
        const lots = [...stage.querySelectorAll(".bt-bldg")];
        const nextLot = lots[d.skyline_done || 0];
        if (nextLot) setTimeout(() => nextLot.classList.add("done"), 380);
        SwiftPAL.emit("build_to_number_correct", {
          slide_id: slide.id,
          phase: slide.phase,
          value: true,
          target: N,
          attempts: state.attempts + 1,
          latency_ms: Date.now() - state.slideStart,
        });
        play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT);
        setNavActive(true);
      }

      if (mode === "guided") {
        const ghosts = [];
        for (let i = 0; i < N; i++) {
          const g = document.createElement("div");
          g.className = "bp-slot";
          plot.appendChild(g);
          ghosts.push(g);
        }
        ghosts[0].classList.add("next");
        pile.onclick = () => {
          if (state.locked) return;
          const g = ghosts.find((x) => x.classList.contains("bp-slot"));
          if (!g) {
            showBox("", "बस इतने ही चाहिए!", "hint", null, () => {});
            return;
          }
          g.className = "blk drop";
          g.style.background = BT_COLORS[count % 5];
          count++;
          lit();
          addSound();
          const nx = ghosts.find((x) => x.classList.contains("bp-slot"));
          if (nx) nx.classList.add("next");
          if (count === N) setTimeout(success, 280);
        };
      } else {
        pile.onclick = () => {
          if (state.locked) return;
          const b = btBlock(count);
          b.classList.add("drop");
          b.onclick = (e) => {
            e.stopPropagation();
            if (state.locked) return;
            b.remove();
            count--;
            lit();
          };
          plot.appendChild(b);
          count++;
          lit();
          addSound();
        };
        serveBtn.onclick = () => {
          if (state.locked) return;
          if (count === N) {
            success();
            return;
          }
          state.attempts++;
          SwiftPAL.emit("answer_wrong", {
            slide_id: slide.id,
            phase: slide.phase,
            attempts: state.attempts,
            made: count,
            target: N,
          });
          if (count < N) {
            if (d.friend) friend.classList.add("peer");
            showBox("", "थोड़े और चाहिए!", "hint", null, () => {
              if (d.friend) friend.classList.remove("peer");
            });
          } else {
            const bs = [...plot.querySelectorAll(".blk")];
            const top = bs[bs.length - 1];
            if (top) {
              top.classList.add("wobble");
              setTimeout(() => top.classList.remove("wobble"), 520);
            }
            showBox("", "अरे! एक ब्लॉक हटाओ।", "hint", null, () => {});
          }
        };
      }
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (state.locked) completeSlide(true);
      };
      pointNudgeAt(pile);
    },
  },

  MAKE_NUMBER: {
    // produce-the-numeral dial (grafted from Firefly Valley). A set of N built blocks; ＋/− dials a
    // 1–10 numeral; wrong is inert (build dim), exact match ignites the build + snaps its topper.
    mount(host, slide) {
      const d = slide.data,
        N = d.count;
      const stage = document.createElement("div");
      stage.className = "bt-stage";
      if (d.prompt2_hi) {
        const lbl = document.createElement("div");
        lbl.className = "pat-unit-lbl";
        lbl.textContent = d.prompt2_hi;
        stage.appendChild(lbl);
      }
      const yard = document.createElement("div");
      yard.className = "bt-yard";
      const plotwrap = document.createElement("div");
      plotwrap.className = "bt-plotwrap";
      const plot = document.createElement("div");
      plot.className = "bt-plot ground";
      plot.style.filter = "grayscale(.35) brightness(.95)";
      plot.style.setProperty(
        "--bh",
        Math.max(20, Math.min(46, Math.floor(230 / N) - 2)) + "px",
      );
      for (let i = 0; i < N; i++) {
        plot.appendChild(btBlock(i));
      }
      plotwrap.appendChild(plot);
      yard.appendChild(plotwrap);
      const dial = document.createElement("div");
      dial.className = "bt-dial";
      dial.innerHTML = `<button class="bt-dial-btn" data-d="-1" type="button">−</button><div class="bt-dial-val">1</div><button class="bt-dial-btn" data-d="1" type="button">＋</button>`;
      stage.appendChild(yard);
      stage.appendChild(dial);
      host.appendChild(stage);
      let val = 1;
      state.locked = false;
      const valEl = dial.querySelector(".bt-dial-val");
      const check = () => {
        if (val === N && !state.locked) {
          state.locked = true;
          valEl.classList.add("match");
          plot.style.filter = "";
          if (d.topper) {
            const t = document.createElement("div");
            t.className = "bt-topper snap";
            t.innerHTML = `<img src="assets/Images/${d.topper}.webp" alt="">`;
            plot.appendChild(t);
          }
          sfxCorrect();
          burstStars();
          play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT);
          SwiftPAL.emit("make_number_correct", {
            slide_id: slide.id,
            phase: slide.phase,
            value: true,
            count: N,
            latency_ms: Date.now() - state.slideStart,
          });
          setNavActive(true);
        }
      };
      dial.querySelectorAll(".bt-dial-btn").forEach(
        (btn) =>
          (btn.onclick = () => {
            if (state.locked) return;
            val = Math.max(1, Math.min(10, val + parseInt(btn.dataset.d, 10)));
            valEl.textContent = val;
            sfxTap();
            check();
          }),
      );
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (state.locked) completeSlide(true);
      };
    },
  },

  TAP_LETTER_BY_NAME: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "letter_name_first_try",
        stimulus: null,
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter),
      });
    },
  },

  TAP_LETTER_BY_SOUND: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "letter_sound_first_try",
        stimulus: (() => {
          const el = document.createElement("div");
          el.className = "stimulus-pic";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">ध्वनि सुनो</span>`;
          el.style.cursor = "pointer";
          el.onclick = () => {
            state.audioReplays++;
            play(audioFor(slide, "phoneme") || null);
          };
          return el;
        })(),
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter),
      });
    },
  },

  TAP_PICTURE_BY_LETTER: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "letter_image_match_first_try",
        stimulus: stimulusLetter(slide.data.target_letter),
        options: slide.data.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.picture, opt.emoji, opt.img),
      });
    },
  },

  TAP_LETTER_BY_PICTURE: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "image_letter_match_first_try",
        stimulus: stimulusPic(
          slide.data.picture,
          slide.data.emoji,
          slide.data.img,
        ),
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter),
      });
    },
  },

  ODD_ONE_OUT: {
    mount(host, slide) {
      const sig =
        (slide.signals &&
          slide.signals.on_complete &&
          slide.signals.on_complete[0]) ||
        "letter_recognise_first_try";
      const useShape = slide.data.options.some((o) => o.shape);
      const usePic = slide.data.options.some(
        (o) => o.picture || o.word_hi || o.img,
      );
      mountTapOptions({
        slide,
        host,
        signalName: sig,
        stimulus: null,
        options: slide.data.options,
        columnsHint: 4,
        isCorrect: (opt) => opt.is_odd === true,
        optionRenderer: (opt) =>
          useShape
            ? shapeCell(opt)
            : usePic
              ? pictureCell(opt.word_hi || opt.picture, opt.emoji, opt.img)
              : letterCell(opt.letter),
        mastery: slide.phase === "mastery",
      });
    },
  },

  TAP_GENDER: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "gender_match_first_try",
        stimulus: stimulusPic(
          slide.data.noun.word_hi,
          slide.data.noun.emoji,
          slide.data.noun.img,
        ),
        options: slide.data.options,
        columnsHint: 2,
        isCorrect: (opt) => opt.gender === slide.data.target_gender,
        optionRenderer: (opt) => genderLabelCell(opt.label, opt.gender),
        mastery: slide.phase === "mastery",
      });
    },
  },

  TAP_PICTURE_BY_GENDER: {
    mount(host, slide) {
      mountTapOptions({
        slide,
        host,
        signalName: "gender_match_first_try",
        stimulus: stimulusGender(slide.data.label, slide.data.target_gender),
        options: slide.data.options,
        // tap-to-answer needs ONE unambiguous key — author marks the single intended picture
        // with correct:true (matches every other TAP_* module). The old `|| gender===target`
        // fallback silently accepted any same-gender distractor, defeating buzz+✗+lock.
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery",
      });
    },
  },

  GENDER_INTRO: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "gender-cats";
      const cats = slide.data.categories;
      const tapped = new Set();
      cats.forEach((cat) => {
        const card = document.createElement("div");
        card.className = "gender-cat " + (cat.gender === "F" ? "fem" : "masc");
        card.innerHTML =
          `<div class="cat-title">${cat.label}</div>` +
          imgOrEmoji(cat.anchor.img, cat.anchor.emoji, "cat-pic", "cat-emoji") +
          `<div class="cat-word">${cat.anchor.word_hi}</div>`;
        card.onclick = () => {
          card.classList.add("played");
          playChain(
            [
              "assets/Audio/" + cat.label_audio + "." + AUDIO_EXT,
              "assets/Audio/" + cat.name_audio + "." + AUDIO_EXT,
            ],
            0,
          );
          tapped.add(cat.gender);
          SwiftPAL.emit("gender_intro_tap", {
            slide_id: slide.id,
            gender: cat.gender,
          });
          if (tapped.size >= cats.length) {
            stopNudge();
            setNavActive(true);
          }
        };
        wrap.appendChild(card);
      });
      host.appendChild(wrap);
      state.gateNavUntilAudio = true; // nav unlocks after the concept VO
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
    },
  },

  MEET_GENDER: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "meet-gender";
      const n = slide.data.noun;
      wrap.innerHTML =
        `<div class="meet-pic-box">${imgOrEmoji(n.img, n.emoji, "pic-img", "pic-emoji")}<span class="pic-label">${n.word_hi}</span></div>` +
        `<div class="meet-arrow">→</div>` +
        `<div class="gender-badge${slide.data.gender === "F" ? " fem" : ""}">${slide.data.label}</div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true; // nav unlocks after the model VO
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
    },
  },

  /* MEET_GENDER_PAIR (H11 L03 लिंग-रूप बदलाव) — ADDITIVE (r4l); no existing module touched. Teaches the
     पुल्लिंग→स्त्रीलिंग FORM CHANGE by doing (not just gender classification): shows the masculine noun
     (pic+word) → the feminine noun (pic+word) with the ending change badged (आ→ई / +नी / irregular); the
     child taps EACH card to hear its word, then Swiftie explains the change and आगे unlocks. Mixing the
     change types across slides counters the "one ending-rule fits all" misconception. teach family (no ✗).
     data:{ masc:{word_hi,img,emoji,audio}, fem:{word_hi,img,emoji,audio}, change_hi }; audio (ownsAudio, non-autochain): prompt (spoken on mount), explain (after both taps). */
  MEET_GENDER_PAIR: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "meet-gender mgp";
      const build = (item, cls) => {
        const c = document.createElement("div");
        c.className = "meet-pic-box mgp-card " + cls + " tappable";
        c.innerHTML =
          imgOrEmoji(item.img, item.emoji, "pic-img", "pic-emoji") +
          `<span class="pic-label">${item.word_hi}</span>`;
        return c;
      };
      const mCard = build(d.masc, "masc");
      const arrow = document.createElement("div");
      arrow.className = "meet-arrow mgp-arrow";
      arrow.innerHTML =
        `<span class="mgp-ar">→</span>` +
        (d.change_hi ? `<span class="mgp-change">${d.change_hi}</span>` : "");
      const fCard = build(d.fem, "fem");
      wrap.appendChild(mCard);
      wrap.appendChild(arrow);
      wrap.appendChild(fCard);
      host.appendChild(wrap);

      state.ownsAudio = true;
      state.locked = false;
      setNavActive(false);
      state.replayAudio = () =>
        playChain(
          [audioFor(slide, "prompt"), audioFor(slide, "explain")].filter(
            Boolean,
          ),
          0,
          () => {},
        );
      const clip = (item) =>
        item.audio ? "assets/Audio/" + item.audio + "." + AUDIO_EXT : null;
      const cards = [
        [mCard, d.masc],
        [fCard, d.fem],
      ];
      const nudgeNext = () => {
        const nx = cards.find(([c]) => !c.classList.contains("said"));
        if (nx) pointNudgeAt(nx[0]);
        else stopNudge();
      };
      let said = 0;
      cards.forEach(([card, item]) => {
        card.onclick = () => {
          if (state.locked) return;
          if (card.classList.contains("said")) {
            play(clip(item));
            return;
          }
          card.classList.add("said", "reveal-glow");
          setTimeout(() => card.classList.remove("reveal-glow"), 500);
          sfxTap();
          setSwMood("point");
          said++;
          play(clip(item), () => {
            if (said >= 2) {
              stopNudge();
              state.locked = true;
              setSwMood("happy");
              play(audioFor(slide, "explain") || null, () =>
                setNavActive(true),
              );
            } else nudgeNext();
          });
        };
      });
      $("navBtn").onclick = () => {
        if (state.locked) completeSlide(true);
      };
      playChain([audioFor(slide, "prompt")].filter(Boolean), 0, () =>
        nudgeNext(),
      );
    },
  },

  SORT_GENDER: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "sort-stage";
      const binsRow = document.createElement("div");
      binsRow.className = "sort-bins";
      slide.data.bins.forEach((b) => {
        const bin = document.createElement("div");
        bin.className = "sort-bin dd-zone" + (b.gender === "F" ? " fem" : ""); // dd-zone → drop detection
        bin.dataset.gender = b.gender;
        bin.innerHTML = `<div class="bin-title">${b.label}</div><div class="bin-items"></div>`;
        binsRow.appendChild(bin);
      });
      const tray = document.createElement("div");
      tray.className = "sort-tray";
      const items = slide.data.items.slice().sort(() => Math.random() - 0.5);
      items.forEach((it) => {
        const t = document.createElement("div");
        t.className = "sort-item";
        t.dataset.gender = it.gender;
        t.innerHTML =
          imgOrEmoji(it.img, it.emoji, "img", "emoji") +
          `<span class="lbl">${it.word_hi}</span>`;
        tray.appendChild(t);
      });
      wrap.appendChild(binsRow);
      wrap.appendChild(tray);
      host.appendChild(wrap);

      state.attempts = 0;
      state.locked = false;
      let placed = 0;
      const need = slide.data.items.length;
      [...tray.children].forEach((tile) => {
        makeDraggable(tile, (zone, t) => {
          const bin = zone.closest(".sort-bin");
          if (!bin) return;
          state.attempts++;
          if (bin.dataset.gender === t.dataset.gender) {
            t.classList.add("snapped");
            bin.querySelector(".bin-items").appendChild(t);
            placed++;
            SwiftPAL.emit("gender_sort_item", {
              slide_id: slide.id,
              gender: t.dataset.gender,
              attempts: state.attempts,
            });
            if (placed === need) {
              state.locked = true;
              SwiftPAL.emit("gender_sort_correct", {
                slide_id: slide.id,
                phase: slide.phase,
                value: true,
                attempts: state.attempts,
                latency_ms: Date.now() - state.slideStart,
              });
              setTimeout(() => celebrateThenAdvance(slide, false), 250); // standard: confetti + VO + auto-advance, no popup
            }
          } else {
            bin.classList.add("hover");
            bin.style.borderColor = "var(--wrong)";
            setTimeout(() => {
              bin.classList.remove("hover");
              bin.style.borderColor = "";
            }, 500);
            dragWrong(slide); // buzz + Swiftie + spoken try_again (pre-readers need the spoken recovery)
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
          }
        });
      });
    },
  },

  MATCH_GENDER_PAIRS: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "dd-stage";
      const zoneRow = document.createElement("div");
      zoneRow.className = "dd-row";
      const zones = slide.data.pairs.slice().sort(() => Math.random() - 0.5);
      zones.forEach((p) => {
        const z = document.createElement("div");
        z.className = "dd-zone";
        z.dataset.accept = p.id;
        z.innerHTML =
          imgOrEmoji(p.f.img, p.f.emoji, "zone-img", "zone-emoji") +
          `<span class="zone-lbl">${p.f.word_hi}</span>`;
        zoneRow.appendChild(z);
      });
      const tileRow = document.createElement("div");
      tileRow.className = "dd-row";
      tileRow.style.marginTop = "34px";
      const tiles = slide.data.pairs.slice().sort(() => Math.random() - 0.5);
      tiles.forEach((p) => {
        const t = document.createElement("div");
        t.className = "dd-tile pic-tile";
        t.dataset.pairId = p.id;
        t.innerHTML =
          imgOrEmoji(p.m.img, p.m.emoji, "zone-img", "zone-emoji") +
          `<span class="zone-lbl">${p.m.word_hi}</span>`;
        tileRow.appendChild(t);
      });
      wrap.appendChild(zoneRow);
      wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0;
      state.locked = false;
      let filled = 0,
        wrongStreak = 0,
        revealed = false;
      const need = slide.data.pairs.length;
      const settle = (zone, t) => {
        // the one correct-placement path (drop AND reveal)
        zone.classList.add("filled", "correct");
        // grey the matched masculine tile in place (pictures don't badge well)
        t.classList.add("matched");
        t.style.transform = "";
        filled++;
        if (filled === need) {
          state.locked = true;
          setTimeout(() => celebrateThenAdvance(slide, revealed), 250);
        }
      };
      // A8 reveal ceiling: after max consecutive misses, DEMONSTRATE one pair (pulse + auto-settle) so
      // the child is guided forward instead of dead-ending; run counts success=false via `revealed`.
      const revealOne = () => {
        const zone = [...zoneRow.children].find(
          (z) => !z.classList.contains("filled"),
        );
        if (!zone) return;
        const t = [...tileRow.children].find(
          (x) =>
            !x.classList.contains("matched") &&
            x.dataset.pairId === zone.dataset.accept,
        );
        if (!t) return;
        revealed = true;
        wrongStreak = 0;
        zone.classList.add("reveal-glow");
        t.classList.add("reveal-glow");
        play(audioFor(slide, "reveal") || null, () => {});
        setTimeout(() => {
          zone.classList.remove("reveal-glow");
          t.classList.remove("reveal-glow");
          settle(zone, t);
        }, 1000);
      };
      [...tileRow.children].forEach((tile) => {
        makeDraggable(tile, (zone, t) => {
          if (state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          if (zone.dataset.accept === t.dataset.pairId) {
            wrongStreak = 0;
            SwiftPAL.emit("gender_pair_match", {
              slide_id: slide.id,
              phase: slide.phase,
              value: true,
              pair: t.dataset.pairId,
              attempts: state.attempts,
            });
            settle(zone, t);
          } else {
            zone.classList.add("filled", "wrong");
            setTimeout(() => zone.classList.remove("filled", "wrong"), 600);
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            if (++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3))
              revealOne();
          }
        });
      });
    },
  },

  MATCH_DRAG_1: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "dd-stage";
      // zone (target picture)
      const zoneRow = document.createElement("div");
      zoneRow.className = "dd-row";
      const zone = document.createElement("div");
      zone.className = "dd-zone";
      zone.innerHTML =
        imgOrEmoji(
          slide.data.target.img,
          slide.data.target.emoji,
          "zone-img",
          "zone-emoji",
        ) + `<span class="zone-lbl">${slide.data.target.picture || ""}</span>`;
      zone.dataset.accept = slide.data.letter.letter;
      zoneRow.appendChild(zone);
      // tile
      const tileRow = document.createElement("div");
      tileRow.className = "dd-row";
      tileRow.style.marginTop = "30px";
      const tile = document.createElement("div");
      tile.className = "dd-tile";
      tile.innerHTML = `<span class="ink-glyph">${slide.data.letter.letter}</span>`;
      tileRow.appendChild(tile);
      wrap.appendChild(zoneRow);
      wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0;
      state.locked = false;
      makeDraggable(tile, (zone, t) => {
        state.attempts++;
        const ok = zone.dataset.accept === t.textContent.trim();
        if (ok) {
          zone.classList.add("filled", "correct");
          // snap tile into zone (badge is small — drop the ink-centering transform)
          t.classList.add("snapped");
          t.querySelector(".ink-glyph")?.style.removeProperty("transform");
          zone.appendChild(t);
          state.locked = true;
          SwiftPAL.emit("letter_image_match_first_try", {
            slide_id: slide.id,
            phase: slide.phase,
            value: true,
            first_try: state.attempts === 1,
            attempts: state.attempts,
            latency_ms: Date.now() - state.slideStart,
          });
          celebrateThenAdvance(slide, false);
        } else {
          zone.classList.add("filled", "wrong");
          setTimeout(() => zone.classList.remove("filled", "wrong"), 600);
          dragWrong(slide);
          SwiftPAL.emit("answer_wrong", {
            slide_id: slide.id,
            phase: slide.phase,
            attempts: state.attempts,
          });
          if (state.attempts >= (CARD.scaffold_rules.max_attempts || 3)) {
            state.locked = true;
            // reveal = DEMONSTRATE, don't just tell: snap the letter into its picture (dimmed pulse)
            // with the spoken reveal line, then move on as success=false.
            showBox(
              "",
              audioText(slide, "reveal") || "कोई बात नहीं! इसे यहाँ रखो।",
              "reveal",
              audioFor(slide, "reveal"),
              () => {},
            );
            setTimeout(() => {
              zone.classList.add("filled", "correct", "reveal-glow");
              t.classList.add("snapped");
              t.querySelector(".ink-glyph")?.style.removeProperty("transform");
              zone.appendChild(t);
              setTimeout(() => completeSlide(false), 1300);
            }, 900);
          }
        }
      });
    },
  },

  MATCH_DRAG_N: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "dd-stage";
      // word-mode (labels, r4g): multi-char tiles (whole words) need wider, auto-size tiles so a word
      // like कुर्सी doesn't overflow the 104px letter box. Single-letter games are unaffected.
      if (
        (slide.data.pairs || []).some((p) => String(p.letter || "").length > 1)
      )
        wrap.classList.add("dd-words");
      const zoneRow = document.createElement("div");
      zoneRow.className = "dd-row";
      // shuffle zones so order ≠ tile order
      const zones = slide.data.pairs.slice().sort(() => Math.random() - 0.5);
      zones.forEach((p) => {
        const z = document.createElement("div");
        z.className = "dd-zone";
        z.innerHTML =
          imgOrEmoji(p.img, p.emoji, "zone-img", "zone-emoji") +
          `<span class="zone-lbl">${p.picture || ""}</span>`;
        z.dataset.accept = p.letter;
        zoneRow.appendChild(z);
      });
      const tileRow = document.createElement("div");
      tileRow.className = "dd-row";
      tileRow.style.marginTop = "30px";
      const tiles = slide.data.pairs.slice().sort(() => Math.random() - 0.5);
      tiles.forEach((p) => {
        const t = document.createElement("div");
        t.className = "dd-tile";
        t.innerHTML = `<span class="ink-glyph">${p.letter}</span>`;
        tileRow.appendChild(t);
      });
      wrap.appendChild(zoneRow);
      wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0;
      state.locked = false;
      let filled = 0,
        wrongStreak = 0,
        revealed = false;
      const need = slide.data.pairs.length;
      const settle = (zone, t) => {
        // one correct-placement path (drop AND reveal)
        zone.classList.add("filled", "correct");
        t.classList.add("snapped");
        t.querySelector(".ink-glyph")?.style.removeProperty("transform");
        zone.appendChild(t);
        filled++;
        if (filled === need) {
          state.locked = true;
          setTimeout(() => celebrateThenAdvance(slide, revealed), 250);
        }
      };
      // A8 reveal ceiling: after max consecutive misses, demonstrate one letter→picture match.
      const revealOne = () => {
        const zone = [...zoneRow.children].find(
          (z) => !z.classList.contains("filled"),
        );
        if (!zone) return;
        const t = [...tileRow.children].find(
          (x) =>
            !x.classList.contains("snapped") &&
            x.textContent.trim() === zone.dataset.accept,
        );
        if (!t) return;
        revealed = true;
        wrongStreak = 0;
        zone.classList.add("reveal-glow");
        t.classList.add("reveal-glow");
        play(audioFor(slide, "reveal") || null, () => {});
        setTimeout(() => {
          zone.classList.remove("reveal-glow");
          t.classList.remove("reveal-glow");
          settle(zone, t);
        }, 1000);
      };
      [...tileRow.children].forEach((tile) => {
        makeDraggable(tile, (zone, t) => {
          if (state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          const ok = zone.dataset.accept === t.textContent.trim();
          if (ok) {
            wrongStreak = 0;
            SwiftPAL.emit("letter_image_match_first_try", {
              slide_id: slide.id,
              phase: slide.phase,
              value: true,
              letter: t.textContent,
              attempts: state.attempts,
            });
            settle(zone, t);
          } else {
            zone.classList.add("filled", "wrong");
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            setTimeout(() => zone.classList.remove("filled", "wrong"), 600);
            if (++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3))
              revealOne();
          }
        });
      });
    },
  },

  SEQUENCE_DRAG: {
    mount(host, slide) {
      const wrap = document.createElement("div");
      wrap.className = "dd-stage";
      // word-mode (SENTENCE ordering, r4b): multi-char tiles (whole words) need wider, wrapping
      // tiles + slots so they don't overflow the letter-sized 104px box. Single-letter games are
      // unaffected (all tiles length 1 → no class).
      if (
        (slide.data.tiles || []).some((t) => String(t.letter || "").length > 1)
      )
        wrap.classList.add("seq-words");
      // slots row
      const slots = document.createElement("div");
      slots.className = "seq-slots";
      slide.data.correct_order.forEach((L, i) => {
        const sl = document.createElement("div");
        sl.className = "seq-slot";
        sl.dataset.accept = L;
        sl.dataset.idx = String(i);
        sl.classList.add("dd-zone"); // reuse drop logic
        sl.innerHTML = `<span class="ordinal">${i + 1}</span>`;
        slots.appendChild(sl);
      });
      const tileRow = document.createElement("div");
      tileRow.className = "dd-row";
      tileRow.style.marginTop = "40px";
      slide.data.tiles.forEach((t) => {
        const tl = document.createElement("div");
        tl.className = "dd-tile";
        tl.innerHTML = `<span class="ink-glyph">${t.letter}</span>`;
        tileRow.appendChild(tl);
      });
      wrap.appendChild(slots);
      wrap.appendChild(tileRow);
      host.appendChild(wrap);

      let placed = 0,
        wrongStreak = 0,
        revealed = false;
      const need = slide.data.correct_order.length;
      state.attempts = 0;
      state.locked = false;
      const settle = (zone, t) => {
        // one correct-placement path (drop AND reveal)
        zone.classList.remove("dd-zone");
        zone.classList.add("filled", "correct");
        zone.innerHTML = `<span class="ordinal">${parseInt(zone.dataset.idx, 10) + 1}</span><span class="ink-glyph">${t.textContent.trim()}</span>`;
        centerInkGlyph(zone.querySelector(".ink-glyph"));
        t.remove();
        placed++;
        if (placed === need) {
          state.locked = true;
          SwiftPAL.emit("letter_sequence_correct", {
            slide_id: slide.id,
            phase: slide.phase,
            value: !revealed,
            attempts: state.attempts,
            latency_ms: Date.now() - state.slideStart,
          });
          setTimeout(() => celebrateThenAdvance(slide, revealed), 250);
        }
      };
      // A8 reveal ceiling: after max consecutive misses, demonstrate the NEXT slot in the order.
      const revealOne = () => {
        const zone = [...slots.children].find(
          (z) => !z.classList.contains("filled"),
        );
        if (!zone) return;
        const t = [...tileRow.children].find(
          (x) => x.textContent.trim() === zone.dataset.accept,
        );
        if (!t) return;
        revealed = true;
        wrongStreak = 0;
        zone.classList.add("reveal-glow");
        t.classList.add("reveal-glow");
        play(audioFor(slide, "reveal") || null, () => {});
        setTimeout(() => {
          zone.classList.remove("reveal-glow");
          settle(zone, t);
        }, 1000);
      };
      [...tileRow.children].forEach((tile) => {
        makeDraggable(tile, (zone, t) => {
          if (state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          const ok = zone.dataset.accept === t.textContent.trim();
          if (ok) {
            wrongStreak = 0;
            settle(zone, t);
          } else {
            zone.classList.add("wrong");
            setTimeout(() => zone.classList.remove("wrong"), 600);
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            if (++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3))
              revealOne();
          }
        });
      });
    },
  },

  MASTERY_SILENT_PICK: {
    mount(host, slide) {
      const mode = slide.data.mode;
      let stimulus = null,
        options = null,
        isCorrect = null,
        optionRenderer = null;
      if (mode === "sound_to_letter") {
        stimulus = (() => {
          const el = document.createElement("div");
          el.className = "stimulus-pic";
          el.style.cursor = "pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">ध्वनि सुनो</span>`;
          el.onclick = () => {
            state.audioReplays++;
            play(audioFor(slide, "phoneme") || null);
          };
          return el;
        })();
        options = slide.data.options;
        isCorrect = (opt) => opt.letter === slide.data.target;
        optionRenderer = (opt) => letterCell(opt.letter);
      } else if (mode === "picture_to_letter") {
        stimulus = stimulusPic(
          slide.data.picture,
          slide.data.emoji,
          slide.data.img,
        );
        options = slide.data.options;
        isCorrect = (opt) => opt.letter === slide.data.target;
        optionRenderer = (opt) => letterCell(opt.letter);
      } else if (mode === "name_to_shape") {
        stimulus = (() => {
          const el = document.createElement("div");
          el.className = "stimulus-pic";
          el.style.cursor = "pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">${slide.data.name || "नाम सुनो"}</span>`;
          el.onclick = () => {
            state.audioReplays++;
            play(audioFor(slide, "shape_name") || null);
          };
          return el;
        })();
        options = slide.data.options;
        isCorrect = (opt) => opt.shape === slide.data.target;
        optionRenderer = (opt) => shapeCell(opt);
      } else if (mode === "object_to_shape") {
        stimulus = stimulusPic(
          slide.data.object_hi,
          slide.data.object_emoji,
          slide.data.object_img,
        );
        options = slide.data.options;
        isCorrect = (opt) => opt.shape === slide.data.target;
        optionRenderer = (opt) => shapeCell(opt);
      } else if (mode === "shape_to_object") {
        stimulus = stimulusShape({
          shape: slide.data.shape,
          color: slide.data.color,
          rotate: slide.data.rotate,
        });
        options = slide.data.options;
        isCorrect = (opt) => opt.correct === true;
        optionRenderer = (opt) =>
          pictureCell(opt.object_hi, opt.object_emoji, opt.object_img);
      } else {
        // letter_to_picture
        stimulus = stimulusLetter(slide.data.letter);
        options = slide.data.options;
        isCorrect = (opt) => opt.correct === true;
        optionRenderer = (opt) => pictureCell(opt.picture, opt.emoji, opt.img);
      }
      // SAME scaffold as the rest of the lesson — hint button after 1st wrong,
      // correct/incorrect feedback popups, reveal-on-3rd-wrong. Not silent.
      // `mastery:true` keeps the mastery_score tracking (first-try = hit).
      mountTapOptions({
        slide,
        host,
        signalName: "mastery_item",
        stimulus,
        options,
        isCorrect,
        optionRenderer,
        mastery: true,
      });
    },
  },

  STORY_SCENE: {
    // TEACH: one picture-story beat. Scene image fills the frame; narration VO plays on mount;
    // slow Ken-Burns pan keeps it alive for a pre-reader. Chain several in order for the story.
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "story-scene";
      const fb = String(d.emoji || "📖").replace(/'/g, "");
      wrap.innerHTML =
        '<div class="story-frame">' +
        '<img class="story-img" src="assets/Images/' +
        d.image_id +
        "." +
        IMG_EXT +
        '" alt="' +
        (d.alt_hi || "") +
        '" ' +
        "onerror=\"var s=document.createElement('span');s.className='story-fallback';s.textContent='" +
        fb +
        "';this.replaceWith(s);\"/>" +
        "</div>" +
        (d.caption_hi
          ? '<div class="story-caption">' + d.caption_hi + "</div>"
          : "");
      host.appendChild(wrap);
      state.ownsAudio = true;
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
      state.replayAudio = () => {
        play(audioFor(slide, "narration") || null, () => {});
      };
      setSwMood("talk");
      let _armed = false;
      const _armNav = () => {
        if (_armed) return;
        _armed = true;
        setNavActive(true);
        setSwMood("point");
      };
      play(audioFor(slide, "narration") || null, _armNav);
      setTimeout(_armNav, 30000); // watchdog: nav always eventually opens if VO buffers slowly
    },
  },

  /* STORY_READ_PAGE (H04 L02 चित्र-संकेत की सहायता से वाक्य पठन) — ADDITIVE (r4m); no existing module
     touched. A picture CUE + the sentence as tappable word chips + a "पूरा पढ़िए" whole-read button:
     the CHILD reads (taps each word to hear it), then plays the whole sentence; आगे gates until the
     sentence has been read once. Unlike STORY_SCENE (narrated TO the child) this is the child reading
     WITH picture support — the faithful "चित्र-संकेत" reading beat. data:{image_id, alt_hi, emoji,
     words:[{text,audio}], whole_audio}; audio: prompt (instruction, autoplayed on mount), explain
     (optional teach line played after the whole-read, before आगे unlocks). */
  STORY_READ_PAGE: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "story-read";
      const pic = document.createElement("div");
      pic.className = "story-read-pic";
      pic.innerHTML = imgOrEmoji(d.image_id, d.emoji, "srp-img", "srp-emoji");
      const strip = document.createElement("div");
      strip.className = "sentence-strip srp-strip";
      (d.words || []).forEach((w) => {
        const chip = document.createElement("div");
        chip.className = "sentence-word tappable";
        chip.innerHTML = `<span class="sw-text ink-glyph">${w.text}</span>`;
        chip.onclick = () => {
          chip.classList.add("said");
          state.audioReplays++;
          if (w.audio) play("assets/Audio/" + w.audio + "." + AUDIO_EXT);
        };
        strip.appendChild(chip);
      });
      const readBtn = document.createElement("button");
      readBtn.className = "read-whole-btn";
      readBtn.innerHTML = `🔊 पूरा पढ़िए`;
      const wholeSrc = d.whole_audio
        ? "assets/Audio/" + d.whole_audio + "." + AUDIO_EXT
        : null;
      readBtn.onclick = () => {
        if (readBtn.classList.contains("playing")) return;
        state.audioReplays++;
        readBtn.classList.add("playing");
        stopNudge();
        strip
          .querySelectorAll(".sentence-word")
          .forEach((c) => c.classList.add("said"));
        play(wholeSrc, () => {
          readBtn.classList.remove("playing");
          readBtn.classList.add("done");
          setSwMood("happy");
          const ex = audioFor(slide, "explain");
          if (ex) play(ex, () => setNavActive(true));
          else setNavActive(true);
        });
      };
      wrap.appendChild(pic);
      wrap.appendChild(strip);
      wrap.appendChild(readBtn);
      host.appendChild(wrap);
      state.replayAudio = () => play(wholeSrc, () => {});
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (!$("navBtn").disabled) completeSlide(true);
      };
      setTimeout(() => pointNudgeAt(readBtn), 500);
    },
  },

  STORY_QUESTION: {
    // TEST: a comprehension question after story beats. A recall thumb (visual anchor) + 🔊 chip
    // form the stimulus; options are 2–3 picture chips. Tap-to-answer feedback is inherited from
    // mountTapOptions. Recall thumb is a CUE, hidden at mastery / when data.hide_recall so the
    // answer isn't leaked by thumb-reading.
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "story-q-stim";
      stim.style.cursor = "pointer";
      const hideRecall = slide.phase === "mastery" || d.hide_recall === true;
      const thumb =
        !hideRecall && d.recall_image_id
          ? '<img class="story-q-thumb" src="assets/Images/' +
            d.recall_image_id +
            "." +
            IMG_EXT +
            '" alt="" ' +
            "onerror=\"this.style.display='none';\"/>"
          : "";
      stim.innerHTML =
        thumb +
        '<span class="story-q-listen"><span class="emoji">🔊</span>' +
        '<span class="lbl">' +
        (d.stim_hi || "प्रश्न सुनो") +
        "</span></span>";
      stim.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "story_question_first_try",
        stimulus: stim,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => {
          const cell = document.createElement("div");
          cell.innerHTML =
            imgOrEmoji(
              opt.img,
              opt.emoji,
              "story-q-opt-img",
              "story-q-opt-emoji",
            ) +
            (opt.label_hi
              ? '<span class="story-q-opt-label">' + opt.label_hi + "</span>"
              : "");
          return cell;
        },
        mastery: d.mastery === true,
        columnsHint: (d.options && d.options.length) <= 2 ? 2 : 3,
      });
    },
  },

  TAP_IN_SCENE: {
    // "Tap the thing in the picture" — a PRODUCE-style comprehension mechanic (NOT an MCQ). A story
    // scene fills the frame; the child taps the target region(s) (e.g. the monkeys who took the caps).
    // A correct hotspot → confetti + advance; a miss → soft buzz + try_again VO; after a few idle
    // seconds the target gently pulses (hint). Data: {image_id, alt_hi, prompt, hotspots:[{x,y,w,h,
    // correct}] (as % of the frame), audio:{prompt,correct,try_again}}. Reusable for any "find X".
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "tis-scene";
      const frame = document.createElement("div");
      frame.className = "tis-frame";
      const img = document.createElement("img");
      img.className = "tis-img";
      img.src = "assets/Images/" + d.image_id + "." + IMG_EXT;
      img.alt = d.alt_hi || "";
      frame.appendChild(img);
      let done = false;
      let sceneAttempts = 0;
      const miss = () => {
        if (done || isPlaying || state.hintActive) return;
        sceneAttempts++;
        state.attempts = sceneAttempts;
        SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: sceneAttempts });
        sfxWrongSoft();
        setSwMood("tryagain");
        if (sceneAttempts >= (CARD.scaffold_rules.max_attempts || 3)) {
          frame.querySelectorAll(".tis-hot").forEach((el) => {
            if (el.classList.contains("correct-hot")) {
              el.classList.add("reveal-hold");
              if (slide.phase === "guided") pointNudgeAt(el);
            } else el.classList.add("faded");
          });
          SwiftPAL.emit("answer_revealed", { slide_id: slide.id, phase: slide.phase, attempts: sceneAttempts });
          play(audioFor(slide, "reveal") || audioFor(slide, "hint") || audioFor(slide, "try_again") || null, () => {});
        } else play(audioFor(slide, sceneAttempts >= 2 ? "hint" : "try_again") || audioFor(slide, "try_again") || null, () => {});
      };
      (d.hotspots || []).forEach((h) => {
        const hs = document.createElement("button");
        hs.className = "tis-hot" + (h.correct ? " correct-hot" : "");
        hs.style.left = h.x + "%";
        hs.style.top = h.y + "%";
        hs.style.width = h.w + "%";
        hs.style.height = h.h + "%";
        hs.onclick = (e) => {
          e.stopPropagation();
          if (done || isPlaying || hs.classList.contains("faded")) return;
          if (h.correct) {
            done = true;
            stopNudge();
            hs.classList.remove("reveal-hold");
            hs.classList.add("hit");
            sfxCorrect();
            confettiCannon();
            setSwMood("happy");
            SwiftPAL.emit(d.signal_name || "scene_tap_first_try", {
              slide_id: slide.id,
              phase: slide.phase,
              correct: true,
              first_try: sceneAttempts === 0,
              attempts: sceneAttempts + 1,
            });
            play(audioFor(slide, "correct") || null, () =>
              setTimeout(() => completeSlide(true), 900),
            );
          } else {
            hs.classList.add("shake");
            setTimeout(() => hs.classList.remove("shake"), 500);
            miss();
          }
        };
        frame.appendChild(hs);
      });
      frame.onclick = miss; // tapping empty scene = gentle try_again
      wrap.appendChild(frame);
      host.appendChild(wrap);
      $("navBtn").style.display = "none"; // advance on the correct tap — no आगे on a pick
      state.replayAudio = () =>
        play(audioFor(slide, "prompt") || null, () => {});
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, () => {});
      // No idle answer glow: help starts only after the learner's attempts.
    },
  },

  /* STORY_READALONG (H04 L03) — AUTONOMOUS story page: picture + the page's text; each sentence lights
     up as its own clip is read (karaoke read-along), so the child follows the print. Zero required
     interaction; आगे unlocks when the page has been read. Tapping a sentence re-hears it.
     data:{passage:{image_id, lines:[{text,audio}]}, page_no?, page_total?}; audio.prompt = optional lead-in. */
  STORY_READALONG: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "ev-read story-read-layout";
      const card = evPassage(d.passage, { big: true });
      card.classList.remove("dense");
      wrap.appendChild(card);
      host.appendChild(wrap);
      const lines = card._lines;
      let index = 0, token = 0, stopWords = () => {}, watchdog;
      const current = () => CARD.slides[state.idx] === slide;
      state.ownsAudio = true;
      function readLine() {
        if (!current()) return;
        const run = ++token;
        clearTimeout(watchdog);
        stopWords();
        lines.forEach((line, i) => {
          line.hidden = i !== index;
          line.classList.remove("ev-now");
        });
        setNavActive(false);
        const arm = () => {
          if (!current() || run !== token) return;
          clearTimeout(watchdog);
          stopWords();
          lines[index].classList.remove("ev-now");
          setNavActive(true);
        };
        lines[index].classList.add("ev-now", "ev-said");
        play(lines[index]._src, arm);
        stopWords = evWordKaraoke(lines[index]);
        watchdog = setTimeout(arm, 60000);
      }
      $("navBtn").onclick = () => {
        if ($("navBtn").disabled || isPlaying || !current()) return;
        clearTimeout(watchdog);
        stopWords();
        if (index + 1 < lines.length) {
          index++;
          readLine();
        } else completeSlide(true);
      };
      lines.forEach(line => {
        line.onclick = () => {
          if (isPlaying || !current()) return;
          state.audioReplays++;
          readLine();
        };
      });
      state.replayAudio = readLine;
      setSwMood("talk");
      lines.forEach((line, i) => { line.hidden = i !== 0; });
      setNavActive(false);
      const pre = audioFor(slide, "prompt");
      if (pre) play(pre, readLine);
      else readLine();
    },
  },

  /* EVIDENCE_QA (H04 L03) — a comprehension question WITH its proof. Left: the passage (picture + text);
     right: the question-type chip (📖 सीधा / 🔍 अनुमान) + answer options (standard mountTapOptions contract:
     speak-on-tap · buzz+✗+lock · confetti+advance · try→hint→reveal). data.highlight:true (guided) shows
     the evidence/clue lines up front; without it (practice) the HINT step lights them. data.auto:true
     (tutorial) = fully autonomous demo: question → type explanation → evidence lights + is read →
     answer explanation → the right option is marked; आगे unlocks at the end. data:{qtype:'literal'|
     'inference', passage, evidence:[line idx], options:[{label_hi,img?,emoji?,audio,correct?}], highlight?,
     auto?, mastery?}; audio:{prompt, explain_type, explain_answer, try_again, hint, reveal}. */
  EVIDENCE_QA: {
    mount(host, slide) {
      const d = slide.data || {};
      const qt = d.qtype === "inference" ? "inference" : "literal";
      const wrap = document.createElement("div");
      wrap.className = "ev-qa" + (d.picture_only ? " picture-only" : "");
      const card = evPassage(d.picture_only ? {...d.passage, lines: []} : d.passage);
      if (d.picture_only) card.querySelector(".ev-text").remove();
      const lines = card._lines;
      const right = document.createElement("div");
      right.className = "ev-right";
      wrap.appendChild(card);
      wrap.appendChild(right);
      host.appendChild(wrap);
      const chip = evQtypeChip(qt);
      chip.style.cursor = "pointer";
      chip.onclick = () => {
        if (state.hintActive) return;
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      const ev = d.evidence || [];
      const showEv = () => evMark(lines, ev, qt);
      const pulse = (on) =>
        ev.forEach(
          (i) => lines[i] && lines[i].classList.toggle("ev-pulse", on),
        );
      lines.forEach(
        (l) =>
          (l.onclick = () => {
            if (state.hintActive || d.auto) return;
            state.audioReplays++;
            play(l._src);
          }),
      );
      const hintAction = (done) => {
        showEv();
        pulse(true);
        setSwMood("hint");
        play(audioFor(slide, "hint") || null, () => {
          pulse(false);
          done();
        });
      };
      mountTapOptions({
        slide,
        host: right,
        signalName: d.signal_name || "evidence_qa_first_try",
        stimulus: chip,
        options: d.options,
        shuffle: d.shuffle,
        isCorrect: (o) => o.correct === true,
        columnsHint: 1,
        mastery: d.mastery === true,
        hintAction,
        nudgeTarget: null,
        optionRenderer: (o) => {
          const c = document.createElement("div");
          c.className = "ev-opt" + (o.img || o.emoji ? "" : " text-only");
          if (o.correct) c.dataset.ok = "1";
          c.innerHTML =
            (o.img || o.emoji
              ? imgOrEmoji(o.img, o.emoji, "ev-opt-img", "ev-opt-emoji")
              : "") + `<span class="ev-opt-lbl">${o.label_hi || ""}</span>`;
          return c;
        },
      });
      state.ownsAudio = true;
      if (d.highlight) showEv();
      if (d.auto) {
        state.locked = true;
        stopNudge();
        $("hintBtn").style.display = "none";
        const nav = $("navBtn");
        nav.style.display = "";
        setNavActive(false);
        nav.onclick = () => {
          if (!nav.disabled) completeSlide(true);
        };
        const evSrcs = ev.map((i) => lines[i] && lines[i]._src).filter(Boolean);
        let armed = false;
        const arm = () => {
          if (armed) return;
          armed = true;
          setNavActive(true);
          setSwMood("point");
        };
        const seq = (done) => {
          setSwMood("teach");
          play(audioFor(slide, "prompt") || null, () =>
            play(audioFor(slide, "explain_type") || null, () => {
              showEv();
              pulse(true);
              playChain(evSrcs, 0, () => {
                pulse(false);
                play(audioFor(slide, "explain_answer") || null, () => {
                  const ok = right.querySelector('.opt-cell[data-ok="1"]');
                  if (ok) {
                    ok.classList.add("correct");
                    right.querySelectorAll(".opt-cell").forEach((c) => {
                      if (c !== ok) c.classList.add("faded");
                    });
                  }
                  sfxCorrect();
                  burstStars();
                  setSwMood("happy");
                  if (done) done();
                });
              });
            }),
          );
        };
        state.replayAudio = () => seq(arm);
        seq(arm);
        setTimeout(arm, 60000);
      } else {
        state.replayAudio = () =>
          play(audioFor(slide, "prompt") || null, () => {});
        play(audioFor(slide, "prompt") || null, () => {});
      }
    },
  },

  /* FIND_EVIDENCE (H04 L03) — PRODUCE / find-in-context: the child SCANS the story text and taps the
     sentence where the answer is written (the literal-question proof). Tap = that sentence is read aloud;
     right → green + confetti + correct VO + advance; wrong → soft buzz + that sentence crosses out + locks,
     then try_again → hint → REVEAL at max_attempts. data:{passage, answer_line (line idx), mastery?};
     audio:{prompt, try_again, hint, correct, reveal}. */
  FIND_EVIDENCE: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "ev-find";
      const card = evPassage(d.passage, { big: true });
      const lines = card._lines;
      card.classList.add("findable");
      const chip = evQtypeChip("literal");
      chip.classList.add("ev-find-chip");
      chip.insertAdjacentHTML(
        "beforeend",
        `<span class="ev-find-do">· उत्तर वाला वाक्य छुओ</span>`,
      );
      chip.style.cursor = "pointer";
      chip.onclick = () => {
        if (state.locked) return;
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      wrap.appendChild(chip);
      wrap.appendChild(card);
      host.appendChild(wrap);
      state.attempts = 0;
      state.locked = false;
      state.scaffoldLevel = 0;
      state.ownsAudio = true;
      const maxA =
        (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      const tgt = lines[d.answer_line];
      const reveal = () => {
        state.locked = true;
        state.scaffoldLevel = 3;
        setSwMood("hint");
        lines.forEach((line) => { if (line !== tgt) line.classList.add("ev-faded"); });
        if (tgt) {
          tgt.classList.add("reveal-hold");
          tgt.onclick = () => {
            if (isPlaying || CARD.slides[state.idx] !== slide) return;
            tgt.onclick = null;
            stopNudge();
            tgt.classList.remove("reveal-hold");
            tgt.classList.add("correct");
            confettiCannon();
            play(tgt._src, () => setTimeout(() => completeSlide(false), 700));
          };
          if (slide.phase === "guided") pointNudgeAt(tgt);
        }
        SwiftPAL.emit("answer_revealed", {
          slide_id: slide.id,
          phase: slide.phase,
          attempts: state.attempts,
          reason: "wrong",
        });
        play(audioFor(slide, "reveal") || null, () =>
          play(tgt ? tgt._src : null, () => {}),
        );
      };
      lines.forEach(
        (l, i) =>
          (l.onclick = () => {
            if (
              state.locked ||
              isPlaying ||
              state.hintActive ||
              l.classList.contains("ev-wrong-flash") ||
              l.classList.contains("ev-faded")
            )
              return;
            stopNudge();
            if (i === d.answer_line) {
              state.locked = true;
              l.classList.add("correct");
              sfxCorrect();
              confettiCannon();
              setSwMood("happy");
              if (d.mastery) {
                state.masteryAttempts++;
                if (state.attempts === 0) state.masteryHits++;
              }
              SwiftPAL.emit("evidence_find_first_try", {
                slide_id: slide.id,
                phase: slide.phase,
                value: true,
                first_try: state.attempts === 0,
                attempts: state.attempts + 1,
                scaffold_level: state.scaffoldLevel,
                latency_ms: Date.now() - state.slideStart,
              });
              play(l._src, () =>
                play(audioFor(slide, "correct") || null, () =>
                  setTimeout(() => completeSlide(true), 600),
                ),
              );
            } else {
              state.attempts++;
              l.classList.add("ev-wrong-flash");
              setTimeout(() => l.classList.remove("ev-wrong-flash"), 700);
              sfxWrongSoft();
              setSwMood("tryagain");
              $("hintBtn").classList.add("show");
              SwiftPAL.emit("answer_wrong", {
                slide_id: slide.id,
                phase: slide.phase,
                attempts: state.attempts,
              });
              play(l._src, () => {
                if (state.attempts >= maxA) reveal();
                else if (state.attempts >= 2) {
                  state.scaffoldLevel = Math.max(state.scaffoldLevel, 2);
                  setSwMood("hint");
                  play(audioFor(slide, "hint") || null, () => {});
                } else {
                  state.scaffoldLevel = Math.max(state.scaffoldLevel, 1);
                  play(audioFor(slide, "try_again") || null, () => {});
                }
              });
            }
          }),
      );
      $("hintBtn").onclick = () => {
        if (state.locked) return;
        state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
        setSwMood("hint");
        play(audioFor(slide, "hint") || null, () => {});
      };
      $("navBtn").style.display = "none";
      setNavActive(false);
      state.replayAudio = () =>
        play(audioFor(slide, "prompt") || null, () => {});
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, () => {});
    },
  },

  /* QTYPE_RECAP (H04 L03) — AUTONOMOUS "name the target" beat: the two question types side by side
     (📖 सीधा प्रश्न / 🔍 अनुमान प्रश्न), each card lights while its line is spoken. data:{cards:[{kind,
     title_hi, body_hi, example_hi?, audio}]}. आगे unlocks after both. */
  QTYPE_RECAP: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "ev-recap";
      const els = (d.cards || []).map((c) => {
        const el = document.createElement("div");
        el.className =
          "ev-recap-card " + (c.kind === "inference" ? "inference" : "literal");
        el.innerHTML =
          `<div class="rc-ic">${c.kind === "inference" ? "🔍" : "📖"}</div><div class="rc-title">${c.title_hi || ""}</div>` +
          `<div class="rc-body">${c.body_hi || ""}</div>` +
          (c.example_hi ? `<div class="rc-ex">${c.example_hi}</div>` : "");
        el._src = c.audio ? "assets/Audio/" + c.audio + "." + AUDIO_EXT : null;
        el.onclick = () => {
          state.audioReplays++;
          play(el._src);
        };
        wrap.appendChild(el);
        return el;
      });
      host.appendChild(wrap);
      state.ownsAudio = true;
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (!$("navBtn").disabled) completeSlide(true);
      };
      let armed = false;
      const arm = () => {
        if (armed) return;
        armed = true;
        els.forEach((e) => e.classList.remove("now"));
        setNavActive(true);
        setSwMood("point");
      };
      const run = (i) => {
        els.forEach((e) => e.classList.remove("now"));
        if (i >= els.length) {
          arm();
          return;
        }
        els[i].classList.add("now", "seen");
        play(els[i]._src, () => setTimeout(() => run(i + 1), 300));
      };
      state.replayAudio = () => run(0);
      setSwMood("teach");
      const pre = audioFor(slide, "prompt");
      if (pre) play(pre, () => run(0));
      else run(0);
      setTimeout(arm, 45000);
    },
  },

  /* SORT_QTYPE (H04 L03) — PRODUCE: sort story FACTS into two boxes — "📖 कहानी में लिखा है" (literal)
     vs "🔍 सोचकर पता चला" (inferred). Drag a card onto a box, OR tap a card (it is read aloud + selected)
     then tap a box. Right → snaps in; wrong → buzz + box flashes red + spoken try_again → hint; after
     max consecutive misses the next card is placed for the child (reveal ceiling). All placed →
     celebrate + advance. data:{items:[{text, audio, kind:'literal'|'inference'}], mastery?};
     audio:{prompt, try_again, hint, correct, reveal}. */
  SORT_QTYPE: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "ev-sort";
      const bins = document.createElement("div");
      bins.className = "ev-sort-bins";
      const mkBin = (kind, ic, title) => {
        const b = document.createElement("div");
        b.className = "ev-sort-bin dd-zone " + kind;
        b.dataset.kind = kind;
        b.innerHTML = `<div class="esb-title"><span class="ic">${ic}</span>${title}</div><div class="esb-items"></div>`;
        bins.appendChild(b);
        return b;
      };
      const bL = mkBin("literal", "📖", "कहानी में लिखा है"),
        bI = mkBin("inference", "🔍", "सोचकर पता चला");
      const tray = document.createElement("div");
      tray.className = "ev-sort-tray";
      const items = (d.items || []).slice();
      for (let i = items.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [items[i], items[j]] = [items[j], items[i]];
      }
      let sel = null;
      const tiles = items.map((it) => {
        const t = document.createElement("div");
        t.className = "ev-sort-item";
        t.dataset.kind = it.kind;
        t.innerHTML = `<span class="esi-text">${it.text}</span>`;
        t._src = it.audio ? "assets/Audio/" + it.audio + "." + AUDIO_EXT : null;
        const speak = () => {
          if (
            t.classList.contains("snapped") ||
            isPlaying || state.locked ||
            state.hintActive
          )
            return;
          stopNudge();
          state.audioReplays++;
          tiles.forEach((x) => x.classList.remove("sel"));
          t.classList.add("sel");
          sel = t;
          play(t._src);
        };
        t.addEventListener("mousedown", speak);
        t.addEventListener("touchstart", speak, { passive: true });
        tray.appendChild(t);
        return t;
      });
      wrap.appendChild(bins);
      wrap.appendChild(tray);
      host.appendChild(wrap);
      state.attempts = 0;
      state.locked = false;
      state.ownsAudio = true;
      const maxA =
        (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      let placed = 0,
        streak = 0,
        revealed = false;
      const need = tiles.length;
      const settle = (bin, t) => {
        t.classList.remove("sel", "dragging");
        t.classList.add("snapped");
        t.style.transform = "";
        bin.querySelector(".esb-items").appendChild(t);
        placed++;
        if (sel === t) sel = null;
        if (placed === need) {
          state.locked = true;
          if (d.mastery) {
            state.masteryAttempts++;
            if (state.attempts === need) state.masteryHits++;
          }
          SwiftPAL.emit("qtype_sort_done", {
            slide_id: slide.id,
            phase: slide.phase,
            value: !revealed,
            attempts: state.attempts,
            latency_ms: Date.now() - state.slideStart,
          });
          setTimeout(() => celebrateThenAdvance(slide, revealed), 300);
        }
      };
      const revealOne = () => {
        const t = tiles.find((x) => !x.classList.contains("snapped"));
        if (!t) return;
        revealed = true;
        streak = 0;
        const bin = t.dataset.kind === "inference" ? bI : bL;
        t.classList.add("reveal-glow");
        bin.classList.add("reveal-glow");
        state.hintActive = true;
        play(audioFor(slide, "reveal") || null, () => {
          t.classList.remove("reveal-glow");
          bin.classList.remove("reveal-glow");
          state.hintActive = false;
          settle(bin, t);
        });
      };
      const tryDrop = (bin, t) => {
        if (isPlaying || state.locked || state.hintActive || t.classList.contains("snapped"))
          return;
        state.attempts++;
        if (bin.dataset.kind === t.dataset.kind) {
          streak = 0;
          sfxCorrect();
          burstStars();
          setSwMood("happy");
          settle(bin, t);
        } else {
          t.style.transform = "";
          bin.classList.add("wrong-flash");
          setTimeout(() => bin.classList.remove("wrong-flash"), 600);
          $("hintBtn").classList.add("show");
          SwiftPAL.emit("answer_wrong", {
            slide_id: slide.id,
            phase: slide.phase,
            attempts: state.attempts,
          });
          if (++streak >= maxA) {
            sfxWrongSoft();
            setSwMood("hint");
            revealOne();
          } else if (streak === 2) {
            sfxWrongSoft();
            setSwMood("hint");
            play(audioFor(slide, "hint") || null, () => {});
          } else dragWrong(slide);
        }
      };
      tiles.forEach((t) =>
        makeDraggable(t, (zone, tile) => {
          const bin = zone.closest(".ev-sort-bin");
          if (bin) tryDrop(bin, tile);
        }),
      );
      [bL, bI].forEach((b) =>
        b.addEventListener("click", () => {
          if (sel) tryDrop(b, sel);
        }),
      );
      $("hintBtn").onclick = () => {
        if (state.locked || state.hintActive) return;
        state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
        setSwMood("hint");
        play(audioFor(slide, "hint") || null, () => {});
      };
      $("navBtn").style.display = "none";
      setNavActive(false);
      state.replayAudio = () =>
        play(audioFor(slide, "prompt") || null, () => {});
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, () => {});
      // No idle hand pointing at answerable cards.
    },
  },

  PHASE_TRANSITION: {
    mount(host, slide) {
      const d = slide.data || {};
      const phaseGate = $("phaseGate");
      const phaseGateImg = $("phaseGateImg");
      const vo = audioFor(slide, "prompt");
      const openedAt = Date.now();
      let finished = false;
      state.ownsAudio = true;
      state.locked = true;
      setNavActive(false);
      $("navBtn").onclick = () => {};
      $("stage").classList.add("blurred", "gating");
      phaseGate.setAttribute("aria-hidden", "false");
      phaseGate.classList.add("show");
      phaseGateImg.removeAttribute("src");
      void phaseGateImg.offsetWidth;
      phaseGateImg.src = "assets/UI/peeking_talk_up.webp?run=" + openedAt;
      SwiftPAL.emit("phase_transition_shown", {
        slide_id: slide.id,
        to_phase: d.to_phase || slide.phase,
        step: d.step || 1,
      });
      let watchdog;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        phaseGate.classList.add("sink");
        setTimeout(() => {
          phaseGate.classList.remove("show", "sink");
          phaseGate.setAttribute("aria-hidden", "true");
          $("stage").classList.remove("blurred", "gating");
          if (slide.id === "PT1") {
            $("startGate").classList.add("hidden");
            document.body.classList.remove("is-start");
          }
          completeSlide(true);
        }, 340);
      };
      watchdog = setTimeout(finish, 12000);
      play(vo || null, () =>
        setTimeout(finish, Math.max(0, 2000 - (Date.now() - openedAt))),
      );
    },
  },

  CELEBRATION: {
    mount(host, slide) {
      // celebration SFX — own Audio element so it overlaps the spoken VO chain
      playSfx(
        slide.audio && slide.audio.sfx ? slide.audio.sfx : "sfx_celebrate",
      );
      // show end screen overlay + a big Hindi headline (== the VO) so the finale feels like a reward
      const et = $("endTitle");
      if (et) et.textContent = slide.prompt_hi || "";
      const es = $("endScreen");
      es.classList.add("show");
      const c = $("confetti");
      const colors = [
        "#FCB717",
        "#386AF6",
        "#E55B49",
        "#21A74A",
        "#7048D6",
        "#FF7AC6",
        "#2BC4D8",
      ];
      for (let i = 0; i < 46; i++) {
        const p = document.createElement("i");
        p.style.left = Math.random() * 100 + "%";
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration = 2 + Math.random() * 2.2 + "s";
        p.style.animationDelay = Math.random() * 1.8 + "s";
        p.style.width = 8 + Math.random() * 8 + "px";
        p.style.height = 12 + Math.random() * 10 + "px";
        c.appendChild(p);
      }
      const masteryScore = state.masteryAttempts
        ? state.masteryHits / state.masteryAttempts
        : 0;
      SwiftPAL.emit("mastery_score", {
        value: masteryScore,
        hits: state.masteryHits,
        attempts: state.masteryAttempts,
      });
      SwiftPAL.emit("lesson_completed", {
        skill_code: CARD.skill_code,
        total_signals: SwiftPAL.signals.length,
      });
      runValidator();
      setNavActive(false);
      // "आगे बढ़ें" appears only AFTER the celebration VO finishes (see autoPlayChain onDone)
      const eb = $("endBtn");
      eb.classList.remove("show");
      state.endBtnPending = true;
      // dev-only: a small "download results" button (teacher/QA), never in child flow
      if (new URLSearchParams(location.search).has("dev") && !$("dlResults")) {
        const dl = document.createElement("button");
        dl.id = "dlResults";
        dl.textContent = "⬇ results JSON";
        dl.style.cssText =
          "position:absolute;bottom:20px;left:20px;z-index:5;font-family:var(--font-hi);font-weight:700;font-size:16px;padding:8px 16px;border-radius:12px;border:2px solid #B7DCFB;background:#fff;color:var(--navy);cursor:pointer;";
        dl.onclick = () => SwiftPAL.downloadResults();
        es.appendChild(dl);
      }
      eb.onclick = () => {
        SwiftPAL.emit("proceed_next", {
          skill_code: CARD.skill_code,
          part: CARD.part_label,
        });
        try {
          window.parent?.postMessage(
            {
              type: "swiftpal:proceed",
              skill_code: CARD.skill_code,
              part: CARD.part_label,
            },
            "*",
          );
        } catch (e) {}
      };
    },
  },

  /* ---- RHYME (तुक) — phonological awareness. ADDITIVE (r4a); no existing module touched. ----
     Rhyme is auditory: every word plays its own clip; the two-card stimulus + 🔊 replay let a
     pre-reader re-hear. MEET_RHYME teaches (two cards linked, VO stretches the shared ending);
     RHYME_YESNO judges "do these rhyme?" (✓ तुकांत / ✗ नहीं); RHYME_PICK asks "which one rhymes
     with X?" (tap the matching picture). YESNO/PICK ride the standard mountTapOptions answer
     contract (speak-on-tap · buzz+✗+lock · confetti+advance · layered hint→reveal). */
  MEET_RHYME: {
    mount(host, slide) {
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "meet-rhyme";
      const card = (w) => {
        const c = document.createElement("div");
        c.className = "rhyme-card";
        c.innerHTML =
          imgOrEmoji(w.img, w.emoji, "pic-img", "pic-emoji") +
          `<span class="pic-label">${w.word_hi}</span>`;
        if (w.audio)
          c.onclick = () => {
            state.audioReplays++;
            play("assets/Audio/" + w.audio + "." + AUDIO_EXT);
          };
        return c;
      };
      const link = document.createElement("div");
      link.className = "rhyme-link" + (d.rhymes === false ? " no" : "");
      link.textContent = d.rhymes === false ? "≠" : "🎵";
      wrap.appendChild(card(d.a));
      wrap.appendChild(link);
      wrap.appendChild(card(d.b));
      host.appendChild(wrap);
      state.gateNavUntilAudio = true; // nav unlocks after the model VO
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
    },
  },

  RHYME_YESNO: {
    mount(host, slide) {
      const d = slide.data;
      const stim = document.createElement("div");
      stim.className = "rhyme-stim";
      stim.style.cursor = "pointer";
      const mini = (w) => {
        const m = document.createElement("div");
        m.className = "rhyme-mini";
        m.innerHTML =
          imgOrEmoji(w.img, w.emoji, "img", "emoji") +
          `<span class="lbl">${w.word_hi}</span>`;
        return m;
      };
      const spk = document.createElement("span");
      spk.className = "rhyme-spk";
      spk.textContent = "🔊";
      stim.appendChild(mini(d.a));
      stim.appendChild(spk);
      stim.appendChild(mini(d.b));
      // 🔊 / stimulus tap replays both words back-to-back (re-hear the pair)
      const chain = [d.a, d.b]
        .filter((x) => x && x.audio)
        .map((x) => "assets/Audio/" + x.audio + "." + AUDIO_EXT);
      stim.onclick = () => {
        state.audioReplays++;
        playChain(chain, 0);
      };
      mountTapOptions({
        slide,
        host,
        signalName: "rhyme_judge_first_try",
        stimulus: stim,
        columnsHint: 2,
        options: [
          { ans: "yes", audio: slide.audio && slide.audio.yes },
          { ans: "no", audio: slide.audio && slide.audio.no },
        ],
        isCorrect: (opt) => opt.ans === (d.rhymes ? "yes" : "no"),
        optionRenderer: (opt) => {
          const c = document.createElement("div");
          c.innerHTML =
            opt.ans === "yes"
              ? `<div class="rhyme-ans yes"><span class="sym">✓</span><span class="lbl">तुकांत</span></div>`
              : `<div class="rhyme-ans no"><span class="sym">✗</span><span class="lbl">नहीं</span></div>`;
          return c;
        },
        mastery: slide.phase === "mastery",
        nudgeTarget: null,
      });
    },
  },

  RHYME_PICK: {
    mount(host, slide) {
      const d = slide.data;
      const stim = document.createElement("div");
      stim.className = "stimulus-pic";
      stim.style.cursor = "pointer";
      stim.innerHTML =
        imgOrEmoji(d.target.img, d.target.emoji, "img", "emoji") +
        `<span class="lbl">${d.target.word_hi}</span>`;
      stim.onclick = () => {
        state.audioReplays++;
        play(
          audioFor(slide, "target_word") || audioFor(slide, "prompt") || null,
        );
      };
      mountTapOptions({
        slide,
        host,
        signalName: "rhyme_pick_first_try",
        stimulus: stim,
        columnsHint: d.options.length,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery",
      });
    },
  },

  // ---- SENTENCE reading (H06): read a simple sentence word-by-word, then whole ----
  SENTENCE_READ: {
    mount(host, slide) {
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "sentence-read";
      const strip = document.createElement("div");
      strip.className = "sentence-strip";
      (d.words || []).forEach((w) => {
        const chip = document.createElement("div");
        chip.className = "sentence-word";
        chip.innerHTML = `<span class="sw-text ink-glyph">${w.text}</span>`;
        chip.onclick = () => {
          chip.classList.add("said");
          state.audioReplays++;
          if (w.audio) play("assets/Audio/" + w.audio + "." + AUDIO_EXT);
        };
        strip.appendChild(chip);
      });
      const readBtn = document.createElement("button");
      readBtn.className = "read-whole-btn";
      readBtn.innerHTML = `🔊 पूरा पढ़ो`;
      const wholeSrc = d.whole_audio
        ? "assets/Audio/" + d.whole_audio + "." + AUDIO_EXT
        : null;
      readBtn.onclick = () => {
        state.audioReplays++;
        readBtn.classList.add("playing");
        strip
          .querySelectorAll(".sentence-word")
          .forEach((c) => c.classList.add("said"));
        // nav unlocks only after the child hears the WHOLE sentence read fluently (the point of the skill)
        play(wholeSrc, () => {
          readBtn.classList.remove("playing");
          readBtn.classList.add("done");
          setNavActive(true);
        });
      };
      wrap.appendChild(strip);
      wrap.appendChild(readBtn);
      host.appendChild(wrap);
      state.replayAudio = () => play(wholeSrc, () => {}); // audio chip re-reads the whole sentence
      setNavActive(false); // gated until "पूरा पढ़ो" is played once
      $("navBtn").onclick = () => completeSlide(true);
    },
  },

  // ---- SENTENCE_FIND (H06): tap the named word INSIDE the sentence (word recognition) ----
  SENTENCE_FIND: {
    mount(host, slide) {
      const d = slide.data;
      const wrap = document.createElement("div");
      wrap.className = "sentence-find";
      const strip = document.createElement("div");
      strip.className = "sentence-strip";
      state.attempts = 0;
      state.locked = false;
      state.scaffoldLevel = 0;
      const maxA =
        (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      const chips = [];
      (d.words || []).forEach((w) => {
        const chip = document.createElement("div");
        chip.className = "sentence-word tappable";
        chip.innerHTML = `<span class="sw-text ink-glyph">${w.text}</span>`;
        chip.__target = w.target === true;
        const wordSrc = w.audio
          ? "assets/Audio/" + w.audio + "." + AUDIO_EXT
          : null;
        chip.onclick = () => {
          if (
            state.locked ||
            chip.classList.contains("crossed") ||
            chip.classList.contains("correct")
          )
            return;
          const after = (cb) => {
            if (wordSrc) play(wordSrc, cb);
            else cb();
          };
          if (w.target === true) {
            state.locked = true;
            chip.classList.add("correct");
            sfxCorrect();
            confettiCannon();
            setSwMood("happy");
            if (slide.phase === "mastery") {
              state.masteryAttempts++;
              if (state.attempts === 0) state.masteryHits++;
            }
            SwiftPAL.emit("sentence_word_first_try", {
              slide_id: slide.id,
              phase: slide.phase,
              value: true,
              first_try: state.attempts === 0,
              attempts: state.attempts + 1,
              latency_ms: Date.now() - state.slideStart,
            });
            after(() => setTimeout(() => completeSlide(true), 700));
          } else {
            state.attempts++;
            chip.classList.add("crossed");
            sfxWrongSoft();
            setSwMood("tryagain");
            $("hintBtn").classList.add("show");
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            after(() => {
              if (state.attempts >= maxA) {
                // A1 reveal ceiling — never stuck
                state.locked = true;
                state.scaffoldLevel = 3;
                setSwMood("hint");
                const t = chips.find((c) => c.__target);
                if (t) {
                  t.classList.add("correct", "reveal-pulse");
                }
                play(
                  audioFor(slide, "reveal") ||
                    audioFor(slide, "correct") ||
                    null,
                  () => setTimeout(() => completeSlide(false), 800),
                );
              } else if (state.attempts >= 2) {
                state.scaffoldLevel = Math.max(state.scaffoldLevel, 2);
                play(
                  audioFor(slide, "hint") ||
                    audioFor(slide, "try_again") ||
                    null,
                  () => {},
                );
              } else {
                state.scaffoldLevel = Math.max(state.scaffoldLevel, 1);
                play(audioFor(slide, "try_again") || null, () => {});
              }
            });
          }
        };
        strip.appendChild(chip);
        chips.push(chip);
      });
      wrap.appendChild(strip);
      host.appendChild(wrap);
      $("hintBtn").onclick = () => {
        if (state.locked) return;
        state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
        play(
          audioFor(slide, "hint") || audioFor(slide, "try_again") || null,
          () => {},
        );
      };
      $("navBtn").style.display = "none";
      setNavActive(false);
    },
  },

  // ---- TAP_ALL_WITH_SOUND (H02): tap EVERY word that has the target sound (repeated-sound / ----
  // ---- alliteration). Multi-select: a counter tracks how many of the sound-words are found; ----
  // ---- when all are found → celebrate + advance. Wrong tap = buzz + ✗ + locks that chip. ----
  TAP_ALL_WITH_SOUND: {
    mount(host, slide) {
      const d = slide.data || {};
      const items = d.items || [];
      const need = items.filter((it) => it.has === true).length;
      state.attempts = 0;
      state.locked = false;
      let found = 0;
      const wrap = document.createElement("div");
      wrap.className = "tap-all";
      const head = document.createElement("div");
      head.className = "tap-all-head";
      const badge = document.createElement("div");
      badge.className = "tap-all-sound";
      badge.style.cursor = "pointer";
      badge.innerHTML = `<span class="ink-glyph">${d.target_sound || ""}</span>`;
      badge.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "target") || null);
      };
      const counter = document.createElement("div");
      counter.className = "tap-all-count";
      const setCount = () => {
        counter.innerHTML = `<span class="c-found">${found}</span> / ${need}`;
      };
      head.appendChild(badge);
      head.appendChild(counter);
      const strip = document.createElement("div");
      strip.className = "tap-all-strip";
      const chips = [];
      items.forEach((it) => {
        const chip = document.createElement("div");
        chip.className = "tap-all-item";
        chip.innerHTML =
          imgOrEmoji(it.img, it.emoji, "img", "emoji") +
          `<span class="lbl">${it.word_hi}</span>`;
        const src = it.audio
          ? "assets/Audio/" + it.audio + "." + AUDIO_EXT
          : null;
        chip.onclick = () => {
          if (
            state.locked ||
            chip.classList.contains("got") ||
            chip.classList.contains("nope")
          )
            return;
          const after = (cb) => {
            if (src) play(src, cb);
            else cb();
          };
          if (it.has === true) {
            chip.classList.add("got");
            sfxCorrect();
            found++;
            setCount();
            SwiftPAL.emit("sound_found", {
              slide_id: slide.id,
              phase: slide.phase,
              word: it.word_hi,
            });
            after(() => {
              if (found >= need) {
                state.locked = true;
                setSwMood("celebrate");
                confettiCannon();
                if (slide.phase === "mastery") {
                  state.masteryAttempts++;
                  if (state.attempts === 0) state.masteryHits++;
                }
                SwiftPAL.emit(d.signal_name || "tap_all_correct", {
                  slide_id: slide.id,
                  phase: slide.phase,
                  value: state.attempts === 0,
                  attempts: state.attempts,
                  latency_ms: Date.now() - state.slideStart,
                });
                play(
                  audioFor(slide, "done") || audioFor(slide, "correct") || null,
                  () =>
                    setTimeout(() => completeSlide(state.attempts === 0), 700),
                );
              }
            });
          } else {
            state.attempts++;
            chip.classList.add("nope");
            sfxWrongSoft();
            setSwMood("tryagain");
            $("hintBtn").classList.add("show");
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            after(() => play(audioFor(slide, "try_again") || null, () => {}));
          }
        };
        strip.appendChild(chip);
        chips.push(chip);
      });
      setCount();
      wrap.appendChild(head);
      wrap.appendChild(strip);
      host.appendChild(wrap);
      $("hintBtn").onclick = () => {
        if (state.locked) return;
        state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
        play(
          audioFor(slide, "hint") || audioFor(slide, "try_again") || null,
          () => {},
        );
      };
      $("navBtn").style.display = "none";
      setNavActive(false);
      state.replayAudio = () =>
        play(audioFor(slide, "prompt") || null, () => {});
    },
  },

  // ---- SENTENCE_SOUND (H02): hear an alliterative LINE, tap the sound that REPEATS in it. ----
  // The line is shown as word chips + a 🔊 replay; the answer options are sound-letter chips. ----
  SENTENCE_SOUND: {
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "sentence-sound-stim";
      const strip = document.createElement("div");
      strip.className = "sentence-strip";
      (d.words || []).forEach((w) => {
        const chip = document.createElement("div");
        chip.className = "sentence-word";
        chip.innerHTML = `<span class="sw-text ink-glyph">${typeof w === "string" ? w : w.text}</span>`;
        strip.appendChild(chip);
      });
      const whole = d.whole_audio
        ? "assets/Audio/" + d.whole_audio + "." + AUDIO_EXT
        : null;
      const spk = document.createElement("button");
      spk.className = "read-whole-btn";
      spk.innerHTML = "🔊 फिर सुनो";
      spk.onclick = () => {
        state.audioReplays++;
        strip
          .querySelectorAll(".sentence-word")
          .forEach((c) => c.classList.add("said"));
        play(whole, () => {});
      };
      stim.appendChild(strip);
      stim.appendChild(spk);
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "sentence_sound_first_try",
        stimulus: stim,
        columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt) => opt.letter === d.target_sound,
        optionRenderer: (opt) => letterCell(opt.letter),
        mastery: slide.phase === "mastery",
        nudgeTarget: null,
      });
      state.replayAudio = () => play(whole, () => {});
    },
  },

  /* ==== MIDDLE SOUND (H02 phonological awareness — बीच की ध्वनि). ADDITIVE (r4e); no existing
     module touched. A 3-अक्षर word is segmented into first · middle · last sound-boxes and the child
     learns/identifies the MIDDLE sound. Four scoped modules:
       - MEET_MIDDLE     (teach BY DOING) — child taps each box to HEAR its sound, then the middle
                          box lights and Swiftie names it ("बीच की ध्वनि — /ट/").
       - TAP_MIDDLE_SOUND (test, gesture 1) — first & last shown; pick the correct middle sound-button.
       - MIDDLE_PICK_WORD (test, gesture 2) — a target sound is given; tap the PICTURE whose middle is it.
       - MIDDLE_YESNO     (test, gesture 3) — "is this word's middle sound /X/?" ✓ हाँ / ✗ नहीं.
     The three test modules ride the shared mountTapOptions answer contract (speak-on-tap · buzz+✗+lock ·
     confetti+advance · layered hint→reveal). ==== */
  MEET_MIDDLE: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "mid-teach";
      const wc = document.createElement("div");
      wc.className = "mid-word";
      wc.innerHTML =
        imgOrEmoji(d.word.img, d.word.emoji, "mid-word-img", "mid-word-emoji") +
        `<span class="mid-word-lbl">${d.word.word_hi}</span>`;
      const boxes = document.createElement("div");
      boxes.className = "mid-boxes";
      const cells = (d.boxes || []).map((b, i) => {
        const c = document.createElement("div");
        c.className = "mid-box teach pos-" + i + (b.middle ? " is-mid" : "");
        c.innerHTML =
          `<span class="mid-akshar ink-glyph">${b.akshar}</span>` +
          (b.pos_hi ? `<span class="mid-pos-lbl">${b.pos_hi}</span>` : "");
        boxes.appendChild(c);
        return c;
      });
      wrap.appendChild(wc);
      wrap.appendChild(boxes);
      host.appendChild(wrap);

      state.ownsAudio = true;
      state.locked = false;
      setNavActive(false);
      $("navBtn").onclick = () => completeSlide(true);
      let revealed = false;
      state.replayAudio = () => {
        const ch = [audioFor(slide, "intro")];
        if (revealed) ch.push(audioFor(slide, "explain"));
        playChain(ch.filter(Boolean), 0);
      };

      const tapped = new Set();
      const boxSrc = (i) =>
        "assets/Audio/" + d.boxes[i].audio + "." + AUDIO_EXT;
      function nudgeNext() {
        for (let i = 0; i < cells.length; i++) {
          if (!tapped.has(i)) {
            pointNudgeAt(cells[i]);
            return;
          }
        }
        stopNudge();
      }
      function enableBoxes() {
        cells.forEach((c, i) => {
          c.classList.add("tappable");
          c.onclick = () => {
            if (state.locked) return;
            if (tapped.has(i)) {
              play(boxSrc(i));
              return;
            } // re-tap just replays that sound
            tapped.add(i);
            c.classList.add("said");
            sfxTap();
            play(boxSrc(i), () => {
              if (tapped.size === cells.length) {
                stopNudge();
                revealMiddle();
              } else nudgeNext();
            });
          };
        });
        nudgeNext();
      }
      function revealMiddle() {
        state.locked = true;
        const mid = cells.find((c) => c.classList.contains("is-mid"));
        if (mid) mid.classList.add("reveal-glow", "lit");
        setSwMood("point");
        play(audioFor(slide, "explain") || null, () => {
          revealed = true;
          state.locked = false;
          setNavActive(true);
        });
      }
      play(audioFor(slide, "intro") || null, () => enableBoxes()); // teach line → tap each box → name the middle
    },
  },

  TAP_MIDDLE_SOUND: {
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "mid-frame";
      const wc = document.createElement("div");
      wc.className = "mid-word";
      wc.innerHTML =
        imgOrEmoji(d.word.img, d.word.emoji, "mid-word-img", "mid-word-emoji") +
        `<span class="mid-word-lbl">${d.word.word_hi}</span>`;
      const boxes = document.createElement("div");
      boxes.className = "mid-boxes";
      // first box (known) — tap to hear
      const b1 = document.createElement("div");
      b1.className = "mid-box known first";
      b1.innerHTML = `<span class="mid-akshar ink-glyph">${d.first.akshar}</span>`;
      b1.onclick = () => {
        state.audioReplays++;
        play("assets/Audio/" + d.first.audio + "." + AUDIO_EXT);
      };
      // middle box (the unknown slot)
      const b2 = document.createElement("div");
      b2.className = "mid-box slot is-mid";
      b2.innerHTML = `<span class="mid-q">?</span>`;
      // last box (known) — tap to hear
      const b3 = document.createElement("div");
      b3.className = "mid-box known last";
      b3.innerHTML = `<span class="mid-akshar ink-glyph">${d.last.akshar}</span>`;
      b3.onclick = () => {
        state.audioReplays++;
        play("assets/Audio/" + d.last.audio + "." + AUDIO_EXT);
      };
      boxes.appendChild(b1);
      boxes.appendChild(b2);
      boxes.appendChild(b3);
      stim.appendChild(wc);
      stim.appendChild(boxes);
      stim.style.cursor = "pointer";
      stim.onclick = (e) => {
        if (e.target.closest(".mid-box.known")) return;
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "middle_sound_first_try",
        stimulus: stim,
        columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => {
          const c = document.createElement("div");
          c.innerHTML = `<span class="big-glyph ink-glyph mid-opt-glyph">${opt.akshar}</span><span class="mid-opt-spk">🔊</span>`;
          return c;
        },
        mastery: slide.phase === "mastery",
      });
    },
  },

  MIDDLE_PICK_WORD: {
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "mid-ask";
      stim.style.cursor = "pointer";
      stim.innerHTML =
        `<span class="mid-ask-lbl">बीच की आवाज़</span>` +
        `<div class="mid-ask-chip"><span class="mid-akshar ink-glyph">${d.target_akshar}</span><span class="mid-opt-spk">🔊</span></div>`;
      stim.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "middle_pick_first_try",
        stimulus: stim,
        columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery",
      });
    },
  },

  MIDDLE_YESNO: {
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "mid-yn-stim";
      stim.style.cursor = "pointer";
      const wc = document.createElement("div");
      wc.className = "mid-word small";
      wc.innerHTML =
        imgOrEmoji(d.word.img, d.word.emoji, "mid-word-img", "mid-word-emoji") +
        `<span class="mid-word-lbl">${d.word.word_hi}</span>`;
      const ask = document.createElement("div");
      ask.className = "mid-yn-ask";
      ask.innerHTML =
        `<span class="mid-yn-q">बीच?</span>` +
        `<div class="mid-ask-chip"><span class="mid-akshar ink-glyph">${d.asked_akshar}</span></div>`;
      stim.appendChild(wc);
      stim.appendChild(ask);
      stim.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "middle_yesno_first_try",
        stimulus: stim,
        columnsHint: 2,
        options: [
          { ans: "yes", audio: slide.audio && slide.audio.yes },
          { ans: "no", audio: slide.audio && slide.audio.no },
        ],
        isCorrect: (opt) => opt.ans === (d.is_yes ? "yes" : "no"),
        optionRenderer: (opt) => {
          const c = document.createElement("div");
          c.innerHTML =
            opt.ans === "yes"
              ? `<div class="rhyme-ans yes"><span class="sym">✓</span><span class="lbl">हाँ</span></div>`
              : `<div class="rhyme-ans no"><span class="sym">✗</span><span class="lbl">नहीं</span></div>`;
          return c;
        },
        mastery: slide.phase === "mastery",
        nudgeTarget: null,
      });
    },
  },

  /* ==== READING DIRECTION (H03 print concepts — पठन-दिशा). ADDITIVE (r4f); no existing module touched.
     The child can't read yet, so these teach/test the DIRECTION of print, not its meaning: left→right
     within a line, then the RETURN-SWEEP to the start of the next line. Three gestures:
       - READ_PATH  (teach + produce test) — tap the words in reading order; a buddy hops L→R and sweeps
                     back-and-down at each line break. mode:"teach" narrates + gates on VO; mode:"test" scored.
       - TAP_READ_ARROW (pick) — "which way do we read?" pick → (via mountTapOptions).
       - TAP_READ_POS   (tap-a-spot) — tap where reading STARTS / resumes on the next line (TAP_IN_SCENE-style:
                     buzz + try-again on a miss, no ✗; glow-reveal after max_attempts). ==== */
  READ_PATH: {
    mount(host, slide) {
      const d = slide.data || {};
      const teach = d.mode === "teach";
      const wrap = document.createElement("div");
      wrap.className = "read-stage" + (teach ? " teach" : "");
      const page = readPage(d.lines, {
        buddy: true,
        buddy_img: d.buddy_img,
        buddy_emoji: d.buddy_emoji,
      });
      wrap.appendChild(page);
      host.appendChild(wrap);
      const order = page._cards,
        buddy = page._buddy;
      // TRACK_FOLLOW = the "animated tracker": a glowing cursor rides the current word so the child
      // FOLLOWS word-by-word (guided). Plain READ_PATH has no glow → the child must self-pace (harder).
      const guide = slide.type === "TRACK_FOLLOW" || !!d.guide;
      function markTrack() {
        if (!guide) return;
        order.forEach((o) => o.classList.remove("tracking"));
        if (idx < order.length) order[idx].classList.add("tracking");
      }

      let idx = 0,
        wrongStreak = 0,
        revealedAny = false;
      state.locked = false;
      state.attempts = 0;
      if (teach) {
        state.ownsAudio = true;
      }
      if (!teach) {
        $("navBtn").style.display = "none";
      }
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (teach && state.locked) completeSlide(true);
      };

      function moveBuddyTo(el, sweep, cb) {
        buddy.classList.toggle("sweep", !!sweep);
        buddy.style.left =
          el.offsetLeft + el.offsetWidth / 2 - buddy.offsetWidth / 2 + "px";
        buddy.style.top = el.offsetTop + el.offsetHeight + 4 + "px";
        if (cb) setTimeout(cb, sweep ? 720 : 240);
      }
      function nudgeNext() {
        if (!teach) return;
        if (idx < order.length) pointNudgeAt(order[idx].el || order[idx]);
        else stopNudge();
      }
      moveBuddyTo(order[0], false);
      requestAnimationFrame(() => moveBuddyTo(order[0], false)); // sync (rAF is throttled) + rAF backup
      markTrack();

      function advance() {
        const cur = order[idx];
        cur.classList.add("read");
        const lineEnd =
          idx + 1 < order.length && order[idx + 1]._li !== cur._li;
        idx++;
        markTrack();
        if (idx >= order.length) {
          state.locked = true;
          stopNudge();
          if (teach) {
            setSwMood("point");
            play(audioFor(slide, "explain") || null, () => {
              setNavActive(true);
            });
          } else {
            if (slide.phase === "mastery") {
              state.masteryAttempts++;
              if (state.attempts === 0) state.masteryHits++;
            }
            SwiftPAL.emit(d.signal_name || "read_path_first_try", {
              slide_id: slide.id,
              phase: slide.phase,
              value: !revealedAny,
              first_try: state.attempts === 0,
              attempts: state.attempts + 1,
            });
            celebrateThenAdvance(slide, revealedAny);
          }
          return;
        }
        const nxt = order[idx];
        if (lineEnd) {
          moveBuddyTo(nxt, true, () => {
            if (teach) {
              play(audioFor(slide, "sweep") || null, () => nudgeNext());
            } else nudgeNext();
          });
        } else {
          moveBuddyTo(nxt, false, () => nudgeNext());
        }
      }
      function glowNext(ms) {
        const g = order[idx];
        if (!g) return;
        g.classList.add("reveal-glow");
        setTimeout(() => g.classList.remove("reveal-glow"), ms || 900);
      }

      order.forEach((card) => {
        card.onclick = () => {
          if (state.locked) return;
          if (card === order[idx]) {
            wrongStreak = 0;
            sfxTap();
            advance();
          } else {
            state.attempts++;
            card.classList.add("shake");
            setTimeout(() => card.classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            $("hintBtn").classList.add("show");
            if (++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)) {
              revealedAny = true;
              wrongStreak = 0;
              glowNext(1100);
              play(
                audioFor(slide, "reveal") || audioFor(slide, "hint") || null,
                () => {},
              );
              setTimeout(() => {
                if (!state.locked) advance();
              }, 1050); // demonstrate: never stuck
            } else if (state.attempts >= 2) {
              glowNext();
              play(audioFor(slide, "hint") || null, () => {});
            } else dragWrong(slide);
          }
        };
      });

      $("hintBtn").onclick = () => {
        if (!state.locked) glowNext();
      };
      if (teach) {
        state.replayAudio = () =>
          playChain([audioFor(slide, "intro")].filter(Boolean), 0);
        play(audioFor(slide, "intro") || null, () => nudgeNext());
      }
    },
  },

  TAP_READ_ARROW: {
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "read-stim";
      stim.style.cursor = "pointer";
      stim.appendChild(readPage(d.lines, { buddy: false }));
      stim.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "read_arrow_first_try",
        stimulus: stim,
        columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt) => opt.dir === (d.answer || "right"),
        optionRenderer: (opt) => {
          const c = document.createElement("div");
          c.innerHTML = `<span class="read-arrow read-arrow-${opt.dir}">${opt.glyph}</span>`;
          return c;
        },
        mastery: slide.phase === "mastery",
      });
    },
  },

  TAP_READ_POS: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "read-stage pos";
      wrap.style.cursor = "pointer";
      const page = readPage(d.lines, {
        buddy: !!d.buddy_at,
        buddy_img: d.buddy_img,
        buddy_emoji: d.buddy_emoji,
      });
      wrap.appendChild(page);
      host.appendChild(wrap);
      if (d.done_lines) {
        page._cards.forEach((c) => {
          if (d.done_lines.includes(c._li)) c.classList.add("read");
        });
      }
      wrap.onclick = (e) => {
        if (e.target.closest(".read-dot")) return;
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };

      state.locked = false;
      state.attempts = 0;
      let wrongStreak = 0;
      $("navBtn").style.display = "none";
      setNavActive(false);

      const dots = (d.dots || []).map((spec) => {
        const dot = document.createElement("div");
        dot.className = "read-dot";
        dot._spec = spec;
        page.appendChild(dot);
        return dot;
      });
      // FIX_TRACKING: a "confused reader" finger shown at the WRONG spot (data.confused_at) — the child
      // taps where the finger SHOULD go. Purely decorative marker; the answer is still the correct dot.
      const confused = d.confused_at
        ? (function () {
            const c = document.createElement("div");
            c.className = "read-confused";
            c.innerHTML =
              '<span class="rc-x">✗</span><span class="rc-finger">👆</span>';
            page.appendChild(c);
            return c;
          })()
        : null;
      function lineCards(li) {
        return page._cards.filter((c) => c._li === li);
      }
      function anchorXY(s) {
        const lc = lineCards(s.li);
        const a = s.side === "start" ? lc[0] : lc[lc.length - 1];
        return {
          x:
            s.side === "start"
              ? a.offsetLeft - 30
              : a.offsetLeft + a.offsetWidth + 8,
          y: a.offsetTop + a.offsetHeight / 2 - 17,
        };
      }
      function placeDots() {
        dots.forEach((dot) => {
          const p = anchorXY(dot._spec);
          dot.style.left = p.x + "px";
          dot.style.top = p.y + "px";
        });
        if (confused) {
          const p = anchorXY(d.confused_at);
          confused.style.left = p.x - 8 + "px";
          confused.style.top = p.y + 20 + "px";
        }
        if (page._buddy && d.buddy_at) {
          const lc = lineCards(d.buddy_at.li);
          const a = d.buddy_at.side === "end" ? lc[lc.length - 1] : lc[0];
          page._buddy.style.left =
            a.offsetLeft +
            a.offsetWidth / 2 -
            page._buddy.offsetWidth / 2 +
            "px";
          page._buddy.style.top = a.offsetTop + a.offsetHeight + 4 + "px";
        }
      }
      placeDots();
      requestAnimationFrame(placeDots); // sync (rAF is throttled in bg) + rAF backup after layout

      const correctDot = () => dots.find((x) => x._spec.correct);
      dots.forEach((dot) => {
        dot.onclick = () => {
          if (state.locked) return;
          if (dot._spec.correct) {
            state.locked = true;
            dot.classList.add("hit");
            sfxCorrect();
            confettiCannon();
            setSwMood("happy");
            if (slide.phase === "mastery") {
              state.masteryAttempts++;
              if (state.attempts === 0) state.masteryHits++;
            }
            SwiftPAL.emit(d.signal_name || "read_pos_first_try", {
              slide_id: slide.id,
              phase: slide.phase,
              value: true,
              first_try: state.attempts === 0,
              attempts: state.attempts + 1,
            });
            play(audioFor(slide, "correct") || null, () =>
              setTimeout(() => completeSlide(true), 700),
            );
          } else {
            state.attempts++;
            dot.classList.add("miss", "shake");
            setTimeout(() => dot.classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            $("hintBtn").classList.add("show");
            if (++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)) {
              state.locked = true;
              correctDot().classList.add("reveal-glow");
              play(
                audioFor(slide, "reveal") || audioFor(slide, "hint") || null,
                () => setTimeout(() => completeSlide(false), 900),
              );
            } else if (state.attempts >= 2) {
              const cd = correctDot();
              cd.classList.add("reveal-glow");
              setTimeout(() => cd.classList.remove("reveal-glow"), 900);
              play(audioFor(slide, "hint") || null, () => {});
            } else dragWrong(slide);
          }
        };
      });
      $("hintBtn").onclick = () => {
        if (state.locked) return;
        const cd = correctDot();
        cd.classList.add("reveal-glow");
        setTimeout(() => cd.classList.remove("reveal-glow"), 900);
        play(audioFor(slide, "hint") || null, () => {});
      };
    },
  },

  /* ==== READ_TRACE (H03 finger-tracking) — the child PRESSES and DRAGS a finger across the words in
     reading order (L→R, then sweeps down-left to the next line's start). Each word lights as the finger
     reaches it, in ORDER; the next expected word glows to guide the swipe; a buddy rides along. This is
     the authentic "track with your finger" gesture (vs watch-a-dot / tap-in-order). Forgiving: lifting
     the finger keeps progress; wrong/backward moves are ignored; tapping a word also advances it (a11y).
     ADDITIVE (r4h); reuses readPage. ==== */
  READ_TRACE: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "read-stage trace";
      const page = readPage(d.lines, {
        buddy: true,
        buddy_img: d.buddy_img,
        buddy_emoji: d.buddy_emoji,
      });
      wrap.appendChild(page);
      host.appendChild(wrap);
      const order = page._cards,
        buddy = page._buddy;
      let idx = 0,
        tracing = false,
        revealed = false;
      state.locked = false;
      state.attempts = 0;
      $("navBtn").style.display = "none";
      setNavActive(false);
      state.replayAudio = () =>
        play(audioFor(slide, "prompt") || null, () => {});

      function moveBuddy(el, sweep) {
        buddy.classList.toggle("sweep", !!sweep);
        buddy.style.left =
          el.offsetLeft + el.offsetWidth / 2 - buddy.offsetWidth / 2 + "px";
        buddy.style.top = el.offsetTop + el.offsetHeight + 4 + "px";
      }
      function glowNext() {
        order.forEach((o) => o.classList.remove("tracking"));
        if (idx < order.length) order[idx].classList.add("tracking");
      }
      moveBuddy(order[0], false);
      requestAnimationFrame(() => moveBuddy(order[0], false));
      glowNext();

      function reach(el) {
        if (state.locked || el !== order[idx]) return; // only the NEXT expected word advances (enforces order)
        const prev = idx > 0 ? order[idx - 1] : null;
        const sweep = !!(prev && prev._li !== el._li);
        el.classList.add("read");
        el.classList.remove("tracking");
        sfxTap();
        idx++;
        moveBuddy(el, sweep);
        glowNext();
        if (idx >= order.length) {
          state.locked = true;
          if (slide.phase === "mastery") {
            state.masteryAttempts++;
            if (state.attempts === 0) state.masteryHits++;
          }
          SwiftPAL.emit(d.signal_name || "read_trace_first_try", {
            slide_id: slide.id,
            phase: slide.phase,
            value: !revealed,
            first_try: state.attempts === 0,
            attempts: state.attempts + 1,
          });
          celebrateThenAdvance(slide, revealed);
        }
      }
      function wordAt(x, y) {
        const el = document.elementFromPoint(x, y);
        const w = el && el.closest && el.closest(".read-word");
        return w && order.includes(w) ? w : null;
      }
      function pt(e) {
        return e.touches && e.touches[0] ? e.touches[0] : e;
      }
      wrap.addEventListener("pointerdown", (e) => {
        if (state.locked) return;
        tracing = true;
        try {
          wrap.setPointerCapture(e.pointerId);
        } catch (_) {}
        const w = wordAt(pt(e).clientX, pt(e).clientY);
        if (w) reach(w);
        e.preventDefault();
      });
      wrap.addEventListener("pointermove", (e) => {
        if (!tracing || state.locked) return;
        const w = wordAt(pt(e).clientX, pt(e).clientY);
        if (w) reach(w);
      });
      wrap.addEventListener("pointerup", () => {
        tracing = false;
      });
      order.forEach((w) => w.addEventListener("click", () => reach(w))); // tap fallback (a11y / mouse)

      $("hintBtn").onclick = () => {
        if (state.locked || idx >= order.length) return;
        order[idx].classList.add("reveal-glow");
        setTimeout(() => order[idx].classList.remove("reveal-glow"), 1000);
      };
      play(audioFor(slide, "prompt") || null, () => {});
    },
  },

  /* ==== CLASSROOM LABELS (H03 environmental print — कक्षा के लेबल). ADDITIVE (r4g); no existing module
     touched. Beginning sight-word/label recognition: the child ties a printed Hindi word to a classroom
     object. MEET_LABEL teaches BY DOING (tap each object to reveal + hear its label); TAP_LABEL_SCENE
     (hear the word → tap the matching labeled object) and TAP_WORD_FOR_OBJECT (see the object → tap its
     printed name) test both directions; the drag match reuses MATCH_DRAG_N (word tiles → objects). All
     picks ride the standard mountTapOptions answer contract. ==== */
  MEET_LABEL: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "label-set";
      const cards = (d.items || []).map((it) => {
        const c = document.createElement("div");
        c.className = "label-card";
        c.innerHTML =
          imgOrEmoji(it.img, it.emoji, "label-img", "label-emoji") +
          `<span class="label-lbl">${it.word_hi}</span>`; // NOT .ink-glyph: it would vertical-center within the whole card (onto the image)
        c._it = it;
        wrap.appendChild(c);
        return c;
      });
      host.appendChild(wrap);
      state.ownsAudio = true;
      state.locked = false;
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (state.locked) completeSlide(true);
      };
      const tapped = new Set();
      function nudgeNext() {
        const nx = cards.find((c) => !c.classList.contains("said"));
        if (nx) pointNudgeAt(nx);
        else stopNudge();
      }
      state.replayAudio = () =>
        play(audioFor(slide, "intro") || null, () => {});
      cards.forEach((c, i) => {
        c.classList.add("tappable");
        c.onclick = () => {
          if (state.locked) return;
          const src = "assets/Audio/" + c._it.audio + "." + AUDIO_EXT;
          if (c.classList.contains("said")) {
            play(src);
            return;
          }
          c.classList.add("said", "reveal-glow");
          setTimeout(() => c.classList.remove("reveal-glow"), 700);
          sfxTap();
          setSwMood("point");
          tapped.add(i);
          play(src, () => {
            if (tapped.size === cards.length) {
              stopNudge();
              state.locked = true;
              setSwMood("happy");
              setNavActive(true);
            } else nudgeNext();
          });
        };
      });
      play(audioFor(slide, "intro") || null, () => nudgeNext());
    },
  },

  TAP_LABEL_SCENE: {
    // hear a word → tap the matching labeled object (picture + Hindi word-label under each).
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "stimulus-pic";
      stim.style.cursor = "pointer";
      stim.innerHTML = `<span class="emoji">🔊</span><span class="lbl">सुनो</span>`;
      stim.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "prompt") || null);
      };
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "label_scene_first_try",
        stimulus: stim,
        columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery",
      });
    },
  },

  TAP_WORD_FOR_OBJECT: {
    // see an object (no label) → tap its correct printed NAME (word cards; each speaks on tap).
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "stimulus-pic label-obj-stim";
      stim.innerHTML = imgOrEmoji(d.object.img, d.object.emoji, "img", "emoji"); // NO name shown (that's the answer)
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "word_for_object_first_try",
        stimulus: stim,
        columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => {
          const c = document.createElement("div");
          c.innerHTML = `<span class="label-word ink-glyph">${opt.word_hi}</span>`;
          return c;
        },
        mastery: slide.phase === "mastery",
      });
    },
  },

  /* ==== USE_INTERFACE (H03 symbol/button recognition) — a working mini DEVICE the child operates: a
     screen + control buttons (▶️ ⏸️ 🔊 🔇 ✅ ❌). The prompt names an action ("गाना चलाओ" / "आवाज़ बंद
     करो"); the child taps the matching button and the device REACTS (screen plays/stops, sound mutes).
     Correct = the button whose role === data.target_role → react + confetti + advance. Wrong button =
     buzz + try-again → hint → reveal (demonstrate) ladder. Buttons are icon glyphs (content-true, no
     art). ADDITIVE (r4i); no existing module touched. data:{screen_emoji, buttons:[{role,glyph,glyph_on?,
     label}], target_role, react:"play"|"pause"|"mute"}. ==== */
  USE_INTERFACE: {
    mount(host, slide) {
      const d = slide.data || {};
      const wrap = document.createElement("div");
      wrap.className = "ui-stage";
      const device = document.createElement("div");
      device.className = "ui-device";
      const screen = document.createElement("div");
      screen.className =
        "ui-screen" +
        (d.state_playing ? " playing" : "") +
        (d.state_muted ? " muted" : "");
      screen.innerHTML =
        `<span class="ui-screen-emoji">${d.screen_emoji || "🎵"}</span>` +
        `<span class="ui-wave">◗ ◖ ◗ ◖ ◗</span>`;
      const bar = document.createElement("div");
      bar.className = "ui-bar";
      const btns = (d.buttons || []).map((b) => {
        const el = document.createElement("button");
        el.className = "ui-btn ui-" + b.role;
        el._b = b;
        el.innerHTML =
          `<span class="ui-glyph">${b.glyph}</span>` +
          (b.label ? `<span class="ui-blabel">${b.label}</span>` : "");
        bar.appendChild(el);
        return el;
      });
      device.appendChild(screen);
      device.appendChild(bar);
      wrap.appendChild(device);
      host.appendChild(wrap);

      state.locked = false;
      state.attempts = 0;
      let wrongStreak = 0;
      $("navBtn").style.display = "none";
      setNavActive(false);
      state.replayAudio = () =>
        play(audioFor(slide, "prompt") || null, () => {});
      const correctBtn = () => btns.find((x) => x._b.role === d.target_role);
      function react() {
        if (d.react === "play") screen.classList.add("playing");
        else if (d.react === "pause") screen.classList.remove("playing");
        else if (d.react === "mute") screen.classList.add("muted");
        const cb = correctBtn();
        if (cb && cb._b.glyph_on)
          cb.querySelector(".ui-glyph").textContent = cb._b.glyph_on;
      }
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, () => {});
      btns.forEach((el) => {
        el.onclick = () => {
          if (state.locked) return;
          if (el._b.role === d.target_role) {
            state.locked = true;
            el.classList.add("hit");
            react();
            sfxCorrect();
            confettiCannon();
            setSwMood("happy");
            if (slide.phase === "mastery") {
              state.masteryAttempts++;
              if (state.attempts === 0) state.masteryHits++;
            }
            SwiftPAL.emit(d.signal_name || "use_interface_first_try", {
              slide_id: slide.id,
              phase: slide.phase,
              value: true,
              first_try: state.attempts === 0,
              attempts: state.attempts + 1,
            });
            play(audioFor(slide, "correct") || null, () =>
              setTimeout(() => completeSlide(true), 900),
            );
          } else {
            state.attempts++;
            el.classList.add("miss", "shake");
            setTimeout(() => el.classList.remove("shake", "miss"), 450);
            SwiftPAL.emit("answer_wrong", {
              slide_id: slide.id,
              phase: slide.phase,
              attempts: state.attempts,
            });
            $("hintBtn").classList.add("show");
            if (++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)) {
              state.locked = true;
              correctBtn().classList.add("reveal-glow");
              play(
                audioFor(slide, "reveal") || audioFor(slide, "hint") || null,
                () =>
                  setTimeout(() => {
                    react();
                    completeSlide(false);
                  }, 900),
              );
            } else if (state.attempts >= 2) {
              const cb = correctBtn();
              cb.classList.add("reveal-glow");
              setTimeout(() => cb.classList.remove("reveal-glow"), 900);
              play(audioFor(slide, "hint") || null, () => {});
            } else dragWrong(slide);
          }
        };
      });
      $("hintBtn").onclick = () => {
        if (state.locked) return;
        const cb = correctBtn();
        cb.classList.add("reveal-glow");
        setTimeout(() => cb.classList.remove("reveal-glow"), 900);
        play(audioFor(slide, "hint") || null, () => {});
      };
    },
  },

  /* ==== SYLLABLE CLAPPING (H02 phonological awareness — शब्दों को अक्षरों में बाँटकर ताली से गिनना).
     ADDITIVE (r4j); no existing module touched. No-मात्रा words; one clap per अक्षर.
       MEET_SYLLABLE     teach BY DOING: tap each akshar tile → hear its sound + a clap; then Swiftie
                         states "<शब्द> में N अक्षर — N ताली!". Print↔sound↔count in one beat.
       SYLLABLE_CLAP     PRODUCE test: hear the word (picture + 🔊), tap the DRUM once per akshar, then
                         "हो गया". exact = celebrate; wrong (too few/many — the misconception) = replay
                         the word SEGMENTED (क-म-ल, one clap each) + reset; reveal-demo after max_attempts.
       TAP_SYLLABLE_COUNT pick: hear the word → tap the NUMERAL (1/2/3) matching the akshar count
                         (dual-coded numeral+hand via numFingerCell; rides the mountTapOptions contract).
     Audio roles for the two produce modules are NON-autochain (intro/word/explain) so autoPlayChain
     doesn't double-fire; each sets state.replayAudio so the 🔊 header chip re-plays the word. ==== */
  MEET_SYLLABLE: {
    mount(host, slide) {
      const d = slide.data || {};
      const aks = d.aksharas || [];
      const wrap = document.createElement("div");
      wrap.className = "syl-meet";
      const pic = document.createElement("div");
      pic.className = "syl-pic";
      pic.innerHTML = imgOrEmoji(
        d.img,
        d.emoji,
        "syl-pic-img",
        "syl-pic-emoji",
      );
      wrap.appendChild(pic);
      const row = document.createElement("div");
      row.className = "syl-tiles";
      const tiles = aks.map((a) => {
        const t = document.createElement("div");
        t.className = "syl-tile tappable";
        t.innerHTML = `<span class="syl-ch ink-glyph">${a.ch}</span>`;
        row.appendChild(t);
        return t;
      });
      wrap.appendChild(row);
      const dots = document.createElement("div");
      dots.className = "syl-dots";
      const dotEls = aks.map(() => {
        const s = document.createElement("span");
        s.className = "syl-dot";
        dots.appendChild(s);
        return s;
      });
      wrap.appendChild(dots);
      host.appendChild(wrap);

      state.ownsAudio = true;
      state.locked = false;
      setNavActive(false);
      $("navBtn").onclick = () => {
        if (state.locked) completeSlide(true);
      };
      state.replayAudio = () =>
        play(
          audioFor(slide, "word") || audioFor(slide, "intro") || null,
          () => {},
        );
      let done = 0;
      const nudgeNext = () => {
        const nx = tiles.find((t) => !t.classList.contains("said"));
        if (nx) pointNudgeAt(nx);
        else stopNudge();
      };
      tiles.forEach((t, i) => {
        t.onclick = () => {
          if (state.locked) return;
          const src = "assets/Audio/" + aks[i].audio + "." + AUDIO_EXT;
          if (t.classList.contains("said")) {
            play(src);
            return;
          }
          t.classList.add("said", "reveal-glow");
          setTimeout(() => t.classList.remove("reveal-glow"), 500);
          dotEls[i].classList.add("on");
          sfxTap();
          btThunk(i + 1);
          setSwMood("point");
          done++;
          play(src, () => {
            if (done === tiles.length) {
              stopNudge();
              state.locked = true;
              setSwMood("happy");
              play(audioFor(slide, "explain") || null, () =>
                setNavActive(true),
              );
            } else nudgeNext();
          });
        };
      });
      playChain(
        [audioFor(slide, "intro"), audioFor(slide, "word")].filter(Boolean),
        0,
        () => nudgeNext(),
      );
    },
  },

  SYLLABLE_CLAP: {
    mount(host, slide) {
      const d = slide.data || {};
      const target = d.count || (d.aksharas || []).length;
      const aks = d.aksharas || [];
      const wrap = document.createElement("div");
      wrap.className = "syl-clap";
      const stim = document.createElement("div");
      stim.className = "syl-clap-stim";
      stim.innerHTML =
        imgOrEmoji(d.img, d.emoji, "syl-pic-img", "syl-pic-emoji") +
        `<span class="syl-spk">🔊</span>`;
      stim.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "word") || null);
      };
      wrap.appendChild(stim);
      const dotRow = document.createElement("div");
      dotRow.className = "syl-clap-dots";
      wrap.appendChild(dotRow);
      const ctrls = document.createElement("div");
      ctrls.className = "syl-clap-ctrls";
      const reset = document.createElement("button");
      reset.className = "syl-reset";
      reset.textContent = "↺";
      const drum = document.createElement("button");
      drum.className = "syl-drum";
      drum.innerHTML = imgOrEmoji(
        d.drum_img,
        "🥁",
        "syl-drum-img",
        "syl-drum-emoji",
      );
      const doneBtn = document.createElement("button");
      doneBtn.className = "syl-done";
      doneBtn.innerHTML = `<span class="sd-ck">✓</span><span class="sd-lbl">हो गया</span>`;
      ctrls.appendChild(reset);
      ctrls.appendChild(drum);
      ctrls.appendChild(doneBtn);
      wrap.appendChild(ctrls);
      host.appendChild(wrap);

      let claps = 0;
      state.attempts = 0;
      state.locked = false;
      const maxA =
        (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      $("navBtn").style.display = "none";
      setNavActive(false);
      state.replayAudio = () => play(audioFor(slide, "word") || null, () => {});
      const renderDots = () => {
        dotRow.innerHTML = "";
        for (let i = 0; i < claps; i++) {
          const s = document.createElement("span");
          s.className = "syl-cdot on";
          dotRow.appendChild(s);
        }
        doneBtn.classList.toggle("ready", claps > 0);
      };
      const segmentDemo = (cb) => {
        // demonstrate the correct segmentation: क (clap) - म (clap) - ल (clap)
        let i = 0;
        claps = 0;
        renderDots();
        const step = () => {
          if (i >= aks.length) {
            if (cb) cb();
            return;
          }
          claps++;
          renderDots();
          btThunk(i + 1);
          sfxTap();
          play("assets/Audio/" + aks[i].audio + "." + AUDIO_EXT, () => {
            i++;
            setTimeout(step, 260);
          });
        };
        step();
      };
      drum.onclick = () => {
        if (state.locked) return;
        claps++;
        renderDots();
        sfxTap();
        btThunk(claps);
        drum.classList.add("hit");
        setTimeout(() => drum.classList.remove("hit"), 140);
      };
      reset.onclick = () => {
        if (state.locked) return;
        claps = 0;
        renderDots();
      };
      doneBtn.onclick = () => {
        if (state.locked || claps === 0) return;
        if (claps === target) {
          state.locked = true;
          if (slide.phase === "mastery") {
            state.masteryAttempts++;
            if (state.attempts === 0) state.masteryHits++;
          }
          SwiftPAL.emit(d.signal_name || "syllable_clap_first_try", {
            slide_id: slide.id,
            phase: slide.phase,
            value: true,
            first_try: state.attempts === 0,
            attempts: state.attempts + 1,
            latency_ms: Date.now() - state.slideStart,
          });
          sfxCorrect();
          confettiCannon();
          setSwMood("celebrate");
          play(audioFor(slide, "correct") || null, () =>
            setTimeout(() => completeSlide(true), 800),
          );
        } else {
          state.attempts++;
          sfxWrongSoft();
          setSwMood("tryagain");
          $("hintBtn").classList.add("show");
          SwiftPAL.emit("answer_wrong", {
            slide_id: slide.id,
            phase: slide.phase,
            attempts: state.attempts,
          });
          if (state.attempts >= maxA) {
            state.locked = true;
            play(audioFor(slide, "reveal") || null, () =>
              segmentDemo(() => setTimeout(() => completeSlide(false), 900)),
            );
          } else {
            play(audioFor(slide, "try_again") || null, () =>
              segmentDemo(() => {}),
            );
          }
        }
      };
      $("hintBtn").onclick = () => {
        if (state.locked) return;
        state.hintUsed = true;
        play(audioFor(slide, "hint") || null, () => segmentDemo(() => {}));
      };
      playChain(
        [audioFor(slide, "intro"), audioFor(slide, "word")].filter(Boolean),
        0,
        () => {},
      );
    },
  },

  TAP_SYLLABLE_COUNT: {
    mount(host, slide) {
      const d = slide.data || {};
      const stim = document.createElement("div");
      stim.className = "syl-clap-stim";
      stim.style.cursor = "pointer";
      stim.innerHTML =
        imgOrEmoji(d.img, d.emoji, "syl-pic-img", "syl-pic-emoji") +
        `<span class="syl-spk">🔊</span>`;
      stim.onclick = () => {
        state.audioReplays++;
        play(audioFor(slide, "word_name") || audioFor(slide, "prompt") || null);
      };
      mountTapOptions({
        slide,
        host,
        signalName: d.signal_name || "syllable_count_first_try",
        stimulus: stim,
        columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt) => opt.n === d.count,
        optionRenderer: (opt) => {
          const c = document.createElement("div");
          c.className = "syl-numopt";
          let dots = "";
          for (let i = 0; i < opt.n; i++)
            dots += `<span class="syl-ndot"></span>`;
          c.innerHTML = `<span class="syl-numeral">${devNumeral(opt.n)}</span><span class="syl-ndots">${dots}</span>`;
          return c;
        },
        mastery: slide.phase === "mastery",
      });
    },
  },

  /* ==== DECODE_TAP (H04 L02 — बिना-मात्रा वाले 2-अक्षर शब्दों को अक्षर-ध्वनि से decode करना).
     ADDITIVE (r4k); no existing module touched. The "decode-tap reader": a matra-free 2-letter word
     is shown as ORDERED letter tiles with a + joiner; the child taps each tile LEFT→RIGHT to hear its
     अक्षर-ध्वनि (/घ/, /र/), then taps the BLEND button (जोड़ो) → the tiles merge, the FULL word is
     spoken (घर) and its picture is revealed + celebrates. Ordered tapping directly counters the
     letter-reversal misconception (नल→लन): only the NEXT expected tile is active; tapping ahead just
     re-points the nudge at the correct tile — never a red ✗ (produce/teach family; the world enacts).
     modes: "teach" (picture shown throughout, Swiftie EXPLAINs the blend) · "guided"/"independent"/
     "mastery" (picture HIDDEN until blend, so the child must decode to reveal it — an honest read).
     data:{ word_hi, img, emoji, aksharas:[{ch,audio}], mode, signal_name }.
     audio roles (NON-autochain → set via state.ownsAudio): intro|prompt (open), blend_prompt (nudge to
     the blend button), word (the blended word), explain (teach) / correct (test). ==== */
  DECODE_TAP: {
    mount(host, slide) {
      const d = slide.data || {};
      const aks = d.aksharas || [];
      const mode = d.mode || "guided";
      const showPic = mode === "teach" || mode === "guided";
      const wrap = document.createElement("div");
      wrap.className = "decode-stage";
      const pic = document.createElement("div");
      pic.className = "decode-pic" + (showPic ? "" : " hidden");
      pic.innerHTML = imgOrEmoji(
        d.img,
        d.emoji,
        "decode-pic-img",
        "decode-pic-emoji",
      );
      wrap.appendChild(pic);
      const row = document.createElement("div");
      row.className = "decode-tiles";
      const tiles = [];
      aks.forEach((a, i) => {
        if (i > 0) {
          const plus = document.createElement("span");
          plus.className = "decode-plus";
          plus.textContent = "+";
          row.appendChild(plus);
        }
        const t = document.createElement("div");
        t.className = "decode-tile";
        t.innerHTML = `<span class="decode-ch ink-glyph">${a.ch}</span>`;
        row.appendChild(t);
        tiles.push(t);
      });
      wrap.appendChild(row);
      const blend = document.createElement("button");
      blend.className = "decode-blend";
      blend.innerHTML = `<span class="db-arrow">🔀</span><span class="db-lbl">${d.blend_label || "जोड़ो"}</span>`;
      wrap.appendChild(blend);
      const wordOut = document.createElement("div");
      wordOut.className = "decode-word hidden";
      wordOut.innerHTML = `<span class="ink-glyph">${d.word_hi || ""}</span><span class="dw-spk">🔊</span>`;
      wrap.appendChild(wordOut);
      host.appendChild(wrap);

      state.ownsAudio = true;
      state.locked = false;
      state.attempts = 0;
      setNavActive(false); // produce/teach family: keep आगे visible (mountSlide restored display), just gated
      const wordSrc = () => audioFor(slide, "word") || null;
      state.replayAudio = () => play(wordSrc(), () => {});
      wordOut.onclick = () => {
        state.audioReplays++;
        play(wordSrc());
      };

      let next = 0,
        blended = false;
      const nudgeActive = () => {
        if (blended) {
          stopNudge();
          return;
        }
        if (next < tiles.length) pointNudgeAt(tiles[next]);
        else pointNudgeAt(blend);
      };

      tiles.forEach((t, i) => {
        t.onclick = () => {
          if (state.locked || blended) return;
          if (t.classList.contains("said")) {
            play("assets/Audio/" + aks[i].audio + "." + AUDIO_EXT);
            return;
          }
          if (i !== next) {
            sfxTap();
            pointNudgeAt(tiles[next]);
            return;
          } // out-of-order → re-point (reversal guard)
          t.classList.add("said", "reveal-glow");
          setTimeout(() => t.classList.remove("reveal-glow"), 500);
          sfxTap();
          btThunk(i + 1);
          setSwMood("point");
          next++;
          play("assets/Audio/" + aks[i].audio + "." + AUDIO_EXT, () => {
            if (next >= tiles.length) {
              blend.classList.add("ready");
              setSwMood("point");
              play(audioFor(slide, "blend_prompt") || null, () =>
                nudgeActive(),
              );
            } else nudgeActive();
          });
        };
      });

      blend.onclick = () => {
        if (state.locked || blended) {
          return;
        }
        if (next < tiles.length) {
          nudgeActive();
          return;
        } // must decode every tile first
        blended = true;
        state.locked = true;
        stopNudge();
        tiles.forEach((t) => t.classList.add("merge"));
        row
          .querySelectorAll(".decode-plus")
          .forEach((p) => p.classList.add("gone"));
        blend.classList.add("gone");
        wordOut.classList.remove("hidden");
        wordOut.classList.add("pop");
        if (!showPic) {
          pic.classList.remove("hidden");
          pic.classList.add("pop");
        }
        sfxCorrect();
        confettiCannon();
        setSwMood("celebrate");
        if (slide.phase === "mastery") {
          state.masteryAttempts++;
          state.masteryHits++;
        }
        SwiftPAL.emit(d.signal_name || "decode_tap_first_try", {
          slide_id: slide.id,
          phase: slide.phase,
          value: true,
          first_try: true,
          word: d.word_hi,
          latency_ms: Date.now() - state.slideStart,
        });
        play(wordSrc(), () => {
          play(
            audioFor(slide, mode === "teach" ? "explain" : "correct") || null,
            () => setNavActive(true),
          );
        });
      };
      $("navBtn").onclick = () => {
        if (blended) completeSlide(true);
      };
      playChain(
        [audioFor(slide, "intro"), audioFor(slide, "prompt")].filter(Boolean),
        0,
        () => nudgeActive(),
      );
    },
  },
};

/* VACHAN (एकवचन/बहुवचन) + any 2-category attribute reuse the GENERIC gender modules — identical
   mechanic, just different labels. A vachan game authors these types with the category in the
   "gender" field (e.g. "S"/"P"), the two labels, and (for pairs) f=singular / m=plural; it then
   inherits immediate tap-to-answer feedback, speak-word-on-tap, layered hints, and the engine
   guard for free. Named *_VACHAN (not *_NUMBER) to avoid colliding with MEET_NUMBER = counting. */
/* TRACK_FOLLOW (H03 tracking) = READ_PATH with a glowing "animated tracker" cursor (guide) that rides
   the current word so the child follows word-by-word. Distinct type (own variety bucket); same mount —
   READ_PATH reads slide.type to switch the glow on. ADDITIVE (r4f). */
SlideModules.TRACK_FOLLOW = SlideModules.READ_PATH;
/* FIX_TRACKING (H03) = TAP_READ_POS with a "confused reader" finger shown at the wrong spot
   (data.confused_at); the child taps where the finger SHOULD go. Distinct type (own variety bucket);
   same mount. ADDITIVE (r4h). */
SlideModules.FIX_TRACKING = SlideModules.TAP_READ_POS;
SlideModules.VACHAN_INTRO = SlideModules.GENDER_INTRO;
SlideModules.MEET_VACHAN = SlideModules.MEET_GENDER;
SlideModules.TAP_VACHAN = SlideModules.TAP_GENDER;
SlideModules.TAP_PICTURE_BY_VACHAN = SlideModules.TAP_PICTURE_BY_GENDER;
SlideModules.SORT_VACHAN = SlideModules.SORT_GENDER;
SlideModules.MATCH_VACHAN_PAIRS = SlideModules.MATCH_GENDER_PAIRS;

/* ---------- 13. CONTROLLER ---------- */
function clearHost() {
  $("slideHost").innerHTML = "";
  $("hintBtn").classList.remove("show");
  $("hintBtn").disabled = false;
  setNavActive(false);
  stopNudge();
  stopAudio();
}

function mountSlide(idx) {
  state.idx = idx;
  state.slideStart = Date.now();
  state.attempts = 0;
  state.selectedKey = null;
  state.locked = false;
  state.hintUsed = false;
  state.nudgeUsed = false;
  state.scaffoldLevel = 0;
  state.hintActive = false;
  state.audioReplays = 0;
  state.gateNavUntilAudio = false;
  state.endBtnPending = false;
  state.replayAudio = null; // a module may set a slide-specific replay (e.g. teach slides whose
  // audio roles aren't in the autoPlayChain order); else the chip replays the chain
  state.ownsAudio = false; // a module that drives its OWN audio sequence sets this → skip autoPlayChain
  // (else the auto prompt-chain stomps/truncates the module's timed VO)
  const slide = CARD.slides[idx];
  const questionTypes = [
    "EVIDENCE_QA",
    "FIND_EVIDENCE",
    "TAP_IN_SCENE",
    "QTYPE_RECAP",
    "SORT_QTYPE",
  ];
  $("stage").classList.toggle(
    "story-reading",
    slide.type === "STORY_READALONG",
  );
  $("stage").classList.toggle(
    "question-layout",
    questionTypes.includes(slide.type),
  );
  clearHost();

  // header prompt
  $("promptText").textContent = slide.prompt_hi || "";
  $("promptText").classList.toggle("compact", (slide.prompt_hi || "").length > 65);

  // Hint button stays HIDDEN until the learner makes a wrong attempt, then it is
  // exposed (graduated scaffold). Mastery uses the SAME scaffold — not excluded.
  $("hintBtn").classList.remove("show");
  $("hintBtn").style.display = "";
  $("navBtn").style.display = ""; // restored by default; tap-to-answer slides hide it themselves
  setSwMood("point"); // Swiftie turns to present each new slide

  SwiftPAL.emit("slide_entered", {
    slide_id: slide.id,
    phase: slide.phase,
    eis: slide.eis,
    type: slide.type,
    idx,
  });

  // audio chip = replay the slide audio. Prefer a module-supplied replay (teach slides own their
  // count_intro/explain sequence, which autoPlayChain deliberately skips), else replay the chain.
  $("audioChip").onclick = () => {
    if (isPlaying || state.hintActive) return;
    state.audioReplays++;
    SwiftPAL.emit("audio_replay", {
      slide_id: slide.id,
      phase: slide.phase,
      count: state.audioReplays,
    });
    if (state.replayAudio) state.replayAudio();
    else autoPlayChain(slide);
  };

  // mount the type
  const mod = SlideModules[slide.type];
  if (!mod) {
    console.error("[engine] no module for", slide.type);
    return;
  }
  mod.mount($("slideHost"), slide);
  // game-feel: animate the slide content in on every mount
  {
    const _sh = $("slideHost");
    _sh.classList.remove("slide-in");
    void _sh.offsetWidth;
    _sh.classList.add("slide-in");
  }

  // vertically ink-centre every Devanagari glyph once the slide has laid out
  requestAnimationFrame(() => centerAllGlyphs($("slideHost")));

  // play the full VO chain automatically (prompt → phoneme/word_name → instruction).
  // If the slide gated its nav button on audio, enable it once the chain finishes
  // (so students can't skip before hearing it). SKIP when the module owns its audio
  // (state.ownsAudio) — else this chain stomps/truncates the module's own timed VO.
  if (!state.ownsAudio) {
    autoPlayChain(slide, () => {
      if (state.gateNavUntilAudio) setNavActive(true);
      if (state.endBtnPending) {
        $("endBtn").classList.add("show");
        state.endBtnPending = false;
      }
    });
  }
}

function completeSlide(success) {
  const slide = CARD.slides[state.idx];
  SwiftPAL.emit("slide_completed", {
    slide_id: slide.id,
    phase: slide.phase,
    success: !!success,
    attempts: state.attempts,
    latency_ms: Date.now() - state.slideStart,
    scaffold_level: state.scaffoldLevel,
    hint_used: state.hintUsed,
    nudge_used: state.nudgeUsed,
    audio_replays: state.audioReplays,
  });
  if (state.idx >= CARD.slides.length - 1) {
    // last slide is CELEBRATION; nothing more
    return;
  }
  mountSlide(state.idx + 1);
}

/* ---------- 14. VALIDATOR (runtime self-check) ---------- */
function runValidator() {
  const missing = (CARD.signals_expected || []).filter(
    (s) => !SwiftPAL.firedSet.has(s),
  );
  SwiftPAL.validatorReport.missing_signals = missing;
  SwiftPAL.validatorReport.passed = missing.length === 0;
  console.log("[validator]", SwiftPAL.validatorReport);
  try {
    window.parent?.postMessage(
      {
        type: "swiftpal:lesson_complete",
        signals: SwiftPAL.signals,
        validatorReport: SwiftPAL.validatorReport,
      },
      "*",
    );
  } catch (e) {}
  // offline self-capture: write the final record to localStorage; optionally POST
  // it to a learning-record endpoint if one is configured AND the device is online.
  SwiftPAL.persist();
  if (TELEMETRY.endpoint && navigator.onLine) {
    try {
      fetch(TELEMETRY.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SwiftPAL.exportResults()),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {}
  }
  // dev banner
  if (new URLSearchParams(location.search).has("dev")) {
    const b = $("devBanner");
    if (missing.length === 0) {
      b.textContent = "✓ all expected signals fired";
      b.className = "dev-banner show ok";
    } else {
      b.textContent = "✗ missing signals: " + missing.join(", ");
      b.className = "dev-banner show";
    }
  }
}

  function buildLandingSky(o){
    var sky = typeof o.container === "string" ? document.querySelector(o.container) : o.container;
    if(!sky) return null;
    sky.textContent = "";
    var maxSize = 0, frag = document.createDocumentFragment();

    o.layers.forEach(function(L, li){
      for(var i = 0; i < o.lanes; i++){
        var a = ((360 / o.lanes) * i + L.rot) * Math.PI / 180;
        var cos = Math.cos(a), sin = Math.sin(a);
        var size = +((o.size[0] + Math.random() * (o.size[1] - o.size[0])) * L.scale).toFixed(2);
        if(size > maxSize) maxSize = size;
        var dur = +(o.dur[0] + Math.random() * (o.dur[1] - o.dur[0])).toFixed(1);
        var el = document.createElement("i");
        el.className = o.shapes[(i + li) % o.shapes.length];
        el.style.cssText =
          "--s:"  + size + "vmax;" +
          "--x1:" + (o.r0 * cos).toFixed(2) + "vmax;--y1:" + (o.r0 * sin).toFixed(2) + "vmax;" +
          "--x2:" + (o.r1 * cos).toFixed(2) + "vmax;--y2:" + (o.r1 * sin).toFixed(2) + "vmax;" +
          "--t:"  + dur + "s;" +
          "--d:-" + (Math.random() * dur).toFixed(1) + "s;" +     // negative = de-sync
          "--g:"  + (o.glow[0] + Math.random() * (o.glow[1] - o.glow[0])).toFixed(1) + "s;" +
          "--gd:-" + (Math.random() * 4).toFixed(1) + "s;" +
          "--o:"  + (o.opacity[0] + Math.random() * (o.opacity[1] - o.opacity[0])).toFixed(2) + ";";
        frag.appendChild(el);
      }
    });
    sky.appendChild(frag);

    // collision proof: lane arc at the tightest radius must be >= 1.5x the largest element
    var arc = (2 * Math.PI * o.r0) / o.lanes, ok = arc >= maxSize * 1.5;
    if(!ok && o.warn !== false){
      console.warn("[animation-kit] sky lanes too tight: arc " + arc.toFixed(2) +
        "vmax vs element " + maxSize.toFixed(2) + "vmax. Reduce lanes or size.");
    }
    return { arc:arc, maxSize:maxSize, safe:ok, count:sky.children.length };
  }


function initLandingSky() {
  buildLandingSky({container: ".sg-sky", lanes: 29,
    layers: [{rot:0,scale:1},{rot:6.2,scale:.62},{rot:-6.2,scale:.55}],
    r0:22,r1:72,size:[.8,2.6],dur:[18,34],glow:[3,4.8],
    opacity:[.62,.92],shapes:["s1","s2","s3","s4","s5"]});
}
/* ---------- 15. BOOT ---------- */
function boot() {
  initLandingSky();
  // god-mode visual theme (opt-in via CARD.theme) — warms the whole stage; scoped CSS under .thm-*
  if (CARD.theme) $("stage").classList.add("thm-" + CARD.theme);
  // banner title = skill name only (strip "(भाग…)" and the ": letters" list)
  $("sgTitle").textContent = (CARD.title.hi || "").split(/[:：(]/)[0].trim();
  // VISUAL-FIRST landing hero: SHOW the concept (shapes row / a finger-hand / an image), not just the title text
  (function () {
    const hero = CARD.landing_hero,
      el = $("sgHero");
    if (!hero || !el) return;
    if (hero.kind === "shapes" && typeof shapeSVG === "function")
      el.innerHTML = (hero.shapes || [])
        .map((s) =>
          shapeSVG(s.shape, {
            color: s.color,
            size: 104,
            rotate: s.rotate || 0,
          }),
        )
        .join("");
    else if (hero.kind === "count") {
      // counting game: preview the WHOLE 1..n sequence — a row of hands (1,2,3…), each with its Arabic numeral
      const hi = Math.min(Math.max(parseInt(hero.n, 10) || 3, 1), 5); // clamp to available hand art (1..5)
      let cells = "";
      for (let i = 1; i <= hi; i++) {
        cells += `<div class="sg-hand-cell">${fingerCount(i, "sg-hand")}<span class="sg-hand-num">${devNumeral(i)}</span></div>`;
      }
      el.innerHTML = cells;
    } else if (hero.kind === "image")
      el.innerHTML = `<img src="${hero.src}" alt="">`;
    if (el.innerHTML) {
      el.classList.add("show");
      $("sgTitle").classList.add("compact");
      const c = el.closest && el.closest(".sg-content");
      if (c) c.classList.add("has-hero");
    }
  })();

  // ----- landing-screen welcome VO (lead review) -----
  // A warm greeting on the title screen. Autoplay is often blocked before a gesture, so we also
  // (a) expose a pulsing 🔊 "listen" button, and (b) fire it on the first pointer-down. The whole
  // greeting lives HERE now (not on slide 0), which also kills the old overlap glitch where the
  // landing VO and slide-0 VO could talk over each other.
  const landSrc =
    (CARD.assets && CARD.assets.audio && CARD.assets.audio["vo_landing"]) ||
    "assets/Audio/vo_landing." + AUDIO_EXT;
  const playLanding = () => {
    if (!$("startGate").classList.contains("hidden")) play(landSrc, () => {});
  };
  const sgVo = $("sgVo");
  if (sgVo)
    sgVo.onclick = (e) => {
      e.stopPropagation();
      playLanding();
    };
  playLanding(); // best-effort autoplay (works once the tab has any interaction)
  window.addEventListener(
    "pointerdown",
    function once() {
      window.removeEventListener("pointerdown", once);
      playLanding();
    },
    { once: true },
  );

  $("sgBtn").onclick = () => {
    stopAudio(); // silence the landing greeting BEFORE slide 0 speaks (no VO overlap)
    _ac(); // unlock/resume WebAudio on the start gesture so the first clip never clips
    mountSlide(0);
  };
  // tapping आगे clears any pending nav-nudge
  $("navBtn").addEventListener("click", () => {
    clearTimeout(state.navNudgeTimer);
    stopNudge();
  });
  // when the web font finishes loading, re-centre glyphs (metrics change vs fallback)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => centerAllGlyphs());
  }
  // dev banner if ?dev=1 — show empty initially
  if (new URLSearchParams(location.search).has("dev")) {
    $("devBanner").textContent = "engine ready · slides=" + CARD.slides.length;
    $("devBanner").className = "dev-banner show";
  }
}
boot();
