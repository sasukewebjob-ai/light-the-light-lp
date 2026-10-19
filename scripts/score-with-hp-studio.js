// このLPを、ハイクオリティHP作成システムと同じ採点（Playwright の実測＋言葉の検査＋Codex の採点）にかける
// 使い方：python -m http.server 8765 --bind 127.0.0.1 を起動してから
//   node scripts/score-with-hp-studio.js "http://127.0.0.1:8765/?opening=off" <結果のフォルダ名>
// 結果は HP作成システムの runs/<フォルダ名>/（score.json とスクリーンショット。git には入れない）
// 合格＝Quality 75 以上・AIっぽさ 25 以下・致命的な不具合 0（HP作成システムの決まり）
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/hanim/Documents/ライトザライト営業用GASシステム/ハイクオリティHP作成システム';
const U = require(ROOT + '/src/util');
const P = require(ROOT + '/src/prompts');
const score = require(ROOT + '/src/score');
const cliche = require(ROOT + '/src/qa/cliche');
const { capture, sheet } = require(ROOT + '/src/qa/capture');
const { launch, checkPublicUrl } = require(ROOT + '/src/qa/browser');
const { createProviders } = require(ROOT + '/src/llm');

const URL_ = process.argv[2] || 'http://127.0.0.1:8765/?opening=off';
const OUT = path.join(ROOT, 'runs', process.argv[3] || ('ライトザライトLP-採点-' + U.stamp()));
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(URL_);
// 実在の事実の正本（「メディア掲載」などの根拠の確認に使う）
const PROOF = fs.readFileSync(path.join(__dirname, '..', 'docs', 'copy.md'), 'utf8');

// 採点する人に渡す「このサイトの目的」（docs/copy.md と docs/redesign-2026-10.md の要約）
const strategy = {
  positioning: 'AIを使い始めたけれど、仕事でどう使えばいいか・どう学べばいいかわからない個人事業主・副業層・会社員に向けた、月2回のZoomグループコンサルを中心にした少人数のAIコミュニティ「ライトザライト」の入会相談LP。まだAIを触ったことがない人は対象外',
  cta: { primary: { label: '参加についてLINEで相談する' } },
  fiveSecond: ['AIを使い始めたが仕事での使い方・学び方がわからない人のための場', '月2回・平日21:25〜のZoomグルコン、月5,500円から、定員20名', '実際の勉強会の中身を見て、LINEで相談できる']
};
const concept = {
  name: '夜の灯り（Light the Light）',
  idea: 'はじまりと終わりは夜の紺に金の灯り（ロゴの羅針盤と星）。本文は温かい白で読みやすく。平日21:25に自宅から集まる大人の勉強会の空気',
  signature: 'ロゴに光がともるオープニング、夜の画面に漂う灯り、実際の勉強会の画面をテーマごとに1枚ずつ見せ、詳しい内容は運営者のnoteのレポートへつなぐ「勉強会の中身」'
};
const shotNotes = '1枚目＝PCの最初の画面、2枚目＝PCのページ全体（列に分けて縮小）、3枚目＝スマホの最初の画面と全体。ページ全体の画像は、画面下に固定するボタンを外して撮っています。'
  + '初回だけ約2秒のオープニング（ロゴに光がともる）がありますが、静止画では写らないので最初の画面そのものを撮っています。'
  + '「勉強会の中身」は5回分を1回1枚のカード（日付・テーマ・仕事の何に使う回かの1行・画面1枚）で並べ、詳しい内容は運営者のnoteのレポートへつないでいます（レポートがある3回は記事へ直接リンク）。'
  + 'スマホの全体画像はページが長く、撮影の上限（16384px）を超えた分が乱れて写ることがあります。AIの画像（最初の画面・3つの壁・夜の住宅街）は「イメージ」と明記しています。';

(async () => {
  U.ensureDir(OUT);
  const safe = LOCAL ? { ok: true, url: URL_ } : await checkPublicUrl(URL_);
  if (!safe.ok) throw new Error(safe.reason);
  const providers = createProviders({ onCall: (c) => console.log('ai', c.who, c.role, c.ok ? '成功' : '失敗', Math.round(c.ms / 1000) + '秒') });
  const browser = await launch();
  try {
    const shotsDir = U.ensureDir(path.join(OUT, 'shots'));
    console.log('撮影・実測…');
    const cap = await capture(safe.url, shotsDir, { browser, guard: !LOCAL });
    const tech = score.techScore(cap);
    const html = await (await fetch(safe.url)).text();
    fs.writeFileSync(path.join(OUT, 'index.html'), html);
    const text = cliche.visibleText(html);
    const cl = cliche.detect(text, PROOF);
    const memo = cliche.productionNotes(text);
    const imgs = [cap.shots.laptop.first,
      await sheet([{ file: cap.shots.laptop.full, label: 'PC 1280px（ページ全体）', scale: 0.5 }], path.join(shotsDir, 'sheet-desktop.png'), { browser, colHeight: 2200 }),
      await sheet([{ file: cap.shots.mobile.first, label: 'スマホ 最初の画面', scale: 1 }, { file: cap.shots.mobile.full, label: 'スマホ 390px（全体）', scale: 0.6 }], path.join(shotsDir, 'sheet-mobile.png'), { browser, colHeight: 2200 })];
    const techBrief = { score: tech.score, problems: tech.issues.map((i) => i.problem).slice(0, 8) };
    console.log('Codex の採点…');
    const crit = await providers.judgeJson('critic', P.critic(strategy, concept, techBrief, null, shotNotes, { fictional: false }), { images: imgs, schema: P.CRITIC_SCHEMA, timeoutMs: 12 * 60 * 1000 });
    // 実在のサイトなので「ブリーフにない数字」の照合はしない（数字の正本は docs/copy.md）
    const agg = score.aggregate({ critic: crit, tech, cliche: cl, similarity: null, memo });
    const result = Object.assign({ url: safe.url, at: new Date().toISOString(), firstImpression: crit.firstImpression, strengths: crit.strengths, cliche: { score: cl.score, hits: cl.hits.slice(0, 8), unproven: cl.unproven }, memo,
      tech: { score: tech.score, bytes: cap.bytes, console: cap.console.slice(0, 10), failed: cap.failed.slice(0, 10) }, shots: cap.shots }, agg);
    U.writeJson(path.join(OUT, 'score.json'), result);
    U.writeJson(path.join(OUT, 'measure.json'), { tech: cap.tech, design: Object.assign({}, cap.design, { shingles: undefined }) });
    console.log(JSON.stringify({ quality: agg.quality, categories: agg.categories, aiCliche: agg.aiCliche, critical: agg.critical, pass: agg.pass }, null, 1));
    agg.issues.forEach((i) => console.log('[' + i.severity + '] ' + i.problem));
  } finally { await browser.close(); }
})().catch((e) => { console.error('エラー：' + (e && e.stack || e)); process.exitCode = 1; });
