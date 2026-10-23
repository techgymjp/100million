# 1億円

1万円札を1万枚めくって、1億円を数えきるまでのタイムを競うゲームです（Web / Android）。

## 遊び方

- 「スタート」を押し、お札をタップ / クリック、または `Space` `Enter` `F` `J` キーで1枚めくる
- 最初の1枚をめくった瞬間にタイマーがスタートし、10,000枚（1億円）めくり終えた時点でゴール
- 100枚（100万円）ごとに帯封が1束埋まり、「ガシャーン」と鳴る
- キーの押しっぱなし（オートリピート）は無効
- 別のアプリやタブに切り替えると自動で一時停止（タイマーも止まる）
- `Esc` でタイトルに戻る
- 自己ベストは端末（localStorage）に保存されます
- 日本語と英語に対応（端末の言語で自動選択。タイトル画面で切り替え可能）

## Web 版

ビルド不要の静的サイトです。`index.html` をブラウザで開けば遊べます。
Vercel では `vercel.json` の設定で `npm run build` を実行し、`www/` を公開します。

## Android 版

[Capacitor](https://capacitorjs.com/) でゲームのファイルをアプリに同梱しています（オフラインで遊べます）。

- パッケージ名：`jp.techgym.ichiokuen`
- アプリ名：日本語の端末では「1億円」、それ以外では「100 Million Yen」
- 画面の向き：横画面（`sensorLandscape`）。システムバーを隠した全画面で、プレイ中は画面が消えない
- 戻るボタン：プレイ中は一時停止（一時停止中は再開）、タイトルや結果画面ではアプリを終了
- シェア：Android の共有メニュー
- 広告（AdMob）
  - バナー：タイトル・一時停止・結果画面の下端だけ（プレイ中は連打する場所の近くになるので出さない）
  - インタースティシャル：タイトルに戻るとき・一時停止から再開するときは毎回、結果画面の「もう一度」では 2 回に 1 回
  - リワード：最後まで見ると、次の 1 回を「金のお札」で遊べる（見た目だけで、タイムには影響しない）
- 起動時に Google の同意確認（UMP）を実行し、必要な地域ではタイトル画面に「広告の設定」を表示

### ビルド

GitHub Actions（`.github/workflows/android.yml`）でビルドします。

1. `npm ci` → `npm run build` → `npx cap sync android` → `./gradlew assembleDebug`
2. 既定ブランチのビルドは、Release `android-latest` の `ichiokuen.apk` を差し替える（動作確認用。デバッグ署名・テスト広告）
3. GitHub Secrets に署名鍵が登録されていれば、本番広告で署名付き AAB（Google Play 用）を作り、Artifact に上げる

動作確認用 APK：`https://github.com/techgymjp/100million/releases/latest/download/ichiokuen.apk`（`docs/apk-qr.png` の QR コード）

手元でビルドする場合（Android Studio が必要）：

```sh
npm install
npm run android:sync
npm run android:open
```

### 本番公開の前に設定するもの

- AdMob のアプリ ID は `android/app/src/main/res/values/strings.xml` の `admob_app_id`、広告ユニット ID は `js/ads.js` の `UNITS.production` に設定済み（動作確認用 APK は Google 公式のテスト広告）
- GitHub Secrets：`ANDROID_KEYSTORE_BASE64` `ANDROID_KEYSTORE_PASSWORD` `ANDROID_KEY_ALIAS` `ANDROID_KEY_PASSWORD`

## ファイル構成

```
index.html             画面構成
style.css              スタイル・めくりアニメーション・横向きレイアウト
game.js                ゲームロジック（タイマー、カウント、効果音、記録保存、一時停止、アプリ連携）
js/i18n.js             表示言語（日本語 / 英語）の文言と切り替え
images/10000yen.jpg    1万円札の画像
js/ads.js              AdMob 広告（Android アプリのときだけ動く）
js/ads-config.js       広告のモード（ビルド時に生成）
js/build-info.js       バージョン表示（ビルド時に生成）
scripts/build-web.js   Web ファイルを www/ にコピー
capacitor.config.json  Capacitor の設定
android/               Android プロジェクト
assets/                アイコン・起動画面の元画像
```

※ 画面上のお札には「見本」の表示を重ねています。

## ライセンス

All rights reserved. 著作権はテックジム株式会社に帰属します。無断での複製・改変・再配布、Web サイトやアプリとしての公開を禁止します。ただし、テックジムの受講生が学習目的で複製・改変することは許可します（商用利用は不可。詳しくは `LICENSE`）。
お札のデザイン（`images/10000yen.jpg`）は日本銀行券のもので、上記の著作権の対象ではありません。
