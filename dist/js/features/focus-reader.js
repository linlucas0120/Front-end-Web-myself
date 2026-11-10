import { $ } from "../core/dom.js?v=branch-2";
import { compactOptions } from "../data/compact-options.js?v=branch-2";

export function focusText(session) {
  const q = session.qs[session.index];
  if (session.answered) {
    const outcome = q.branchResponses?.[session.selectedAnswer];
    return `${outcome ? `你選的做法會怎樣：${outcome}\n` : ""}安全做法：${compactOptions[q.id][q.answer]}。\n${q.explain}\n話術陷阱：${q.trap}`;
  }
  return `${q.sender}：\n${q.text}`;
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

export function renderFocusExercise(session) {
  const q = session.qs[session.index];
  const heading =
    !session.answered && session.questionView === "choose"
      ? "選答案"
      : session.answered
        ? session.correct
          ? "✓ 答對了"
          : "一起記住"
        : "先看情境";
  const step = session.branchFlow
    ? `分支情境 · 第 ${session.index + 1} 步`
    : `第 ${session.index + 1} / ${session.qs.length} 題`;
  const top = `<div class="quiz-top focus-top"><span>${step}</span><h1>${heading}</h1></div>`;
  if (!session.answered && session.questionView === "choose") {
    $("#quizBody").innerHTML =
      `${top}<div class="focus-choices"><h2 class="choice-heading">你會怎麼做？</h2><div class="focus-tools"><button class="secondary" data-reader-back>看題目</button><button class="secondary" data-read data-idle-label="聽答案">聽答案</button></div><div class="options">${compactOptions[q.id].map((option, i) => `<button class="option" data-answer="${i}">${option}</button>`).join("")}</div></div>`;
    return;
  }
  $("#quizBody").innerHTML =
    `${top}<div class="focus-reader"><p class="reading-copy"></p><div class="focus-controls"><div class="reader-position"><button class="reader-previous" data-reader-previous aria-label="回到上一段">上一段</button><span class="reader-hint">還有下一段</span></div><div class="reader-buttons"><button class="secondary" data-read data-idle-label="朗讀本段">朗讀本段</button><button class="primary" data-reader-next>下一段</button></div></div></div>`;
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
