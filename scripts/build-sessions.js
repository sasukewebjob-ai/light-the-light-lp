// docs/sessions.json から「勉強会の中身」（横スワイプ）の HTML を作り、index.html の印の間に入れる
// 使い方：node scripts/build-sessions.js
// 画面の画像は img/sessions/<file>.webp（録画から切り出し、個人情報・企業情報は切り落とし／ぼかし済みのもの）
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const sessions = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'sessions.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');

// WebP の幅と高さ（VP8/VP8L/VP8X のヘッダーから読む）
function webpSize(file) {
  const b = fs.readFileSync(file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  throw new Error('WebP の大きさを読めません：' + file);
}

const chips = sessions.map((s, i) => {
  const md = s.date.slice(5).replace('-', '.');
  return `        <a class="session-chip" href="#session-${s.id}" data-session-link="${s.id}"${i === 0 ? ' aria-current="true"' : ''}><time datetime="${s.date}">${md}</time><span>${esc(s.title)}</span></a>`;
}).join('\n');

const groups = sessions.map((s) => {
  const [y, m, d] = s.date.split('-');
  const shots = s.shots.map((sh, i) => {
    const src = `img/sessions/${sh.file}.webp`;
    const { w, h } = webpSize(path.join(ROOT, src));
    return `      <figure class="shot"><div class="shot-frame"><img src="${src}" width="${w}" height="${h}" alt="${esc(s.title)}の画面：${esc(sh.caption)}" loading="lazy" decoding="async"></div><figcaption><span>${pad(i + 1)}</span>${esc(sh.caption)}</figcaption></figure>`;
  }).join('\n');
  return `    <article class="session" id="session-${s.id}" data-session="${s.id}" aria-labelledby="session-${s.id}-title">
      <header class="session-head">
        <time datetime="${s.date}"><span>${y}</span>${m}.${d}</time>
        <h3 id="session-${s.id}-title">${esc(s.title)}</h3>
        <p>${esc(s.summary)}</p>
        <span class="session-more" aria-hidden="true">当日の画面 ${s.shots.length}枚 →</span>
      </header>
${shots}
    </article>`;
}).join('\n');

const block = `<!-- sessions:start（scripts/build-sessions.js が作る。手で直さない） -->
      <nav class="session-chips" aria-label="勉強会のテーマ">
${chips}
      </nav>
    </div>
    <div class="session-track" id="sessionTrack" tabindex="0" role="region" aria-label="勉強会の画面（横にスクロールできます）">
${groups}
    </div>
    <div class="container">
<!-- sessions:end -->`;

const file = path.join(ROOT, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const re = /<!-- sessions:start[\s\S]*?<!-- sessions:end -->/;
if (!re.test(html)) throw new Error('index.html に sessions の印がありません');
fs.writeFileSync(file, html.replace(re, block));
console.log('勉強会 ' + sessions.length + '回・画面 ' + sessions.reduce((n, s) => n + s.shots.length, 0) + '枚を入れました');
