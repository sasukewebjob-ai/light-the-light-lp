// OGP（1200×630）を作る：最初の画面の画像に、いまの LP の言葉を重ねる（文字は画像AIに描かせない＝日本語が崩れるため）
// 使い方：node scripts/make-ogp.js ogp-YYYY-MM-DD.jpg  → できたら index.html の og:image・twitter:image・og:image:alt を直す
// 言葉の正本は docs/copy.md（「LPの言葉」の OGP の行）。言葉を変えたら下の T も直す
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('C:/Users/hanim/AppData/Roaming/npm/node_modules/n8n/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const T = {
  eyebrow: '月2回のZoom勉強会', eyebrow2: '少人数のAIコミュニティ',
  h1a: 'AIは、使い始めた。', h1b: 'でも、仕事でどう使う？',
  lead: '動画を見るだけで、終わらせない。',
  pill: '月5,500円（税込）から・LINEで相談',
};
// 書体は使う文字だけ読む（Google Fonts の text=）
const uniq = (s) => encodeURIComponent([...new Set([...s])].join(''));
const img = (f) => pathToFileURL(path.join(ROOT, f)).href;
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@700&display=block&text=${uniq(T.h1a + T.h1b)}" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700&display=block&text=${uniq(T.eyebrow + T.eyebrow2 + T.lead + T.pill + 'ライトザライト｜')}" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#0B1426;position:relative;font-family:'Noto Sans JP',sans-serif}
.bg{position:absolute;left:200px;top:-28px;width:1024px;height:683px;object-fit:cover}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,#0B1426 0%,rgba(11,20,38,.96) 30%,rgba(11,20,38,.72) 48%,rgba(11,20,38,.15) 66%,rgba(11,20,38,0) 80%)}
.brand{position:absolute;left:72px;top:58px;display:flex;align-items:center;gap:14px;color:#F6F1E6}
.brand img{width:44px;height:auto}
.brand b{display:block;font-family:'Cormorant Garamond',serif;font-weight:500;font-size:31px;letter-spacing:.02em;line-height:1}
.brand b i{color:#F2C14E}
.brand small{display:block;font-size:13px;letter-spacing:.2em;margin-top:5px;font-weight:500;opacity:.9}
.eyebrow{position:absolute;left:72px;top:190px;font-size:21px;font-weight:700;letter-spacing:.06em;color:#E9D9B0}
.eyebrow span{margin:0 12px;opacity:.7;font-weight:500}
h1{position:absolute;left:68px;top:238px;font-family:'Shippori Mincho B1',serif;font-weight:700;font-size:64px;line-height:1.3;letter-spacing:.05em;color:#F6F1E6;font-feature-settings:"palt"}
h1 em{display:block;font-style:normal;color:#F2C14E}
.lead{position:absolute;left:72px;top:448px;font-size:23px;font-weight:500;letter-spacing:.06em;color:#E3E6EC}
.pill{position:absolute;left:72px;top:506px;height:58px;padding:0 30px;display:flex;align-items:center;border-radius:999px;background:#F2C14E;color:#0B1426;font-size:20px;font-weight:700;letter-spacing:.04em}
</style></head><body>
<img class="bg" src="${img('img/hero-night.webp')}" alt="">
<div class="shade"></div>
<div class="brand"><img src="${img('logo-mark.png')}" alt=""><div><b>Light <i>the</i> Light</b><small>ライトザライト</small></div></div>
<p class="eyebrow">${T.eyebrow}<span>｜</span>${T.eyebrow2}</p>
<h1>${T.h1a}<em>${T.h1b}</em></h1>
<p class="lead">${T.lead}</p>
<p class="pill">${T.pill}</p>
</body></html>`;

(async () => {
  const name = process.argv[2];
  if (!name) throw new Error('出力のファイル名を渡してください（例：ogp-2026-10-26.jpg）');
  const out = path.resolve(ROOT, name);
  const tmp = path.join(os.tmpdir(), 'ltl-ogp-template.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ executablePath: 'C:/Users/hanim/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))]);
    if (loaded.length < 3) throw new Error('書体が読めませんでした（ネットの接続を確かめる）：' + loaded.join('・'));
    await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
    console.log('OGP を作りました：' + path.relative(ROOT, out));
  } finally { await browser.close(); fs.rmSync(tmp, { force: true }); }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
