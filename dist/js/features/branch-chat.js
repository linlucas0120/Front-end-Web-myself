import { STARTING_MONEY, WRONG_ANSWER_PENALTY } from "../core/money.js?v=job-9-4";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function renderMoneyBar(session, variant = "") {
  const money = Number.isInteger(session.money) ? session.money : STARTING_MONEY;
  return `<div class="branch-money ${variant}" role="status" aria-live="polite"><span class="branch-money-icon" aria-hidden="true">🪙</span><span class="branch-money-label">我的金錢</span><strong class="branch-money-value">NT$${money}</strong><small>答錯扣 NT$${WRONG_ANSWER_PENALTY}</small></div>`;
}

function incomingMessage(sender, text) {
  return `<div class="line-message line-incoming"><span class="line-message-sender">${escapeHtml(sender)}</span><div class="line-bubble">${escapeHtml(text)}</div><span class="line-message-time">模擬對話</span></div>`;
}

function outgoingMessage(text) {
  return `<div class="line-message line-outgoing"><div class="line-bubble">${escapeHtml(text)}</div><span class="line-message-time">已送出</span></div>`;
}

export function renderBranchChat(session) {
  const question = session.qs[session.index];
  const messages = session.branchPath.map((step) => {
    const priorQuestion = session.qs.find((item) => item.id === step.nodeId);
    if (!priorQuestion) return "";
    return `${incomingMessage(priorQuestion.sender, priorQuestion.text)}${outgoingMessage(step.optionText)}${incomingMessage("情境回覆", priorQuestion.branchResponses[step.optionIndex])}`;
  }).join("");
  const transcript = session.answered
    ? messages
    : `${messages}${incomingMessage(question.sender, question.text)}`;
  const options = !session.answered
    ? `<section class="line-reply-panel" aria-labelledby="line-reply-title"><h2 id="line-reply-title">你會怎麼回覆？</h2><p>選一個做法，看看接下來會發生什麼。</p><button class="secondary line-read-button" type="button" data-read data-idle-label="唸題目和答案給我聽">唸題目和選項給我聽</button><div class="line-choices">${question.options.map((option, index) => `<button class="line-choice" type="button" data-answer="${index}"><span class="line-choice-number" aria-hidden="true">${index + 1}</span><span>${escapeHtml(option)}</span><span class="line-choice-arrow" aria-hidden="true">›</span></button>`).join("")}</div></section>`
    : `<div class="line-composer" aria-hidden="true"><span class="line-composer-plus">＋</span><span class="line-composer-placeholder">已選擇回覆，繼續看情境</span><span class="line-composer-face">☺</span></div>`;

  return `<section class="line-chat-card" aria-label="LINE 風格模擬聊天"><header class="line-chat-header"><div class="line-chat-avatar" aria-hidden="true">哲</div><div class="line-chat-contact"><strong>阿哲</strong><span>模擬帳號 · 防詐練習</span></div><span class="line-chat-more" aria-hidden="true">⋮</span></header><div class="line-chat-topic"><span>熟人換新帳號借錢</span><span>第 ${session.index + 1} 步</span></div>${renderMoneyBar(session)}<div class="line-chat-log" role="log" aria-label="模擬聊天內容"><div class="line-date-chip">以下為虛構的練習對話</div>${transcript}</div>${options}</section>`;
}

export function renderBranchFeedback(question, session) {
  const nextLabel = session.nextId ? "下一步" : "看練習結果";
  return `<section class="branch-feedback"><span class="answer-label">${session.correct ? "✓ 答對了" : "我們一起再看一次"}</span><h2>${session.correct ? "做得好，記住這個安全方法。" : "沒關係，這次一起學會怎麼保護自己。"}</h2><section class="safe-action"><h3>安全的做法</h3><p>${escapeHtml(question.options[question.answer])}</p></section><p class="answer-explanation">${escapeHtml(question.explain)}</p><details class="trap-details"><summary>為什麼要小心？</summary><p>${escapeHtml(question.trap)}</p></details><div class="answer-actions"><button class="primary" type="button" data-next>${nextLabel} <span aria-hidden="true">→</span></button><button class="secondary" type="button" data-read data-idle-label="唸解說給我聽">唸解說給我聽</button></div></section>`;
}

export function renderBankruptcyModal() {
  return `<div class="bankrupt-overlay" data-bankrupt-modal role="dialog" aria-modal="true" aria-labelledby="bankrupt-title"><section class="bankrupt-dialog"><p class="bankrupt-kicker">錢包提醒</p><h2 id="bankrupt-title">你的現金被騙光了！！</h2><img src="assets/bankrupt-meme.png" alt="海綿寶寶和派大星，字幕寫著：我破產了" /><button class="primary" type="button" data-bankrupt-dismiss>知道了，繼續練習</button></section></div>`;
}
