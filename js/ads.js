// Google AdMob 広告（Android アプリのときだけ動く。Web 版では何もしない）
const Ads = (() => {
  const UNITS = {
    // Google 公式のテスト用広告ユニット
    test: {
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
    },
    // 本番の広告ユニット（AdMob でアプリを追加したら設定する。空のあいだは広告を出さない）
    production: {
      interstitial: '',
    },
  };
  const RETRY_MS = 20000;      // 読み込みに失敗したら少し待って再挑戦する
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const testing = window.AD_MODE !== 'production';
  const ids = testing ? UNITS.test : UNITS.production;
  const AdMob = native && cap.Plugins && ids.interstitial ? cap.Plugins.AdMob : null;

  let ready = false;           // 広告をリクエストしてよい状態（初期化と同意確認が済んだ）
  let showing = false;
  let privacyRequired = false; // 「広告の設定」を利用者が開けるようにする必要があるか（EU など）
  let loaded = false;
  let pending = null;
  let onClosed = null;         // 表示中の広告が閉じたときに呼ぶ処理

  const audio = (fn) => { if (window.GameAudio) window.GameAudio[fn](); };

  // 読み込みを始め、読み込めたら true で resolve する Promise を返す（読み込み中なら同じ Promise）
  function prepare() {
    if (!ready) return Promise.resolve(false);
    if (loaded) return Promise.resolve(true);
    if (!pending) {
      pending = AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: testing })
        .then(() => { loaded = true; return true; })
        .catch(() => { setTimeout(prepare, RETRY_MS); return false; })
        .finally(() => { pending = null; });
    }
    return pending;
  }

  function finish() {
    showing = false;
    audio('resume');
    const cb = onClosed;
    onClosed = null;
    if (cb) cb();
  }

  async function init() {
    try {
      await AdMob.initialize({ initializeForTesting: testing });
    } catch (e) {
      return;
    }
    // EU・英国などで必要な広告の同意確認（必要な地域でだけフォームが出る）。
    // 確認自体が失敗した場合（AdMob 側でメッセージ未設定など）は、同意不要の地域とみなして続ける
    try {
      let consent = await AdMob.requestConsentInfo();
      if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) consent = await AdMob.showConsentForm();
      ready = consent.canRequestAds !== false;
      privacyRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch (e) {
      ready = true;
    }
    AdMob.addListener('interstitialAdDismissed', finish);
    AdMob.addListener('interstitialAdFailedToShow', finish);
    prepare();
  }

  // 全画面広告を表示し、閉じられたら resolve する（読み込めていないときは出さずにすぐ resolve）
  function showInterstitial() {
    if (!AdMob || !ready || !loaded || showing) return Promise.resolve();
    showing = true;
    loaded = false;
    audio('suspend');
    return new Promise((resolve) => {
      onClosed = () => { prepare(); resolve(); };
      AdMob.showInterstitial().catch(finish);
    });
  }

  // 同意した内容をあとから変更するための Google のフォームを開く
  function showPrivacyOptions() {
    if (!AdMob) return Promise.resolve();
    return AdMob.showPrivacyOptionsForm().catch(() => {});
  }

  const initDone = AdMob ? init() : Promise.resolve();

  return {
    get available() { return !!AdMob; },
    get showing() { return showing; },
    get privacyOptionsRequired() { return privacyRequired; },
    initDone,
    showInterstitial,
    showPrivacyOptions,
  };
})();
window.Ads = Ads;
