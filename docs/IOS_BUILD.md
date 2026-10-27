# iOS 版をビルドして App Store に出す手順（Mac での作業）

1億円の iOS 版は、Android 版と同じ Capacitor で作っています（`ios/` フォルダ）。
コードの準備はできているので、Mac では「ビルドして App Store Connect にアップロードする」作業だけを行います。

- Bundle ID：`jp.techgym.ichiokuen`（Android のパッケージ名と同じ）
- チーム：Team ID `GNM3VTX9YG`（Xcode の設定に入れてあります）。Apple Developer には**個人で登録**しています（App Store の販売元は個人名になります）
- 対応端末：iPhone（横画面固定）。iPad では iPhone 用の画面で動きます
- アプリ名（ホーム画面）：日本語の端末では「1億円」、それ以外では「100 Million Yen」
- 広告：AdMob（iOS 用のアプリと広告ユニット）。起動時に「トラッキングの許可」の確認画面が出ます

---

## 0. 先にブラウザでやること

1. **Apple Developer**（developer.apple.com）→「Certificates, Identifiers & Profiles」→「Identifiers」→「＋」→「App IDs」→「App」
   - Description：`Ichiokuen`（英数字だけ。「億」などの漢字や記号は使えないことがある）
   - Bundle ID：「Explicit」で `jp.techgym.ichiokuen`
   - Capabilities：何もチェックしない
2. **App Store Connect**（appstoreconnect.apple.com）→「マイ App」→「＋」→「新規 App」
   - プラットフォーム：iOS ／ 名前：`1億円 〜1万円札を1万枚めくれ〜`（Google Play と同じ。30 文字以内、App Store 全体で重複不可）／ プライマリ言語：日本語
   - バンドル ID：1 で登録したもの ／ SKU：`ichiokuen`（あとから変更不可）／ ユーザアクセス：アクセス制限なし
3. **AdMob**
   - 「アプリを追加」→ **iOS** →「ストアに掲載されていない」で登録し、インタースティシャルとリワードの広告ユニットを作る（バナーも出す場合はバナーも）
   - アプリ ID と広告ユニット ID を Claude Code に渡す（`ios/App/App/Info.plist` の `GADApplicationIdentifier` と `js/ads.js` の `UNITS.ios.production` に入れてもらう）
   - 「プライバシーとメッセージ」→「欧州の規制」のメッセージに iOS アプリも追加する

**1億円では、AdMob の iOS 用アプリ ID と広告ユニット（バナー・インタースティシャル・リワード）を設定済みです。**

---

## 1. Mac の準備（最初の1回だけ）

1. **Xcode** を App Store からインストールする（数十 GB あるので時間がかかります）。インストール後に一度起動し、追加コンポーネントのインストールを済ませる
2. Xcode の「Settings…」→「Accounts」→「＋」で、Apple Developer に登録している Apple ID でサインインする（チームが個人名で表示されれば OK）
3. **Node.js**（LTS 版）を https://nodejs.org/ からインストールする
4. ターミナルでリポジトリを取得する
   ```bash
   cd ~/Desktop   # 置きたい場所（どこでもよい）
   git clone https://github.com/techgymjp/100million.git
   cd 100million
   npm ci
   ```
   `git` がないと言われたら、表示に従って「コマンドライン・デベロッパツール」をインストールしてから、もう一度実行します。

2回目以降は、`cd 100million` のあと `git pull` と `npm ci` で最新にします。

---

## 2. 自分の iPhone で動作確認する（テスト広告）

```bash
npm run ios:sync    # ゲームのファイルを iOS のプロジェクトにコピー（テスト広告）
npm run ios:open    # Xcode で開く
```

1. iPhone を USB ケーブルで Mac につなぎ、iPhone で「このコンピュータを信頼」を許可する
2. iPhone の「設定」→「プライバシーとセキュリティ」→「デベロッパモード」をオンにする（再起動を求められます。項目がない場合は、Xcode で一度 iPhone を選ぶと表示されます）
3. Xcode の上部で、実行先に自分の iPhone を選ぶ
4. 左の「App」→「Signing & Capabilities」で、「Automatically manage signing」がオン、Team に自分（個人名）のチームが選ばれていることを確認する
5. ▶（Run）を押すと、iPhone にアプリが入って起動する

確認すること：

- 横画面の全画面で表示される（ステータスバーが出ない）
- 起動時にトラッキングの確認画面が出る
- お札をタップしてめくれる、音が鳴る（100 枚ごとに「ガシャーン」）
- タイトル・一時停止・結果画面の下に**テスト広告**のバナーが出る
- 「タイトルへ」「再開」「もう一度」でテスト広告（全画面）が出る
- 「▶ 広告を見て金のお札で遊ぶ」でテスト広告を最後まで見ると、金のお札で遊べる
- 別のアプリに切り替えて戻ると一時停止している
- 「結果をシェアする」で共有メニューが出る

---

## 3. App Store 用にビルドしてアップロードする（本番広告）

```bash
git pull && npm ci
npm run ios:release   # 本番の広告 ID でコピーする（ここが ios:sync と違う）
npm run ios:open
```

1. Xcode の左で「App」→「General」→「Identity」を開き、**Build の番号を前回より大きくする**（初回は 1。アップロードのたびに 2、3…と上げる。同じ番号は二度アップロードできない）。Version は `1.0.0`
2. 上部の実行先を「**Any iOS Device (arm64)**」にする
3. メニューの「Product」→「**Archive**」（メニューは画面最上部。全画面表示だと隠れるので、マウスを画面の上端に動かす）
4. 終わると Organizer が開くので、「**Distribute App**」→「**App Store Connect**」→「Upload」で進める（途中の確認は既定のまま「Next」でよい。「Xcode Cloud can automate…」は「Remind Me Later」で閉じる）
5. 10〜30 分ほどで、App Store Connect の「TestFlight」タブにビルドが表示される

輸出コンプライアンス（暗号化）の質問は、Info.plist で「独自の暗号化は使っていない」と設定済みなので、聞かれません。

**注意**：`ios:release` でビルドしたアプリは本番の広告が出ます。TestFlight で確認するときも、**本番の広告はタップしない**でください（AdMob のアカウント停止の対象）。Xcode から iPhone に直接入れて試すときは、`npm run ios:sync` でテスト広告に戻してから実行します。

---

## 4. TestFlight で確認し、審査用の録画を撮る

1. App Store Connect の「TestFlight」→「内部テスト」でグループを作り、自分を追加する
2. iPhone に「TestFlight」アプリを App Store から入れ、届いた招待から 1億円 をインストールする

### 審査用の画面録画（提出前に用意する）

新しいアカウントの初回の審査では、**実機（最新の iOS）での操作の画面録画**を求められます（Guideline 2.1 - Information Needed）。提出前に撮っておき、5 章の「メモ」と一緒に渡すと早く進みます。

1. iPhone の「設定」→「コントロールセンター」に「画面収録」を追加する
2. TestFlight 版をいったん削除して入れ直す（初回起動の確認画面から撮るため）
3. コントロールセンターの「画面収録」を押してから、アプリを起動する
4. 次の流れを 2〜3 分で撮る
   - 起動 → 同意画面（出る地域のみ）→ トラッキングの確認画面
   - タイトル画面（バナー広告、言語の切り替え、プライバシーポリシー）
   - スタート → お札を何十枚かめくる（100 枚の「ガシャーン」まで）
   - 別のアプリに切り替えて戻り、一時停止 →「再開」（全画面広告）
   - 「タイトルへ」（全画面広告）→「▶ 広告を見て金のお札で遊ぶ」（リワード広告）→ 金のお札でめくる
   - ※ 1万枚めくりきるのは時間がかかるので、結果画面までは不要（撮るなら別の動画にする）
5. 画面収録を止めると「写真」に保存される

動画が大きいと App Review への返信に添付できません（400MB でも失敗した例あり）。Mac の Finder で右クリック →「選択したビデオファイルをエンコード」→ 720p で小さくするか、Google ドライブの共有リンクを返信文に貼ります。

---

## 5. App Store Connect で審査に出す

「配信」タブ（iOS App のバージョン 1.0.0。「1.0」になっていたら 1.0.0 に直して保存する）で入力します。

| 項目 | 入力内容 |
| --- | --- |
| スクリーンショット | 「Dynamic Island 搭載 iPhone（中型ディスプレイ）」の欄に、`docs/store/ios/6.3inch/` の 2622 × 1206（横向き）を入れる。日本語版（ja-）と英語版（en-）各 4 枚。6.9 インチ（2868 × 1320）は受け付けられない |
| ヘッダ・検索結果 | 「ヘッダと検索結果」タブに `docs/store/ios/appstore-header-3840x1646.png` と `appstore-search-3840x2560.png`（ヘッダを入れたら検索結果も入れる） |
| プロモーション用テキスト・概要・キーワード | `docs/store/ios/appstore-text.md` |
| サポート URL | https://techgym.jp/ |
| プライバシーポリシー URL（App 情報・App のプライバシー） | https://techgym.jp/privacy-policy/ |
| 著作権 | 2026 TECH GYM K.K. |
| カテゴリ（App 情報） | ゲーム（サブカテゴリ：カジュアル、アーケード など） |
| ビルド | TestFlight で確認したビルドを選ぶ |
| 年齢制限 | 質問に答える（暴力・性的表現・ギャンブルなどはすべて「なし」。お金を数えるだけで、賭けや購入の要素はない） |
| コンテンツの配信権（App 情報） | 下の「お札の画像について」を読んで答える |
| App のプライバシー | AdMob が収集するデータを申告する（下記） |
| App Review に関する情報 | ログイン不要。連絡先を入力。メモに下の文を入れる |

### App のプライバシー（AdMob を使うアプリの目安）

Google の「Apple の App Store のデータ開示要件への準備」（AdMob のヘルプ）に、AdMob が収集するデータの一覧があります。必ずそちらを見て最終確認してください。目安は次のとおりです。

- 収集する：ID（デバイス ID）、使用状況データ（広告データ、製品の操作）、診断（クラッシュデータ、パフォーマンスデータ、その他の診断データ）、位置情報（おおよその場所）
- 目的：サードパーティ広告、アナリティクス
- ユーザーに関連付け：しない
- トラッキングに使用：デバイス ID と広告データは「する」

### お札の画像について

ゲームのお札は、日本銀行券（1万円札）の画像に「見本」（英語では「SAMPLE」）の印を重ねて表示しています。「コンテンツの配信権」の「第三者のコンテンツを含むか」は、この画像の扱いをふまえて判断してください（自前の絵・音だけなら「いいえ」ですが、このゲームはお札の画像を使っています）。審査で聞かれたときのために、メモにも書いておきます。

### App Review のメモ（日本語・英語）

```
【アプリの目的と対象者】
1万円札を1万枚めくって、1億円を数えきるまでのタイムを競うカジュアルゲームです。13 歳以上の一般の方が対象です。

【使い方】
ログインは不要です。「スタート」を押し、お札をタップすると1枚ずつめくれます。最初の1枚でタイマーが始まり、10,000枚でゴールです。

【外部サービス】
Google AdMob（バナー・インタースティシャル・リワード広告）を使っています。起動時に App Tracking Transparency の確認を行います。欧州などでは Google の同意確認（UMP）が表示されます。リワード広告を最後まで見ると、次の1回だけお札の見た目が金色になります（タイムには影響しません）。アプリ内課金はありません。

【地域による違い】
同意確認の画面が出るかどうか以外に違いはありません。表示言語は端末の言語に合わせて日本語または英語になります。

【規制業種・第三者の素材】
金融サービスではありません。実際のお金のやりとり、賭け、購入の要素はありません。お札の画像には「見本」の印を重ね、本物と誤認されないようにしています。効果音はアプリ内で合成しています。

---

[Purpose and audience]
A casual game where you flip 10,000 ¥10,000 bills and compete for the fastest time to count ¥100 million. For general audiences aged 13 and up.

[How to use]
No login is required. Tap "Start", then tap the bill to flip it one at a time. The timer starts with the first bill and the game ends at 10,000 bills.

[External services]
Google AdMob (banner, interstitial and rewarded ads). App Tracking Transparency is requested at launch, and Google's consent form (UMP) is shown in regions such as the EU. Watching a rewarded ad to the end makes the bills gold for the next round (cosmetic only). There are no in-app purchases.

[Regional differences]
None, other than whether the consent form is shown. The language follows the device (Japanese or English).

[Regulated industries / third-party content]
This is not a financial service. There is no real money, betting or purchasing. The banknote image is overlaid with a "SAMPLE" mark so it cannot be mistaken for real currency. Sound effects are synthesized in the app.
```

画面録画（4 章）は、App Review から依頼が来たら返信に添付する（または共有リンクを貼る）。依頼が来る前から、上のメモに「画面録画を用意しています」と書き添えてもよい。

入力が終わったら「審査用に追加」→「審査へ提出」。

---

## 6. 公開後にやること

- AdMob で iOS アプリを App Store のアプリに紐づける（「アプリ」→ iOS の 1億円 →「アプリの設定」）
- App Store からインストールして、起動・同意画面・トラッキングの確認・広告を確認する

---

## 7. 自動化の準備（2回目以降を GitHub Actions に任せる場合）

JET STRIKE で作った API キーと配布用の証明書（.p12）は Apple Developer のチーム共通なので、そのまま使い回せます（作り方は jet-fighter の `docs/IOS_BUILD.md` の 7 章）。
techgymjp は個人のアカウントで全リポジトリ共通の Secrets が使えないため、このリポジトリにも同じ 5 つを登録します。

登録画面：https://github.com/techgymjp/100million/settings/secrets/actions

| 名前 | 内容 |
| --- | --- |
| `IOS_DIST_CERT_P12_BASE64` | 証明書（.p12）を変換した文字列 |
| `IOS_DIST_CERT_PASSWORD` | .p12 を書き出したときのパスワード |
| `ASC_KEY_ID` | API キーのキー ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | API キー（.p8）を変換した文字列 |

```bash
base64 -i 証明書.p12 | tr -d '\n' | pbcopy
base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n' | pbcopy
```

### 自動アップロード（`.github/workflows/ios-release.yml`、設定済み）

既定ブランチにゲームのファイルを push すると、GitHub Actions（GitHub の Mac 環境）が次を行います。

1. 本番の広告 ID でゲームのファイルをコピーする（`ios:release` と同じ）
2. 証明書を一時的なキーチェーンに読み込み、App Store Connect API で App Store 用のプロファイルを用意する（同じ Bundle ID・証明書のものがあれば使い回す。`scripts/ios-profile.js`）
3. ビルド番号を「Actions の実行回数 + 100」にして Archive し、App Store Connect にアップロードする（Mac から手で上げるビルド 1, 2, 3… と重ならない）

10〜30 分ほどで TestFlight に表示されます。審査への提出は、これまでどおり App Store Connect で行います。
アップロードの前に、App Store Connect でアプリ（0 章の 2）を作っておく必要があります。Actions の「iOS release (TestFlight)」→「Run workflow」で、手動で実行することもできます。

**注意**：証明書（.p12）、そのパスワード、API キー（.p8）は、チャット・AI へのアップロード・リポジトリへのコミットで**絶対に共有しない**でください。

---

## つまずきやすいところ

| 症状 | 対処 |
| --- | --- |
| アップロードで「同じビルド番号がすでにある」 | General の Build の番号を上げてから Archive し直す |
| Signing でエラー（チームが選べない、証明書がない） | Xcode の Accounts で Apple ID にサインインし直し、Team を選ぶ。「Automatically manage signing」をオンにする |
| 実行先に iPhone が出ない | ケーブルをつなぎ直し、iPhone で「信頼」を許可。デベロッパモードをオンにする |
| 実行先に「iOS 26.x Not Installed」と出る | 「Get」で iOS のシミュレーターと部品をダウンロードする（8 GB ほど。Archive にも必要） |
| ビルドが古いゲームのまま | `npm run ios:sync`（または `ios:release`）を実行し忘れている。`git pull` してから実行し直す |
| 起動直後に落ちる | `Info.plist` の `GADApplicationIdentifier` が正しくない。AdMob の iOS 用アプリ ID（`~` を含む）を入れる |
| アップロードしたビルドが選べない | App Store Connect のバージョンが「1.0」のまま。1.0.0 に直して保存する |
| 「審査用に追加できません」 | 「コンテンツの配信権」の回答、「App のプライバシー」のプライバシーポリシー URL を入れて保存する |
| App Store の審査で「Xcode が古い」と言われる | Xcode を最新版に更新してから Archive し直す |
| 本番広告とテスト広告の取り違え | App Store 用は必ず `npm run ios:release`。Xcode から実機で試すときは `npm run ios:sync` に戻す |
