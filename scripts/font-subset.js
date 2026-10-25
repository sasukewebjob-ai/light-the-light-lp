// 見出しの明朝（Shippori Mincho B1）を、ページで実際に使っている文字だけ読み込むように、index.html の書体のリンクを作り直す
// 使い方：node scripts/font-subset.js（見出し・数字など明朝の所の文字を変えたら、もう一度動かす）
//   index.html を手元で開き、明朝で表示している要素の文字（閉じた開閉・タブの中も）を集めて、Google Fonts の text= に入れる
//   和文の書体を丸ごと読むと 1.4MB あり、スマホの表示が遅くなっていた（2026-10-25 HP作成システムの診断：LCP 4.7秒・TBT 5.6秒）
//   集めた文字に無い文字が後で入ると、その文字だけ端末の明朝で出る（崩れはしない）
// Playwright は、このPCの n8n に入っているものを使う
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('C:/Users/hanim/AppData/Roaming/npm/node_modules/n8n/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json' };
const START = '<!-- font-subset:start -->', END = '<!-- font-subset:end -->';

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }); res.end(buf); });
    });
    server.listen(0, '127.0.0.1', () => resolve({ url: 'http://127.0.0.1:' + server.address().port + '/', close: () => server.close() }));
  });
}

(async () => {
  const srv = await serve();
  const browser = await chromium.launch({ executablePath: 'C:/Users/hanim/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe' });
  let chars = '';
  try {
    for (const w of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(srv.url + '?opening=off', { waitUntil: 'load' });
      chars += await page.evaluate(() => {
        let t = '';
        document.querySelectorAll('body *').forEach((el) => {
          if (!/Shippori Mincho B1/.test(getComputedStyle(el).fontFamily)) return;
          el.childNodes.forEach((n) => { if (n.nodeType === 3) t += n.nodeValue; });
        });
        return t;
      });
      await page.close();
    }
  } finally { await browser.close(); srv.close(); }
  const set = Array.from(new Set(Array.from(chars.replace(/\s/g, '')))).sort().join('');
  const href = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@700&display=swap&text=' + encodeURIComponent(set);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const a = html.indexOf(START), b = html.indexOf(END);
  if (a < 0 || b < a) throw new Error('index.html に印（' + START + ' 〜 ' + END + '）がありません');
  const block = START + '<link href="' + href.replace(/&/g, '&amp;') + '" rel="stylesheet">' + END;
  fs.writeFileSync(path.join(ROOT, 'index.html'), html.slice(0, a) + block + html.slice(b + END.length));
  console.log('明朝の文字：' + set.length + ' 字・URL ' + href.length + ' 文字');
})().catch((e) => { console.error(e); process.exit(1); });
