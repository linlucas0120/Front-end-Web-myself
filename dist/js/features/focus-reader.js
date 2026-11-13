import { $ } from "../core/dom.js?v=job-9-4";
import { compactOptions } from "../data/compact-options.js?v=job-9-4";
import { escapeHtml, getLineContact, renderLineChatQuestion, renderSupportCallStage } from "./line-chat.js?v=job-9-4";

export function focusText(session) {
  const q = session.qs[session.index];
  if (session.answered) {
    const outcome = q.branchResponses?.[session.selectedAnswer];
    const sceneOutcome = q.sceneOutcomes?.[session.selectedAnswer];
    const sentMessage = session.sentMessage
      ? `你已送出訊息：${session.sentMessage}。\n`
      : "";
    const blocked = q.interaction === "job-offer" && session.correct && session.interactionStage === "job-blocked"
      ? "已模擬封鎖。你已從聊天室選單按下封鎖。這只是本機教學，沒有操作真實 LINE，也沒有傳送訊息。\n"
      : "";
    return `${blocked}${sentMessage}${sceneOutcome ? `你選的做法會怎樣：${sceneOutcome}\n` : outcome ? `你選的做法會怎樣：${outcome}\n` : ""}安全做法：${compactOptions[q.id][q.answer]}。\n${q.explain}\n話術陷阱：${q.trap}`;
  }
  return session.branchFlow || q.type === "line" ? q.text : `${q.title}。\n${q.sender}：\n${q.text}`;
}

// Measure against the actual typeface, width, and available viewport height.
// No text is truncated: the remaining characters are shown on the next page.
export function fitTextPage(text, offset, element, availableHeight) {
  const points = Array.from(text);
  const from = Math.min(Math.max(0, offset), Math.max(0, points.length - 1));
  let low = 1,
    high = points.length - from,
    fit = 1;
  while (low <= high) {
    const length = Math.floor((low + high) / 2);
    element.textContent = points.slice(from, from + length).join("");
    if (element.getBoundingClientRect().height <= availableHeight) {
      fit = length;
      low = length + 1;
    } else high = length - 1;
  }
  // Prefer a sentence boundary when it uses at least half of this page.
  const candidate = points.slice(from, from + fit);
  if (from + fit < points.length) {
    const punctuation = candidate
      .map((c, i) => (/[，。！？；\n]/.test(c) ? i + 1 : 0))
      .filter(Boolean)
      .at(-1);
    if (punctuation && punctuation >= fit * 0.5) fit = punctuation;
  }
  const end = Math.min(from + fit, points.length);
  element.textContent = points.slice(from, end).join("");
  return { start: from, end, finished: end === points.length };
}

export function renderFocusExercise(
  session,
  { moneyMarkup = "", bankruptcyMarkup = "" } = {},
) {
  const q = session.qs[session.index];
  const heading =
    !session.answered && q.interaction === "job-offer" && session.interactionStage === "job-payment"
      ? "模擬付款頁"
      : !session.answered && q.interaction === "job-offer" && session.interactionStage === "job-payment-warning"
        ? "受騙警示"
      : !session.answered && q.interaction === "job-offer" && session.interactionStage === "job-block-ready"
        ? "安全封鎖"
      : !session.answered && q.interaction === "job-offer" && session.interactionStage === "job-menu"
        ? "聊天室選單"
      : !session.answered && session.questionView === "choose"
      ? "選答案"
      : session.answered
        ? session.correct
          ? "✓ 答對了"
          : "一起記住"
        : "先看情境";
  const step = session.branchFlow
    ? `分支情境 · 第 ${session.index + 1} 步`
    : `第 ${session.index + 1} / ${session.qs.length} 題`;
  const lineChat = !session.branchFlow && q.type === "line";
  const contact = lineChat ? getLineContact(q.sender) : null;
  if (
    lineChat &&
    q.interaction === "job-offer" &&
    session.answered &&
    session.correct &&
    session.interactionStage === "job-blocked"
  ) {
    const nextLabel = session.index + 1 === session.qs.length ? "看練習結果" : "下一題";
    $("#quizBody").innerHTML = `${moneyMarkup}${renderLineChatQuestion(q, session)}<section class="line-job-focus-result" aria-label="封鎖操作答對解說"><strong>✓ 答對了</strong><h2>做得好，記住這個方法。</h2><p><b>安全做法：</b>${escapeHtml(compactOptions[q.id][q.answer])}</p><p>${escapeHtml(q.explain)}</p><button class="primary" type="button" data-next>${nextLabel} <span aria-hidden="true">→</span></button></section>${bankruptcyMarkup}`;
    return;
  }
  const top = session.branchFlow
    ? `<div class="quiz-top focus-top line-focus-top"><span class="line-focus-contact"><span class="line-focus-avatar" aria-hidden="true">哲</span><span>模擬聊天 · 第 ${session.index + 1} 步</span></span><h1>${heading}</h1></div>${moneyMarkup}`
    : lineChat
      ? `<div class="quiz-top focus-top line-reader-top"><span class="line-reader-contact"><span class="line-reader-avatar" aria-hidden="true">${escapeHtml(contact.avatar)}</span><span class="line-reader-identity"><strong>${escapeHtml(contact.name)}</strong><small>防詐情境演練 · ${step}</small></span></span><h1>${heading}</h1></div>${moneyMarkup}`
      : `<div class="quiz-top focus-top"><span>${step}</span><h1>${heading}</h1></div>${moneyMarkup}`;
  if (lineChat && q.interaction === "job-offer" && !session.answered) {
    $("#quizBody").innerHTML = `${top}${renderLineChatQuestion(q, session)}${bankruptcyMarkup}`;
    return;
  }
  if (
    lineChat &&
    q.interaction === "vote-link" &&
    !session.answered &&
    session.interactionStage === "fake-site"
  ) {
    $("#quizBody").innerHTML = `${top}<section class="focus-choices line-focus-regular-choices"><div class="line-focus-chat-note">模擬投票網站 · 不會連到外部網路</div><div class="line-chat-fake-content"><span class="line-chat-fake-label">你打開了可疑網址</span><h2 id="fake-site-title">你被騙了！！</h2><p>仿冒網站會要求手機號碼和簡訊驗證碼，藉此盜取 LINE 帳號。</p><strong>不要輸入驗證碼，也不要提供個人資料。</strong><button class="primary" type="button" data-scene-action="submit-phishing">我知道了，查看解析</button></div></section>${bankruptcyMarkup}`;
    return;
  }
  if (
    lineChat &&
    q.interaction === "vote-link" &&
    !session.answered &&
    session.interactionStage === "compose"
  ) {
    $("#quizBody").innerHTML = `${top}<section class="focus-choices line-focus-regular-choices"><div class="line-focus-chat-note">${escapeHtml(q.title)} · 模擬聊天室</div><h2 class="choice-heading">訊息框已填入回覆</h2><div class="line-focus-compose-preview" role="textbox" aria-readonly="true">不了謝謝</div><p>按下傳送後，再用原本保存的電話確認阿明本人。</p><button class="primary line-focus-send" type="button" data-scene-action="send-safe-reply">傳送</button></section>${bankruptcyMarkup}`;
    return;
  }
  if (
    lineChat &&
    q.interaction === "support-call" &&
    !session.answered &&
    ["screen-share", "hangup"].includes(session.interactionStage)
  ) {
    $("#quizBody").innerHTML = `${top}${renderSupportCallStage(session.interactionStage)}${bankruptcyMarkup}`;
    return;
  }
  if (!session.answered && session.questionView === "choose") {
    const options = compactOptions[q.id].map((option, i) => {
      const action =
        lineChat && q.interaction === "vote-link" && i === 0
          ? ' data-scene-action="open-fake-site"'
          : lineChat && q.interaction === "vote-link" && i === 1
            ? ' data-scene-action="prepare-safe-reply"'
            : lineChat && q.interaction === "support-call" && i === 0
              ? ' data-scene-action="start-screen-share"'
              : lineChat && q.interaction === "support-call" && i === 1
              ? ' data-scene-action="start-hangup"'
                : lineChat && q.interaction === "job-offer" && i === 0
                  ? ' data-scene-action="open-job-payment"'
                  : lineChat && q.interaction === "job-offer" && i === 1
                    ? ' data-scene-action="prepare-job-block"'
            : ` data-answer="${i}"`;
      return `<button class="option"${action}>${escapeHtml(option)}</button>`;
    }).join("");
    $("#quizBody").innerHTML =
      `${top}<div class="focus-choices${session.branchFlow ? " branch-focus-choices" : lineChat ? " line-focus-regular-choices" : ""}">${lineChat ? `<div class="line-focus-chat-note">${escapeHtml(q.title)} · 防詐模擬對話</div>` : ""}<h2 class="choice-heading">${lineChat && q.interaction === "support-call" ? "你會怎麼處理這通來電？" : lineChat && q.interaction === "job-offer" ? "你會怎麼回應這則求職訊息？" : lineChat ? "你會怎麼回覆？" : "你會怎麼做？"}</h2><div class="focus-tools"><button class="secondary" data-reader-back>看題目</button><button class="secondary" data-read data-idle-label="聽答案">聽答案</button></div><div class="options">${options}</div></div>${bankruptcyMarkup}`;
    return;
  }
  $("#quizBody").innerHTML =
    `${top}<div class="focus-reader${session.branchFlow ? " branch-focus-reader" : lineChat ? " line-focus-regular-reader" : ""}">${lineChat ? `<div class="line-focus-chat-note">${escapeHtml(q.title)} · 防詐模擬對話</div>` : ""}<p class="reading-copy"></p><div class="focus-controls"><div class="reader-position"><button class="reader-previous" data-reader-previous aria-label="回到上一段">上一段</button><span class="reader-hint">還有下一段</span></div><div class="reader-buttons"><button class="secondary" data-read data-idle-label="朗讀本段">朗讀本段</button><button class="primary" data-reader-next>下一段</button></div></div></div>${bankruptcyMarkup}`;
  const text = focusText(session);
  const element = $(".reading-copy");
  const controls = $(".focus-controls");
  const body = $(".focus-reader");
  const backTop = $("#backBar").getBoundingClientRect().top;
  const viewportBottom = Math.min(
    window.innerHeight,
    window.visualViewport?.height || window.innerHeight,
    backTop,
  );
  const padding = parseFloat(getComputedStyle(body).paddingBottom);
  const oneLine = parseFloat(getComputedStyle(element).lineHeight) || 62;
  const available = Math.max(
    oneLine,
    viewportBottom -
      element.getBoundingClientRect().top -
      controls.getBoundingClientRect().height -
      padding -
      30,
  );
  const page = fitTextPage(text, session.readerOffset || 0, element, available);
  session.readerEnd = page.end;
  session.readerFinished = page.finished;
  $(".reader-previous").disabled = !session.readerHistory?.length;
  $(".reader-hint").textContent = page.finished ? "已讀完" : "還有下一段";
  $("[data-reader-next]").textContent = page.finished
    ? session.answered
      ? session.branchFlow
        ? session.nextId
          ? "下一步"
          : "看結果"
        : session.index + 1 === session.qs.length
          ? "看結果"
          : "下一題"
      : "選答案"
    : "下一段";
}
