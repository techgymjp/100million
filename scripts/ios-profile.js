// GitHub Actions で iOS 版に署名するためのプロビジョニングプロファイル（App Store 用）を用意する。
// App Store Connect API（管理者権限のキー）で、同じ Bundle ID と配布用証明書のプロファイルがあれば使い回し、
// なければ作る。ダウンロードしたプロファイルを Xcode が読む場所に置き、名前を GITHUB_ENV に書き出す。
//
// 必要な環境変数：ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH（.p8 のパス）/ BUNDLE_ID / CERT_SERIAL（配布用証明書のシリアル番号）
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, BUNDLE_ID, CERT_SERIAL, GITHUB_ENV } = process.env;
const API = 'https://api.appstoreconnect.apple.com/v1';

function token() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), {
    key: fs.readFileSync(ASC_KEY_PATH, 'utf8'),
    dsaEncoding: 'ieee-p1363',
  });
  return `${head}.${body}.${sig.toString('base64url')}`;
}

async function api(method, url, data) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify({ data }) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${JSON.stringify(json.errors || json)}`);
  return json;
}

// ページをたどってすべて取得する
async function all(url) {
  const out = [];
  for (let next = url; next; ) {
    const json = await api('GET', next);
    out.push(...json.data);
    next = json.links && json.links.next;
  }
  return out;
}

const normSerial = (s) => s.replace(/^0+/, '').toUpperCase();

(async () => {
  // 配布用証明書
  const certs = await all('/certificates?limit=200');
  const cert = certs.find((c) => normSerial(c.attributes.serialNumber) === normSerial(CERT_SERIAL));
  if (!cert) throw new Error(`配布用証明書（シリアル ${CERT_SERIAL}）が App Store Connect に見つからない`);

  // Bundle ID（未登録なら登録する）
  const ids = await all(`/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}&limit=200`);
  let bundle = ids.find((b) => b.attributes.identifier === BUNDLE_ID);
  if (!bundle) {
    bundle = (await api('POST', '/bundleIds', {
      type: 'bundleIds',
      attributes: { identifier: BUNDLE_ID, name: BUNDLE_ID.replace(/[^A-Za-z0-9]/g, ' '), platform: 'IOS' },
    })).data;
    console.log(`Bundle ID ${BUNDLE_ID} を登録した`);
  }

  // 同じ Bundle ID・証明書の App Store 用プロファイルを探し、なければ作る
  const profiles = await all(`/bundleIds/${bundle.id}/profiles?limit=200`);
  let profile = null;
  for (const p of profiles) {
    if (p.attributes.profileType !== 'IOS_APP_STORE' || p.attributes.profileState !== 'ACTIVE') continue;
    const pc = await api('GET', `/profiles/${p.id}/certificates?limit=200`);
    if (pc.data.some((c) => c.id === cert.id)) { profile = p; break; }
  }
  if (!profile) {
    profile = (await api('POST', '/profiles', {
      type: 'profiles',
      attributes: { name: `${BUNDLE_ID} AppStore CI ${new Date().toISOString().slice(0, 10)}`, profileType: 'IOS_APP_STORE' },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: bundle.id } },
        certificates: { data: [{ type: 'certificates', id: cert.id }] },
      },
    })).data;
    console.log(`プロファイル「${profile.attributes.name}」を作った`);
  } else {
    profile = (await api('GET', `/profiles/${profile.id}`)).data;
    console.log(`プロファイル「${profile.attributes.name}」を使う`);
  }

  const dir = path.join(os.homedir(), 'Library/MobileDevice/Provisioning Profiles');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${profile.attributes.uuid}.mobileprovision`), Buffer.from(profile.attributes.profileContent, 'base64'));
  if (GITHUB_ENV) fs.appendFileSync(GITHUB_ENV, `PROFILE_NAME=${profile.attributes.name}\nPROFILE_UUID=${profile.attributes.uuid}\n`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
