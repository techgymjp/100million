// 表示言語（日本語 / 英語）。端末の言語が日本語なら日本語、それ以外は英語。タイトル画面で切り替えも可能
const I18N = (() => {
  const dict = {
    ja: {
      'doc.title': '1億円',
      'title': '1億円',
      'aria.mute': '効果音のオン/オフ',
      'aria.stack': 'お札をめくる',
      'alt.bill': '1万円札',
      'sample': '見本',
      'stat.money': '金額',
      'stat.count': '枚数',
      'stat.countOf': ' / 10,000枚',
      'stat.time': 'タイム',
      'stat.speed': '速度',
      'stat.speedUnit': ' 枚/秒',
      'bundles.label': '帯封（100万円束）',
      'bundles.of': ' / 100束',
      'hint.web': 'お札をタップ / クリック、またはスペースキーでめくる',
      'hint.app': 'お札をタップしてめくる',
      'hint.go': 'その調子！ どんどんめくろう',
      'rotate.text': 'スマホを<b>横向き</b>にすると<br>お札が大きくなって迫力アップ！',
      'rotate.skip': '縦のまま遊ぶ',
      'start.lead': '1万円札を<b>1万枚</b>めくって、<br>1億円を数えきるタイムを競おう。',
      'rule.tap': 'お札をタップ / クリック、または <kbd>Space</kbd> <kbd>Enter</kbd> <kbd>F</kbd> <kbd>J</kbd> キーで1枚めくる',
      'rule.tapApp': 'お札をタップして1枚めくる',
      'rule.timer': '最初の1枚をめくった瞬間にタイマースタート',
      'rule.repeat': 'キーの押しっぱなし（連打機能）は無効',
      'rule.esc': '<kbd>Esc</kbd> でやり直し',
      'start.btn': 'スタート',
      'legal.privacy': 'プライバシーポリシー',
      'legal.adSettings': '広告の設定',
      'url.privacy': 'https://techgym.jp/privacy-policy/',
      'pause.title': '一時停止中',
      'pause.lead': 'タイマーは止まっています。',
      'pause.resume': '再開',
      'pause.quit': 'タイトルへ',
      'result.sub': '1億円 数えきりました！',
      'result.avg': '平均 {v} 枚/秒',
      'result.newBest': '自己ベスト更新！ ',
      'best': '自己ベスト：{t}',
      'share.label': '結果をシェアする',
      'share.copy': 'コピー',
      'share.copied': 'コピーしました',
      'share.native': '結果をシェアする',
      'share.title': '1億円',
      'share.dialog': '結果をシェア',
      'share.text': '1万円札を1万枚めくって、1億円を {t} で数えきりました！ #1億円ゲーム',
      'retry': 'もう一度',
      'footer': '※ 画面上のお札は見本です。',
      'rank.0': '伝説の札勘マスター',
      'rank.1': '銀行窓口のエース',
      'rank.2': '敏腕経理',
      'rank.3': '堅実な会計係',
      'rank.4': '1億円、確かに数えました',
      'reward.btn': '▶ 広告を見て金のお札で遊ぶ',
      'reward.loading': '広告を読み込み中…',
      'reward.fail': '広告を読み込めませんでした',
      'gold.toast': '金のお札でプレイ中！',
    },
    en: {
      'doc.title': '100 Million Yen',
      'title': '100 Million Yen',
      'aria.mute': 'Sound on/off',
      'aria.stack': 'Flip a bill',
      'alt.bill': '10,000 yen bill',
      'sample': 'SAMPLE',
      'stat.money': 'Amount',
      'stat.count': 'Bills',
      'stat.countOf': ' / 10,000',
      'stat.time': 'Time',
      'stat.speed': 'Speed',
      'stat.speedUnit': ' bills/s',
      'bundles.label': 'Bundles (¥1,000,000 each)',
      'bundles.of': ' / 100',
      'hint.web': 'Tap / click the bill, or press Space to flip',
      'hint.app': 'Tap the bill to flip',
      'hint.go': 'Keep going! Flip, flip, flip!',
      'rotate.text': 'Turn your phone <b>sideways</b><br>for bigger bills and more thrill!',
      'rotate.skip': 'Keep playing in portrait',
      'start.lead': 'Flip <b>10,000</b> ¥10,000 bills<br>and count ¥100 million as fast as you can.',
      'rule.tap': 'Tap / click the bill, or press <kbd>Space</kbd> <kbd>Enter</kbd> <kbd>F</kbd> <kbd>J</kbd> to flip one bill',
      'rule.tapApp': 'Tap the bill to flip one bill',
      'rule.timer': 'The timer starts when you flip the first bill',
      'rule.repeat': 'Holding a key down (auto-repeat) does not count',
      'rule.esc': 'Press <kbd>Esc</kbd> to start over',
      'start.btn': 'Start',
      'legal.privacy': 'Privacy Policy',
      'legal.adSettings': 'Ad settings',
      'url.privacy': 'https://techgym.jp/privacy-policy-en/',
      'pause.title': 'Paused',
      'pause.lead': 'The timer is stopped.',
      'pause.resume': 'Resume',
      'pause.quit': 'Title',
      'result.sub': 'You counted ¥100 million!',
      'result.avg': 'Average {v} bills/s',
      'result.newBest': 'New personal best! ',
      'best': 'Personal best: {t}',
      'share.label': 'Share your result',
      'share.copy': 'Copy',
      'share.copied': 'Copied',
      'share.native': 'Share your result',
      'share.title': '100 Million Yen',
      'share.dialog': 'Share your result',
      'share.text': 'I flipped 10,000 ¥10,000 bills and counted ¥100 million in {t}! #100MillionYen',
      'retry': 'Play again',
      'footer': '* The bills shown on screen are samples.',
      'rank.0': 'Legendary Cash Counter',
      'rank.1': 'Ace Bank Teller',
      'rank.2': 'Sharp Accountant',
      'rank.3': 'Steady Bookkeeper',
      'rank.4': '¥100 million, counted!',
      'reward.btn': '▶ Watch an ad to play with gold bills',
      'reward.loading': 'Loading ad…',
      'reward.fail': 'Could not load the ad',
      'gold.toast': 'Playing with gold bills!',
    },
  };

  const STORE_KEY = '100million.lang';
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* 保存不可 */ }
  const deviceLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ja';
  let lang = dict[saved] ? saved : (/^ja\b/i.test(deviceLang) ? 'ja' : 'en');
  const listeners = [];

  // t('best', { t: '1:23.45' }) → '自己ベスト：1:23.45'
  function t(key, vars) {
    let s = dict[lang][key];
    if (s === undefined) s = dict.ja[key];
    if (s === undefined) return key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : s;
  }

  // data-i18n（文字）/ data-i18n-html（タグを含む）/ data-i18n-href（リンク先）/
  // data-i18n-aria（aria-label）/ data-i18n-alt（代替テキスト）の付いた要素を書き換える
  function apply(root) {
    const scope = root || document;
    if (!root) {
      document.documentElement.lang = lang;
      document.title = t('doc.title');
    }
    scope.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    scope.querySelectorAll('[data-i18n-href]').forEach((el) => { el.href = t(el.dataset.i18nHref); });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    scope.querySelectorAll('[data-i18n-alt]').forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
    scope.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('on', el.dataset.lang === lang));
  }

  function setLang(l) {
    if (!dict[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem(STORE_KEY, l); } catch (e) { /* 保存不可 */ }
    apply();
    listeners.forEach((f) => f(l));
  }

  return {
    t, apply, setLang,
    get lang() { return lang; },
    onChange(f) { listeners.push(f); },
  };
})();
window.I18N = I18N;
