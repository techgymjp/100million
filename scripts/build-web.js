// Web 版（Vercel）とアプリ（Android / iOS）に使う Web ファイルを www/ にコピーする。
// --app を付けるとアプリ用：Web 版だけの部分（ストアへのリンクなど。<!-- web-only --> と // web-only の印）を取り除く
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
for (const item of ['index.html', 'style.css', 'game.js', 'images', 'js']) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}
// Google Play 用のビルドでは本番の広告を使う
const mode = process.env.ADMOB_MODE === 'production' ? 'production' : 'test';
fs.writeFileSync(path.join(out, 'js', 'ads-config.js'), `// ビルド時に生成\nwindow.AD_MODE = '${mode}';\n`);
// タイトル画面に出すバージョン（CI では VERSION_NAME / VERSION_CODE を使う）
const version = process.env.VERSION_CODE
  ? `v${process.env.VERSION_NAME || require('../package.json').version} (build ${process.env.VERSION_CODE})`
  : 'dev';
fs.writeFileSync(path.join(out, 'js', 'build-info.js'), `// ビルド時に生成\nwindow.APP_VERSION = '${version}';\n`);
// アプリでは表示しない部分を、隠すのではなく同梱するファイルから取り除く
const app = process.argv.includes('--app');
if (app) {
  const strip = (file, re) => {
    const p = path.join(out, file);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(re, ''));
  };
  strip('index.html', /[ \t]*<!-- web-only -->[\s\S]*?<!-- \/web-only -->\n?/g);
  strip('js/i18n.js', /^.*\/\/ web-only\n/gm);
  fs.rmSync(path.join(out, 'images', 'badges'), { recursive: true, force: true });
}
console.log(`built ${app ? 'app' : 'web'} assets into www/ (ads: ${mode}, version: ${version})`);
