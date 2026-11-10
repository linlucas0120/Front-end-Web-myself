import { types } from "../data/questions.js?v=branch-2";
import { getState, getMistakes as mistakes } from "../core/store.js?v=branch-2";
export function mistakePage() {
  const data = getState();
  const list = mistakes();
  return `<section class="page-title"><span class="eyebrow">答錯，是進步的開始</span><h1>我的錯題筆記</h1><p>一起看懂話術背後的心理陷阱，再練一次就更有信心。</p></section>${list.length ? `<div class="section-head"><h2>有 ${list.length} 個情境值得再看看</h2><button class="primary" data-start="review">開始針對複習 →</button></div>${list.map((q) => `<article class="record"><span class="record-meta">${types[q.type].name}</span><h3>${q.title}</h3><p><strong>心理陷阱：</strong>${q.trap}</p><p><strong>下次可以這樣做：</strong>${q.explain}</p><button class="secondary" data-question="${q.id}">再練一次 →</button></article>`).join("")}` : `<div class="empty"><div style="font-size:38px">✓</div><h2>${data.attempts.length ? "目前沒有待複習的錯題" : "你的防詐筆記，從第一題開始"}</h2><p>${data.attempts.length ? "做得很好！你也可以繼續挑戰其他情境。" : "完成情境練習後，這裡會整理需要多留意的心理陷阱。"}</p><button class="primary" data-start="random">開始練習 →</button></div>`}`;
}
