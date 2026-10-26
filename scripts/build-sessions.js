// docs/sessions.json から「勉強会の中身」のカードの HTML を作り、index.html の印の間に入れる
// 使い方：node scripts/build-sessions.js
// 画面の画像は img/sessions/<file>.webp（録画から切り出し、個人情報・企業情報は切り落とし／ぼかし済みのもの）
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const sessions = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'sessions.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// WebP の幅と高さ（VP8/VP8L/VP8X のヘッダーから読む）
function webpSize(file) {
  const b = fs.readFileSync(file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  throw new Error('WebP の大きさを読めません：' + file);
}

// 1回＝カード1枚（日付・仕事の何に使う回かの1行＝見出し・当日の題・当日の画面1枚）。noteにレポートがある回は記事へのリンクを付ける
// 見出しは lead（初めての人にも分かる言葉）。当日の題（録画のタイトルのまま）は小さく添える（2026-10-26）
const cards = sessions.map((s) => {
  const src = `img/sessions/${s.shot.file}.webp`;
  const { w, h } = webpSize(path.join(ROOT, src));
  const note = s.note
    ? `\n          <a class="text-link session-link" href="${esc(s.note)}" target="_blank" rel="noopener" aria-label="noteでレポートを読む：${esc(s.title)}">noteでレポートを読む<span aria-hidden="true">↗</span></a>`
    : '';
  return `      <article class="session" id="session-${s.id}" aria-labelledby="session-${s.id}-title">
        <div class="session-body">
          <time datetime="${s.date}">${s.date.replace(/-/g, '.')}</time>
          <h3 id="session-${s.id}-title">${esc(s.lead)}</h3>
          <p class="session-lead">当日の題「${esc(s.title)}」</p>${note}
        </div>
        <div class="session-shot"><img src="${src}" width="${w}" height="${h}" alt="当日の画面：${esc(s.shot.caption)}" loading="lazy" decoding="async"></div>
      </article>`;
}).join('\n');

const block = `<!-- sessions:start（scripts/build-sessions.js が作る。手で直さない） -->
${cards}
<!-- sessions:end -->`;

const file = path.join(ROOT, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const re = /<!-- sessions:start[\s\S]*?<!-- sessions:end -->/;
if (!re.test(html)) throw new Error('index.html に sessions の印がありません');
fs.writeFileSync(file, html.replace(re, block));
console.log('勉強会 ' + sessions.length + '回（noteのレポート ' + sessions.filter((s) => s.note).length + '本）を入れました');
