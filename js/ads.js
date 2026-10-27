// Google AdMob 広告（Android / iOS アプリのときだけ動く。Web 版では何もしない）
const Ads = (() => {
  // AdMob では Android と iOS を別のアプリとして登録しているので、広告ユニットも OS ごとに分かれている
  // （空のものはその OS では出さない）
  const UNITS = {
    android: {
      // Google 公式のテスト用広告ユニット
      test: {
        banner: 'ca-app-pub-3940256099942544/9214589741',
        interstitial: 'ca-app-pub-3940256099942544/1033173712',
        rewarded: 'ca-app-pub-3940256099942544/5224354917',
      },
      production: {
        banner: 'ca-app-pub-6411535997477460/2110838100',
        interstitial: 'ca-app-pub-6411535997477460/4137613525',
        rewarded: 'ca-app-pub-6411535997477460/1710760731',
      },
    },
    ios: {
      test: {
        banner: 'ca-app-pub-3940256099942544/2435281174',
        interstitial: 'ca-app-pub-3940256099942544/4411468910',
        rewarded: 'ca-app-pub-3940256099942544/1712485313',
      },
      production: {
        banner: 'ca-app-pub-6411535997477460/2187658488',
        interstitial: 'ca-app-pub-6411535997477460/1319806081',
        rewarded: 'ca-app-pub-6411535997477460/6380561074',
      },
    },
  };
  const RETRY_MS = 20000;      // 読み込みに失敗したら少し待って再挑戦する
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const platform = native && cap.getPlatform() === 'ios' ? 'ios' : 'android';
  const testing = window.AD_MODE !== 'production';
  const ids = UNITS[platform][testing ? 'test' : 'production'];
  const AdMob = native && cap.Plugins ? cap.Plugins.AdMob : null;
  const has = (kind) => !!(AdMob && ids[kind]);

  let ready = false;           // 広告をリクエストしてよい状態（初期化と同意確認が済んだ）
  let showing = false;         // 全画面広告を表示中
  let privacyRequired = false; // 「広告の設定」を利用者が開けるようにする必要があるか（EU など）
  const waiters = {};          // 表示中の広告が閉じたときに呼ぶ処理

  const audio = (fn) => { if (window.GameAudio) window.GameAudio[fn](); };

  // ---------- バナー ----------
  let bannerWanted = false;    // ゲーム側が表示したい状態か
  let bannerState = 'none';    // none（未作成）/ shown / hidden

  // バナーの高さを CSS 変数に入れ、画面の下端が隠れないようにする
  function setBannerHeight(h) {
    document.documentElement.style.setProperty('--banner-h', `${h || 0}px`);
  }

  function syncBanner() {
    if (!has('banner') || !ready) return;
    if (bannerWanted && bannerState !== 'shown') {
      const p = bannerState === 'none'
        ? AdMob.showBanner({ adId: ids.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: testing })
        : AdMob.resumeBanner();
      bannerState = 'shown';
      p.catch(() => { bannerState = 'none'; setBannerHeight(0); });
    } else if (!bannerWanted && bannerState === 'shown') {
      bannerState = 'hidden';
      setBannerHeight(0);
      AdMob.hideBanner().catch(() => {});
    }
  }

  function setBanner(visible) {
    bannerWanted = visible;
    syncBanner();
  }

  // ---------- 全画面広告（インタースティシャル・リワード） ----------
  const slots = {
    inter: { kind: 'interstitial', loaded: false, pending: null, load: () => AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: testing }) },
    reward: { kind: 'rewarded', loaded: false, pending: null, load: () => AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: testing }) },
  };

  // 読み込みを始め、読み込めたら true で resolve する Promise を返す（読み込み中なら同じ Promise）
  function prepare(name) {
    const s = slots[name];
    if (!ready || !has(s.kind)) return Promise.resolve(false);
    if (s.loaded) return Promise.resolve(true);
    if (!s.pending) {
      s.pending = s.load()
        .then(() => { s.loaded = true; return true; })
        .catch(() => { setTimeout(() => prepare(name), RETRY_MS); return false; })
        .finally(() => { s.pending = null; });
    }
    return s.pending;
  }

  // 読み込み済みでなければ、最大 timeout ミリ秒だけ読み込みを待つ
  function ensureLoaded(name, timeout) {
    if (slots[name].loaded) return Promise.resolve(true);
    return Promise.race([prepare(name), new Promise((r) => setTimeout(() => r(false), timeout))]);
  }

  function finish(name, result) {
    showing = false;
    audio('resume');
    const w = waiters[name];
    waiters[name] = null;
    if (w) w(result);
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
    // iOS では、広告用の ID を使ってよいか（App Tracking Transparency）を利用者に確認する。
    // 同意確認のあとに一度だけ出る。断られても広告は出せる（パーソナライズされないだけ）
    if (platform === 'ios') {
      try {
        const { status } = await AdMob.trackingAuthorizationStatus();
        if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      } catch (e) { /* 確認できなくても広告は出せる */ }
    }
    let rewarded = false;
    AdMob.addListener('bannerAdSizeChanged', (size) => {
      setBannerHeight(bannerState === 'shown' && size ? size.height : 0);
    });
    AdMob.addListener('interstitialAdDismissed', () => finish('inter'));
    AdMob.addListener('interstitialAdFailedToShow', () => finish('inter'));
    AdMob.addListener('onRewardedVideoAdShowed', () => { rewarded = false; });
    AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
    AdMob.addListener('onRewardedVideoAdDismissed', () => finish('reward', rewarded));
    AdMob.addListener('onRewardedVideoAdFailedToShow', () => finish('reward', false));
    prepare('inter');
    prepare('reward');
    syncBanner();
  }

  // 全画面広告を表示し、閉じられたら resolve する（読み込めていないときは出さずにすぐ resolve）
  function showInterstitial() {
    if (!has('interstitial') || !ready || !slots.inter.loaded || showing) return Promise.resolve();
    showing = true;
    slots.inter.loaded = false;
    audio('suspend');
    return new Promise((resolve) => {
      waiters.inter = () => { prepare('inter'); resolve(); };
      AdMob.showInterstitial().catch(() => finish('inter'));
    });
  }

  // リワード広告を表示する。結果は 'rewarded'（最後まで見た）/ 'skipped'（途中で閉じた）/ 'unavailable'（読み込めなかった）
  async function showRewarded() {
    if (!has('rewarded') || showing) return 'unavailable';
    await initDone;
    if (!ready || !(await ensureLoaded('reward', 8000))) return 'unavailable';
    showing = true;
    slots.reward.loaded = false;
    audio('suspend');
    return new Promise((resolve) => {
      waiters.reward = (ok) => { prepare('reward'); resolve(ok ? 'rewarded' : 'skipped'); };
      AdMob.showRewardVideoAd().catch(() => finish('reward', false));
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
    get interstitialAvailable() { return has('interstitial'); },
    get rewardedAvailable() { return has('rewarded'); },
    get showing() { return showing; },
    get privacyOptionsRequired() { return privacyRequired; },
    initDone,
    setBanner,
    showInterstitial,
    showRewarded,
    showPrivacyOptions,
  };
})();
window.Ads = Ads;
