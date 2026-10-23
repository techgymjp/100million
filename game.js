(() => {
  'use strict';

  const TOTAL = 10000;          // めくる枚数
  const BILL_VALUE = 10000;     // 1枚あたりの金額
  const BUNDLE_SIZE = 100;      // 1束（100万円）あたりの枚数
  const MAX_FLYING = 14;        // 同時に表示する飛んでいくお札の上限
  const BEST_KEY = '100million.best';
  const SHARE_URL = 'https://techgym.jp/column/claude-code-game-100million/';

  // Android アプリ（Capacitor）で動いているか
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugin = (name) => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null);
  if (NATIVE) document.body.classList.add('native');

  const $ = (id) => document.getElementById(id);
  const els = {
    money: $('money'),
    count: $('count'),
    time: $('time'),
    speed: $('speed'),
    progressBar: $('progressBar'),
    stack: $('stack'),
    topBill: $('topBill'),
    flyLayer: $('flyLayer'),
    hint: $('hint'),
    toast: $('toast'),
    bundleGrid: $('bundleGrid'),
    bundleCount: $('bundleCount'),
    startOverlay: $('startOverlay'),
    startBtn: $('startBtn'),
    bestStart: $('bestStart'),
    resultOverlay: $('resultOverlay'),
    resultTime: $('resultTime'),
    resultDetail: $('resultDetail'),
    resultRank: $('resultRank'),
    bestResult: $('bestResult'),
    retryBtn: $('retryBtn'),
    shareX: $('shareX'),
    shareLine: $('shareLine'),
    shareFb: $('shareFb'),
    shareCopy: $('shareCopy'),
    muteBtn: $('muteBtn'),
    rotateSkip: $('rotateSkip'),
    shareRow: $('shareRow'),
    shareNative: $('shareNative'),
    pauseOverlay: $('pauseOverlay'),
    resumeBtn: $('resumeBtn'),
    quitBtn: $('quitBtn'),
    ruleTap: $('ruleTap'),
    buildInfo: $('buildInfo'),
    adPrivacy: $('adPrivacy'),
  };

  const state = {
    playing: false,   // スタート画面を閉じて操作を受け付けている
    paused: false,
    pausedAt: 0,
    finishes: 0,      // クリアした回数（広告の頻度に使う）
    count: 0,
    startAt: 0,       // 最初の1枚をめくった時刻（0 なら未開始）
    endAt: 0,
    recent: [],       // 直近のめくり時刻（速度表示用）
    rafId: 0,
    muted: false,
  };

  // ---------- 表示ヘルパー ----------
  const yen = (n) => '¥' + n.toLocaleString('ja-JP');

  function formatTime(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const s = Math.floor(totalCs / 100) % 60;
    const m = Math.floor(totalCs / 6000);
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  function formatMoneyJa(n) {
    if (n >= 100000000) return '1億円';
    const man = n / 10000;
    return man.toLocaleString('ja-JP') + '万円';
  }

  // ---------- ベスト記録 ----------
  function loadBest() {
    try {
      const v = Number(localStorage.getItem(BEST_KEY));
      return v > 0 ? v : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveBest(ms) {
    try { localStorage.setItem(BEST_KEY, String(ms)); } catch (_) { /* noop */ }
  }

  function renderBest() {
    const best = loadBest();
    const text = best ? I18N.t('best', { t: formatTime(best) }) : '';
    els.bestStart.textContent = text;
    els.bestResult.textContent = text;
  }

  // ---------- 効果音（WebAudio で合成） ----------
  let audioCtx = null;
  let noiseBuffer = null;
  let longNoiseBuffer = null;

  function makeNoise(sec) {
    const len = Math.floor(audioCtx.sampleRate * sec);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function initAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    noiseBuffer = makeNoise(0.08);
    longNoiseBuffer = makeNoise(1.0);
  }

  // 別アプリへの切り替えや広告の表示中は音を止める
  function suspendAudio() {
    if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
  }
  function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  window.GameAudio = { suspend: suspendAudio, resume: resumeAudio };

  // ノイズを指定フィルタ・エンベロープで鳴らす
  function noiseHit(start, dur, type, freq, q, peak) {
    const src = audioCtx.createBufferSource();
    src.buffer = longNoiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(gain).connect(audioCtx.destination);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  // 100枚ごとの「ガシャーン」（お札を数える機械の作動音）
  function playGasha() {
    if (state.muted || !audioCtx) return;
    const t = audioCtx.currentTime;

    // ガシャ：機構がかみ合う連続クリック
    [0, 0.035, 0.065, 0.09].forEach((d, i) => {
      noiseHit(t + d, 0.05, 'bandpass', 1800 + i * 400, 2, 0.5);
    });

    // ドン：重い衝撃
    noiseHit(t + 0.11, 0.18, 'lowpass', 900, 0.7, 0.9);
    const thump = audioCtx.createOscillator();
    const thumpGain = audioCtx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(150, t + 0.11);
    thump.frequency.exponentialRampToValueAtTime(55, t + 0.3);
    thumpGain.gain.setValueAtTime(0.0001, t + 0.11);
    thumpGain.gain.exponentialRampToValueAtTime(0.6, t + 0.115);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    thump.connect(thumpGain).connect(audioCtx.destination);
    thump.start(t + 0.11);
    thump.stop(t + 0.35);

    // シャーン：金属の響き（非整数倍音）＋高域ノイズの余韻
    const st = t + 0.12;
    [620, 1180, 1730, 2470, 3340, 4410].forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * (0.99 + Math.random() * 0.02);
      const dur = 0.9 - i * 0.1;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.exponentialRampToValueAtTime(0.07, st + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(st);
      osc.stop(st + dur + 0.02);
    });
    noiseHit(st, 0.6, 'highpass', 5000, 0.7, 0.25);
  }


  function playFlip() {
    if (state.muted || !audioCtx) return;
    const t = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500 + Math.random() * 1500;
    filter.Q.value = 0.8;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(filter).connect(gain).connect(audioCtx.destination);
    src.start(t);
    src.stop(t + 0.08);
  }

  function playChime(big, delay = 0) {
    if (state.muted || !audioCtx) return;
    const t = audioCtx.currentTime + delay;
    const notes = big ? [784, 988, 1175, 1568] : [1175, 1568];
    notes.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const st = t + i * 0.09;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.exponentialRampToValueAtTime(0.2, st + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(st);
      osc.stop(st + 0.4);
    });
  }

  // ---------- 帯封グリッド ----------
  const bundleCells = [];
  function buildBundles() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < TOTAL / BUNDLE_SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'bundle';
      bundleCells.push(cell);
      frag.appendChild(cell);
    }
    els.bundleGrid.appendChild(frag);
  }

  // ---------- トースト ----------
  let toastTimer = 0;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1200);
  }

  // ---------- めくるアニメーション ----------
  function spawnFlying() {
    const layer = els.flyLayer;
    while (layer.childElementCount >= MAX_FLYING) layer.firstElementChild.remove();

    const stackRect = els.stack.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const fly = els.topBill.cloneNode(true);
    fly.removeAttribute('id');
    fly.className = 'bill fly';
    fly.style.left = (stackRect.left - layerRect.left) + 'px';
    fly.style.top = (stackRect.top - layerRect.top) + 'px';
    const dir = Math.random() < 0.5 ? -1 : 1;
    fly.style.setProperty('--dx', (dir * (40 + Math.random() * 30)) + '%');
    fly.style.setProperty('--dy', (-60 - Math.random() * 40) + '%');
    fly.style.setProperty('--rz', (dir * (8 + Math.random() * 20)) + 'deg');
    fly.addEventListener('animationend', () => fly.remove(), { once: true });
    layer.appendChild(fly);
  }

  let pressTimer = 0;
  function pressFeedback() {
    els.stack.classList.add('press');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => els.stack.classList.remove('press'), 60);
  }

  // ---------- ゲーム進行 ----------
  function flip() {
    if (!state.playing || state.paused || state.count >= TOTAL) return;

    const now = performance.now();
    if (!state.startAt) {
      state.startAt = now;
      setHint('hint.go');
      loop();
    }

    state.count++;
    state.recent.push(now);
    if (state.recent.length > 30) state.recent.shift();

    spawnFlying();
    pressFeedback();
    playFlip();
    renderCount();

    if (state.count % BUNDLE_SIZE === 0) {
      const idx = state.count / BUNDLE_SIZE - 1;
      bundleCells[idx].classList.add('filled');
      els.bundleCount.textContent = idx + 1;
      playGasha();
      const isMilestone = state.count % (BUNDLE_SIZE * 10) === 0;
      if (isMilestone && state.count < TOTAL) {
        toast(I18N.lang === 'ja'
          ? `${formatMoneyJa(state.count * BILL_VALUE)} 突破！`
          : `${yen(state.count * BILL_VALUE)} reached!`);
        playChime(false, 0.35);
      }
    }

    if (state.count >= TOTAL) finish(now);
  }

  function renderCount() {
    els.count.textContent = state.count.toLocaleString('ja-JP');
    els.money.textContent = yen(state.count * BILL_VALUE);
    els.progressBar.style.width = (state.count / TOTAL * 100) + '%';

    const remaining = TOTAL - state.count;
    els.stack.classList.toggle('thin', remaining < 3);
    els.stack.classList.toggle('thinner', remaining < 2);
    els.stack.classList.toggle('empty', remaining < 1);
  }

  function currentSpeed(now) {
    const r = state.recent;
    // 直近1.5秒以内のめくりから速度を算出
    let i = r.length - 1;
    while (i > 0 && now - r[i - 1] <= 1500) i--;
    const n = r.length - i;
    if (n < 2 || now - r[r.length - 1] > 1000) return 0;
    return (n - 1) / ((r[r.length - 1] - r[i]) / 1000);
  }

  function loop() {
    cancelAnimationFrame(state.rafId);
    const tick = () => {
      const now = performance.now();
      els.time.textContent = formatTime(now - state.startAt);
      els.speed.textContent = currentSpeed(now).toFixed(1);
      if (state.playing && !state.endAt) state.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  function rankFor(sec) {
    if (sec < 600) return I18N.t('rank.0');
    if (sec < 900) return I18N.t('rank.1');
    if (sec < 1200) return I18N.t('rank.2');
    if (sec < 1800) return I18N.t('rank.3');
    return I18N.t('rank.4');
  }

  function finish(now) {
    state.endAt = now;
    state.playing = false;
    state.finishes++;
    cancelAnimationFrame(state.rafId);

    const elapsed = state.endAt - state.startAt;
    els.time.textContent = formatTime(elapsed);
    els.speed.textContent = (TOTAL / (elapsed / 1000)).toFixed(1);

    const prevBest = loadBest();
    const isNewBest = !prevBest || elapsed < prevBest;
    if (isNewBest) saveBest(elapsed);
    renderBest();

    els.resultTime.textContent = formatTime(elapsed);
    els.resultDetail.textContent = I18N.t('result.avg', { v: (TOTAL / (elapsed / 1000)).toFixed(2) });
    els.resultRank.textContent = (isNewBest && prevBest ? I18N.t('result.newBest') : '') + rankFor(elapsed / 1000);

    setShareLinks(I18N.t('share.text', { t: formatTime(elapsed) }));

    playChime(true, 0.35);
    setTimeout(() => els.resultOverlay.classList.remove('hidden'), 500);
  }

  let shareText = '';
  function setShareLinks(text) {
    shareText = text;
    const enc = encodeURIComponent;
    els.shareX.href = `https://x.com/intent/post?text=${enc(text)}&url=${enc(SHARE_URL)}`;
    els.shareLine.href = `https://social-plugins.line.me/lineit/share?url=${enc(SHARE_URL)}&text=${enc(text)}`;
    els.shareFb.href = `https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}`;
    els.shareCopy.textContent = I18N.t('share.copy');
  }

  // アプリでは Android の共有メニューを出す
  async function nativeShare() {
    const Share = plugin('Share');
    if (!Share) return;
    try {
      await Share.share({ title: I18N.t('share.title'), text: shareText, url: SHARE_URL, dialogTitle: I18N.t('share.dialog') });
    } catch (_) { /* キャンセル */ }
  }

  async function copyShare() {
    const body = `${shareText}\n${SHARE_URL}`;
    try {
      await navigator.clipboard.writeText(body);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = body;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    els.shareCopy.textContent = I18N.t('share.copied');
  }

  // ヒントは言語を切り替えたときに書き直せるよう、キーで持つ
  function setHint(key) {
    els.hint.dataset.i18n = key;
    els.hint.textContent = I18N.t(key);
  }

  function reset() {
    cancelAnimationFrame(state.rafId);
    state.count = 0;
    state.startAt = 0;
    state.endAt = 0;
    state.recent = [];
    els.flyLayer.textContent = '';
    bundleCells.forEach((c) => c.classList.remove('filled'));
    els.bundleCount.textContent = '0';
    els.time.textContent = formatTime(0);
    els.speed.textContent = '0.0';
    setHint(NATIVE ? 'hint.app' : 'hint.web');
    renderCount();
  }

  // スマホでは全画面＋横向き固定を試みる（対応ブラウザのみ。iOS Safari などは無視される）
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  function enterLandscape() {
    if (NATIVE || !isTouch || document.body.classList.contains('portrait-ok')) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement) return;
    try {
      Promise.resolve(req.call(el))
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
        .catch(() => { /* noop */ });
    } catch (_) { /* noop */ }
  }

  function start() {
    enterLandscape();
    initAudio();
    resumeAudio();
    reset();
    els.startOverlay.classList.add('hidden');
    els.resultOverlay.classList.add('hidden');
    els.pauseOverlay.classList.add('hidden');
    state.playing = true;
    state.paused = false;
    els.stack.focus({ preventScroll: true });
  }

  // 結果画面の「もう一度」：アプリでは 2 回に 1 回、全画面広告を挟む
  async function retry() {
    if (window.Ads && Ads.available && state.finishes % 2 === 0) {
      els.retryBtn.disabled = true;
      await Ads.showInterstitial();
      els.retryBtn.disabled = false;
    }
    start();
  }

  // 一時停止中はタイマーを止め、再開時にその分だけ開始時刻をずらす
  function pause() {
    if (!state.playing || state.paused) return;
    state.paused = true;
    state.pausedAt = performance.now();
    cancelAnimationFrame(state.rafId);
    suspendAudio();
    els.pauseOverlay.classList.remove('hidden');
  }

  function resume() {
    if (!state.paused) return;
    state.paused = false;
    if (state.startAt) {
      state.startAt += performance.now() - state.pausedAt;
      state.recent = [];
      loop();
    }
    resumeAudio();
    els.pauseOverlay.classList.add('hidden');
    els.stack.focus({ preventScroll: true });
  }

  function backToTitle() {
    state.playing = false;
    state.paused = false;
    els.pauseOverlay.classList.add('hidden');
    reset();
    renderBest();
    els.resultOverlay.classList.add('hidden');
    els.startOverlay.classList.remove('hidden');
  }

  // ---------- 入力 ----------
  const FLIP_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyF', 'KeyJ']);

  els.stack.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted) return; // スクリプトからの疑似イベントは無効
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    flip();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (state.playing || !els.resultOverlay.classList.contains('hidden')) backToTitle();
      return;
    }
    if (!FLIP_KEYS.has(e.code)) return;

    const startVisible = !els.startOverlay.classList.contains('hidden');
    const resultVisible = !els.resultOverlay.classList.contains('hidden');
    if (startVisible || resultVisible) {
      // オーバーレイ表示中は Enter / Space でボタン操作（ブラウザ既定動作に任せる）
      return;
    }
    e.preventDefault();
    if (e.repeat || !e.isTrusted) return; // 押しっぱなし・疑似イベントは無効
    flip();
  });

  // 長押しメニューやダブルタップズームを抑止
  els.stack.addEventListener('contextmenu', (e) => e.preventDefault());

  els.startBtn.addEventListener('click', start);
  els.retryBtn.addEventListener('click', retry);
  els.shareCopy.addEventListener('click', copyShare);
  els.shareNative.addEventListener('click', nativeShare);
  els.resumeBtn.addEventListener('click', resume);
  els.quitBtn.addEventListener('click', backToTitle);

  // 別アプリやタブに切り替えたら自動で一時停止する
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      suspendAudio();
    } else if (!state.paused && !(window.Ads && Ads.showing)) {
      resumeAudio();
    }
  });

  // Android の戻るボタン：プレイ中は一時停止（一時停止中は再開）、タイトルや結果画面ではアプリを終了
  if (plugin('App')) {
    plugin('App').addListener('backButton', () => {
      if (window.Ads && Ads.showing) return;
      if (state.paused) resume();
      else if (state.playing) pause();
      else plugin('App').exitApp();
    });
  }

  els.rotateSkip.addEventListener('click', () => document.body.classList.add('portrait-ok'));

  els.muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    els.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    els.muteBtn.blur();
  });

  // ---------- 初期化 ----------
  if (NATIVE) {
    els.ruleTap.dataset.i18nHtml = 'rule.tapApp';
    els.shareRow.classList.add('hidden');
    els.shareNative.classList.remove('hidden');
  }
  if (window.APP_VERSION && window.APP_VERSION !== 'dev') els.buildInfo.textContent = window.APP_VERSION;
  if (window.Ads) {
    Ads.initDone.then(() => { if (Ads.privacyOptionsRequired) els.adPrivacy.classList.remove('hidden'); });
    els.adPrivacy.addEventListener('click', () => Ads.showPrivacyOptions());
  }

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => I18N.setLang(btn.dataset.lang));
  });
  I18N.onChange(renderBest);
  I18N.apply();

  buildBundles();
  renderBest();
  reset();
})();
