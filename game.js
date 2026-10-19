(() => {
  'use strict';

  const TOTAL = 10000;          // めくる枚数
  const BILL_VALUE = 10000;     // 1枚あたりの金額
  const BUNDLE_SIZE = 100;      // 1束（100万円）あたりの枚数
  const MAX_FLYING = 14;        // 同時に表示する飛んでいくお札の上限
  const BEST_KEY = '100million.best';

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
    shareBtn: $('shareBtn'),
    muteBtn: $('muteBtn'),
  };

  const state = {
    playing: false,   // スタート画面を閉じて操作を受け付けている
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
    const text = best ? `自己ベスト：${formatTime(best)}` : '';
    els.bestStart.textContent = text;
    els.bestResult.textContent = text;
  }

  // ---------- 効果音（紙をめくる音を WebAudio で合成） ----------
  let audioCtx = null;
  let noiseBuffer = null;

  function initAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    const len = Math.floor(audioCtx.sampleRate * 0.08);
    noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
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

  function playChime(big) {
    if (state.muted || !audioCtx) return;
    const t = audioCtx.currentTime;
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
    if (!state.playing || state.count >= TOTAL) return;

    const now = performance.now();
    if (!state.startAt) {
      state.startAt = now;
      els.hint.textContent = 'その調子！ どんどんめくろう';
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
      const isMilestone = state.count % (BUNDLE_SIZE * 10) === 0;
      if (isMilestone && state.count < TOTAL) {
        toast(`${formatMoneyJa(state.count * BILL_VALUE)} 突破！`);
        playChime(false);
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
    if (sec < 600) return '伝説の札勘マスター';
    if (sec < 900) return '銀行窓口のエース';
    if (sec < 1200) return '敏腕経理';
    if (sec < 1800) return '堅実な会計係';
    return '1億円、確かに数えました';
  }

  function finish(now) {
    state.endAt = now;
    state.playing = false;
    cancelAnimationFrame(state.rafId);

    const elapsed = state.endAt - state.startAt;
    els.time.textContent = formatTime(elapsed);
    els.speed.textContent = (TOTAL / (elapsed / 1000)).toFixed(1);

    const prevBest = loadBest();
    const isNewBest = !prevBest || elapsed < prevBest;
    if (isNewBest) saveBest(elapsed);
    renderBest();

    els.resultTime.textContent = formatTime(elapsed);
    els.resultDetail.textContent = `平均 ${(TOTAL / (elapsed / 1000)).toFixed(2)} 枚/秒`;
    els.resultRank.textContent = (isNewBest && prevBest ? '自己ベスト更新！ ' : '') + rankFor(elapsed / 1000);

    const shareText = `1万円札を1万枚めくって、1億円を ${formatTime(elapsed)} で数えきりました！ #1億円ゲーム`;
    const shareUrl = location.protocol.startsWith('http') ? location.href.split('#')[0] : '';
    const params = new URLSearchParams({ text: shareText });
    if (shareUrl) params.set('url', shareUrl);
    els.shareBtn.href = 'https://x.com/intent/post?' + params.toString();

    playChime(true);
    setTimeout(() => els.resultOverlay.classList.remove('hidden'), 500);
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
    els.hint.textContent = 'お札をタップ / クリック、またはスペースキーでめくる';
    renderCount();
  }

  function start() {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    reset();
    els.startOverlay.classList.add('hidden');
    els.resultOverlay.classList.add('hidden');
    state.playing = true;
    els.stack.focus({ preventScroll: true });
  }

  function backToTitle() {
    state.playing = false;
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
  els.retryBtn.addEventListener('click', start);

  els.muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    els.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    els.muteBtn.blur();
  });

  // ---------- 初期化 ----------
  buildBundles();
  renderBest();
  reset();
})();
