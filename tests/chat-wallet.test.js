import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { activeLineQuestionIds, bank } from "../dist/js/data/questions.js";
import { applyWrongAnswerPenalty } from "../dist/js/core/money.js";
import { restoreSession, saveSession, validateDraft } from "../dist/js/core/session.js";
import {
  renderBankruptcyModal,
  renderBranchChat,
  renderMoneyBar,
} from "../dist/js/features/branch-chat.js";
import { renderJobBlockResult, renderJobOfferStage, renderLineChatQuestion } from "../dist/js/features/line-chat.js";
import { focusText, renderFocusExercise } from "../dist/js/features/focus-reader.js";

const branchStart = {
  ids: ["l4"],
  index: 0,
  score: 0,
  answered: false,
  complete: false,
  branchFlow: true,
  branchPath: [],
  nextId: null,
};

test("branch money defaults to 400 and restores a valid saved balance", () => {
  assert.equal(validateDraft(branchStart, bank)?.money, 400);
  assert.equal(validateDraft({ ...branchStart, money: 300 }, bank)?.money, 300);
  assert.equal(validateDraft({ ...branchStart, money: 0 }, bank)?.money, 0);
  assert.equal(validateDraft({ ...branchStart, money: -1 }, bank), null);
  assert.equal(validateDraft({ ...branchStart, money: 401 }, bank), null);
});

test("regular sessions with questions 1, 5, and 9 start with a restorable wallet", () => {
  const ids = [...activeLineQuestionIds];
  const regularDraft = {
    ids,
    index: 0,
    score: 0,
    answered: false,
    complete: false,
    branchFlow: false,
  };
  assert.equal(ids.length, 3);
  assert.equal(validateDraft(regularDraft, bank)?.money, 400);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const bankruptSession = validateDraft({ ...regularDraft, money: 0 }, bank);
    assert.equal(bankruptSession.money, 0);
    saveSession(bankruptSession);
    const restored = restoreSession(bank);
    assert.equal(restored.money, 0);
    assert.equal(restored.qs.length, 3);
    const composing = validateDraft(
      { ...regularDraft, interactionStage: "compose", sentMessage: "不了謝謝" },
      bank,
    );
    saveSession(composing);
    const restoredComposer = restoreSession(bank);
    assert.equal(restoredComposer.interactionStage, "compose");
    assert.equal(restoredComposer.sentMessage, "不了謝謝");
    for (const interactionStage of ["screen-share", "hangup", "job-contact", "job-payment", "job-payment-warning", "job-block-ready", "job-menu", "job-blocked"]) {
      saveSession({ ...composing, interactionStage });
      assert.equal(restoreSession(bank).interactionStage, interactionStage);
    }
    assert.equal(validateDraft({ ...regularDraft, interactionStage: "job-refusal" }, bank)?.interactionStage, "job-block-ready");
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else delete globalThis.sessionStorage;
  }
  assert.equal(validateDraft({ ...regularDraft, money: -1 }, bank), null);
});

test("each wrong branch answer deducts 100 without taking the balance below zero", () => {
  assert.deepEqual(applyWrongAnswerPenalty(400), {
    money: 300,
    loss: 100,
    reachedZero: false,
  });
  assert.deepEqual(applyWrongAnswerPenalty(100), {
    money: 0,
    loss: 100,
    reachedZero: true,
  });
  assert.deepEqual(applyWrongAnswerPenalty(0), {
    money: 0,
    loss: 0,
    reachedZero: false,
  });
});

test("saved branch money and bankruptcy acknowledgement survive a session restore", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const initial = validateDraft({ ...branchStart, money: 0, bankruptAcknowledged: true }, bank);
    saveSession(initial);
    const restored = restoreSession(bank);
    assert.equal(restored.money, 0);
    assert.equal(restored.bankruptAcknowledged, true);
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else delete globalThis.sessionStorage;
  }
});

test("the LINE-style branch shows the wallet, simulated incoming message, and reply choices", () => {
  const session = {
    qs: [bank.find((question) => question.id === "l4")],
    index: 0,
    branchPath: [],
    branchFlow: true,
    answered: false,
    money: 400,
  };
  const html = renderBranchChat(session);
  assert.match(html, /LINE 風格模擬聊天/);
  assert.match(html, /NT\$400/);
  assert.match(html, /NT\$100/);
  assert.match(html, /這是新帳號/);
  assert.equal((html.match(/data-answer=/g) ?? []).length, 3);
  assert.match(html, /唸題目和選項給我聽/);
  assert.match(renderMoneyBar(session), /NT\$400/);
});

test("only LINE questions 1, 5, and 9 are active; question 9 uses chat actions instead of answer cards", () => {
  const questions = bank.filter((question) => activeLineQuestionIds.includes(question.id));
  assert.equal(questions.length, 3);
  for (const [index, question] of questions.entries()) {
    const html = renderLineChatQuestion(question, { index, qs: questions });
    assert.match(html, /line-chat-device/);
    assert.match(html, /line-chat-conversation/);
    assert.match(html, /以下為(?:防詐)?模擬對話/);
    assert.match(html, /分段呈現/);
    assert.ok(question.segments.length >= 2, `${question.id} should have multiple scene segments`);
    assert.equal(question.segments.map((segment) => segment.text).join(""), question.text);
    assert.equal(
      (html.match(/class="line-chat-incoming line-chat-segment"/g) ?? []).length,
      question.interaction === "job-offer" ? 1 : question.segments.length,
    );
    if (question.interaction === "job-offer") {
      assert.equal((html.match(/class="line-chat-reply"/g) ?? []).length, 0);
      assert.match(html, /data-scene-action="join-job-chat"/);
      assert.doesNotMatch(html, /data-answer=/);
    } else {
      assert.equal((html.match(/class="line-chat-reply"/g) ?? []).length, 3);
    }
    assert.match(html, /line-chat-composer/);
    assert.match(html, question.interaction === "job-offer" ? /唸出聊天情境和操作提示/ : /唸出訊息和回覆選項/);
    assert.doesNotMatch(html, /line-question-actions/);
    assert.doesNotMatch(html, /line-chat-call-badge|可疑來電|求職風險|徵才貼文|詐騙情境：|高薪求職詐騙模擬/);
    assert.match(html, /<span class="line-scenario-kicker">模擬情境<\/span>/);
  }
});

test("question 1 opens a simulated scam site or prepares a safe reply that must be sent", () => {
  const question = bank.find((item) => item.id === "line-scam-1");
  const qs = [question];
  const site = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "fake-site" });
  assert.match(site, /你被騙了！！/);
  assert.match(site, /不會連到網路/);
  assert.match(site, /不要輸入驗證碼/);
  assert.doesNotMatch(site, /防詐模擬網站|這是假網站演練/);
  assert.match(site, /data-scene-action="submit-phishing"/);

  const reply = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "compose" });
  assert.match(reply, /不了謝謝/);
  assert.match(reply, /data-scene-action="send-safe-reply"/);
  assert.match(reply, /傳送/);
});

test("questions 5 and 9 present their caller and job-ad scenarios before the choices", () => {
  const questions = [
    ["line-scam-5", /LINE 語音來電/, /螢幕共享/],
    ["line-scam-9", /居家打字／點讚員/, /NT\$1,000 保證金/],
  ];
  for (const [id, scene, risk] of questions) {
    const question = bank.find((item) => item.id === id);
    const html = renderLineChatQuestion(question, { index: 0, qs: [question] });
    assert.match(html, scene);
    if (id === "line-scam-9") {
      assert.match(html, /時薪 500 元/);
      assert.match(html, /加入 LINE 聯絡/);
      assert.doesNotMatch(html, risk);
      assert.doesNotMatch(html, /data-answer=|class="line-chat-reply"/);
    } else {
      assert.match(html, risk);
      assert.equal((html.match(/class="line-chat-reply"/g) ?? []).length, 3);
    }
  }
});

test("question 9 reveals the job scam in sequence before the local payment and block steps", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const qs = [question];
  const initial = renderLineChatQuestion(question, { index: 0, qs });
  assert.match(initial, /data-scene-action="join-job-chat"/);
  assert.match(initial, /時薪 500 元/);
  assert.doesNotMatch(initial, /data-answer=|class="line-chat-reply"/);
  assert.doesNotMatch(initial, /存摺與提款卡以發放薪資/);

  const contact = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-contact" });
  assert.match(contact, /你好，我想了解居家打字/);
  assert.match(contact, /先繳納 1,000 元保證金/);
  assert.match(contact, /存摺與提款卡以發放薪資/);
  assert.match(contact, /job-onboard-pay\.example/);
  assert.match(contact, /本機模擬連結/);
  assert.match(contact, /data-scene-action="open-job-payment"/);
  assert.doesNotMatch(contact, /LINE Pay|data-answer=|class="line-chat-reply"/);

  const checkout = renderJobOfferStage("job-payment");
  assert.match(checkout, /仿電子支付介面/);
  assert.doesNotMatch(checkout, /LINE Pay/);
  assert.match(checkout, /NT\$1,000/);
  assert.match(checkout, /data-scene-action="simulate-job-payment"/);
  assert.match(checkout, /data-scene-action="refuse-job-payment"/);
  assert.match(checkout, /不連外、不收款、不收集資料/);
  assert.doesNotMatch(checkout, /<input|<form|href="https?:/);

  const warning = renderJobOfferStage("job-payment-warning");
  assert.match(warning, /你被騙了！！/);
  assert.match(warning, /沒有連到任何支付服務或銀行/);
  assert.doesNotMatch(warning, /LINE Pay/);
  assert.match(warning, /沒有真的扣款/);
  assert.match(warning, /data-scene-action="refuse-job-payment"/);

  const ready = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-block-ready" });
  assert.match(ready, /我拒絕付款，並退出連結/);
  assert.match(ready, /data-scene-action="open-job-menu"/);
  assert.match(ready, /按「封鎖」完成練習/);
  assert.doesNotMatch(ready, /data-answer=|class="line-chat-reply"/);
});

test("question 9 menu exposes four ordered actions and non-blocking actions never answer the quiz", () => {
  const html = renderJobOfferStage("job-menu");
  const labels = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map((match) => match[1].replace(/<[^>]*>/g, "").trim());
  assert.deepEqual(labels, ["關閉提醒", "推薦", "邀請", "封鎖"]);
  assert.match(html, /class="line-job-menu-overlay"/);
  assert.equal((html.match(/<button\b/g) ?? []).length, 4);
  assert.doesNotMatch(html, /line-job-menu-tip|line-job-menu-notice|close-job-menu/);
  for (const action of ["job-menu-mute", "job-menu-recommend", "job-menu-invite", "confirm-job-block"]) {
    assert.match(html, new RegExp(`data-scene-action="${action}"`));
  }
  assert.doesNotMatch(html, /data-answer=/);
  for (const action of ["job-menu-mute", "job-menu-recommend", "job-menu-invite"]) {
    assert.doesNotMatch(html, new RegExp(`data-scene-action="${action}"[^>]*data-answer=|data-answer=[^>]*data-scene-action="${action}"`));
  }
});

test("question 9 opens a full-screen menu that replaces the chat and contains only four actions", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const qs = [question];
  const ready = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-block-ready" });
  assert.match(ready, /data-scene-action="open-job-menu"/);
  assert.match(ready, /aria-expanded="false"/);
  const menu = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-menu" });
  assert.match(menu, /class="line-job-menu-overlay"/);
  assert.match(menu, /aria-modal="true"/);
  assert.equal((menu.match(/<button\b/g) ?? []).length, 4);
  assert.doesNotMatch(menu, /line-chat-device|close-job-menu|data-answer=/);
});

test("question 9 returns to its chat with a correct block result and no lingering reply controls", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const html = renderLineChatQuestion(question, {
    index: 0,
    qs: [question],
    answered: true,
    correct: true,
    selectedAnswer: question.answer,
    interactionStage: "job-blocked",
  });
  assert.match(html, /line-job-inline-success/);
  assert.match(html, /✓ 答對了/);
  assert.match(html, /已在模擬選單按下「封鎖」/);
  assert.match(html, /已在本機模擬封鎖，沒有操作真實 LINE/);
  assert.match(html, /<button type="button" disabled>已退出<\/button>/);
  assert.doesNotMatch(html, /line-chat-composer|data-answer=|class="line-chat-reply"/);
});

test("question 9 safe block completion is simulated and does not block a real LINE account", () => {
  const result = renderJobBlockResult();
  assert.match(result, /已模擬封鎖/);
  assert.match(result, /沒有操作真實 LINE/);
  assert.doesNotMatch(result, /data-answer=/);
});

test("question 5 simulates screen sharing or explicitly hangs up before showing feedback", () => {
  const question = bank.find((item) => item.id === "line-scam-5");
  const qs = [question];
  const initial = renderLineChatQuestion(question, { index: 0, qs });
  assert.match(initial, /data-scene-action="start-screen-share"/);
  assert.match(initial, /data-scene-action="start-hangup"/);
  assert.match(initial, /不會傳送真實訊息/);

  const share = renderLineChatQuestion(question, {
    index: 0,
    qs,
    interactionStage: "screen-share",
  });
  assert.match(share, /你被騙了！！/);
  assert.match(share, /沒有分享你的手機畫面/);
  assert.match(share, /data-scene-action="stop-screen-share"/);
  assert.doesNotMatch(share, /開啟螢幕共享功能，由客服指導/);

  const hangup = renderLineChatQuestion(question, {
    index: 0,
    qs,
    interactionStage: "hangup",
  });
  assert.match(hangup, /安全模擬/);
  assert.match(hangup, /data-scene-action="confirm-hangup"/);
  assert.match(hangup, /掛斷電話/);
  assert.match(question.sceneOutcomes[1], /已掛斷/);
});

test("large-type LINE reading keeps the incoming bubble text separate from its chat header", () => {
  const question = bank.find((item) => item.id === "line-scam-1");
  assert.equal(
    focusText({ qs: [question], index: 0, branchFlow: false, answered: false }),
    question.text,
  );
});

test("large-type question 5 switches from the hang-up call to correct feedback", () => {
  const question = bank.find((item) => item.id === "line-scam-5");
  const rect = (top = 0, height = 30) => ({ top, height });
  const quizBody = { innerHTML: "" };
  const readingCopy = {
    textContent: "",
    getBoundingClientRect: () => rect(150),
  };
  const controls = { getBoundingClientRect: () => rect(0, 100) };
  const focusReader = {};
  const backBar = { getBoundingClientRect: () => rect(700) };
  const previousButton = { disabled: false };
  const readerHint = { textContent: "" };
  const nextButton = { textContent: "" };
  const elements = new Map([
    ["#quizBody", quizBody],
    [".reading-copy", readingCopy],
    [".focus-controls", controls],
    [".focus-reader", focusReader],
    ["#backBar", backBar],
    [".reader-previous", previousButton],
    [".reader-hint", readerHint],
    ["[data-reader-next]", nextButton],
  ]);
  const descriptors = Object.fromEntries(
    ["document", "window", "getComputedStyle"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector: (selector) => elements.get(selector) ?? null },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { innerHeight: 800 },
  });
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: (element) =>
      element === focusReader ? { paddingBottom: "0px" } : { lineHeight: "62px" },
  });

  try {
    const session = {
      qs: [question],
      index: 0,
      branchFlow: false,
      answered: false,
      correct: undefined,
      selectedAnswer: null,
      questionView: "choose",
      interactionStage: "hangup",
      readerOffset: 0,
      readerHistory: [],
    };
    renderFocusExercise(session);
    assert.match(quizBody.innerHTML, /data-scene-action="confirm-hangup"/);

    session.answered = true;
    session.correct = true;
    session.selectedAnswer = 1;
    renderFocusExercise(session);

    assert.match(quizBody.innerHTML, /✓ 答對了/);
    assert.match(quizBody.innerHTML, /focus-reader line-focus-regular-reader/);
    assert.doesNotMatch(quizBody.innerHTML, /line-chat-call-hangup/);
    assert.match(readingCopy.textContent, /安全做法：掛斷，勿共享畫面/);
    assert.match(readingCopy.textContent, /已掛斷可疑來電/);
    assert.match(readingCopy.textContent, /LINE 官方絕不會主動以語音電話聯繫用戶/);
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test("LINE chat rendering escapes message content and contact names", () => {
  const question = {
    ...bank.find((item) => item.id === "line-scam-1"),
    sender: "<script>阿明</script>",
    text: "<img src=x onerror=alert(1)>",
  };
  const html = renderLineChatQuestion(question, { index: 0, qs: [question] });
  assert.match(html, /&lt;script&gt;阿明&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});

test("bankruptcy reminder displays the supplied meme from the local assets folder", () => {
  assert.ok(existsSync(new URL("../dist/assets/bankrupt-meme.png", import.meta.url)));
  const html = renderBankruptcyModal();
  assert.match(html, /data-bankrupt-modal/);
  assert.match(html, /你的現金被騙光了！！/);
  assert.match(html, /assets\/bankrupt-meme\.png/);
  assert.match(html, /我破產了/);
  assert.match(html, /知道了，繼續練習/);
  assert.match(html, /data-bankrupt-dismiss/);
});


test("large-type question 9 keeps the full interactive chat flow and never shows answer cards", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const quizBody = { innerHTML: "" };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector: (selector) => selector === "#quizBody" ? quizBody : null },
  });
  try {
    const session = { qs: [question], index: 0, answered: false, branchFlow: false, questionView: "choose" };
    renderFocusExercise({ ...session, interactionStage: "chat" });
    assert.match(quizBody.innerHTML, /data-scene-action="join-job-chat"/);
    assert.doesNotMatch(quizBody.innerHTML, /class="options"|data-answer=/);
    renderFocusExercise({ ...session, interactionStage: "job-contact" });
    assert.match(quizBody.innerHTML, /存摺與提款卡以發放薪資/);
    assert.match(quizBody.innerHTML, /data-scene-action="open-job-payment"/);
    assert.doesNotMatch(quizBody.innerHTML, /class="options"|data-answer=/);
    renderFocusExercise({ ...session, interactionStage: "job-payment" });
    assert.match(quizBody.innerHTML, /模擬付款頁/);
    assert.match(quizBody.innerHTML, /data-scene-action="simulate-job-payment"/);
    renderFocusExercise({ ...session, interactionStage: "job-payment-warning" });
    assert.match(quizBody.innerHTML, /受騙警示/);
    assert.match(quizBody.innerHTML, /data-scene-action="refuse-job-payment"/);
    assert.match(quizBody.innerHTML, /唸出聊天情境和操作提示/);
    renderFocusExercise({ ...session, interactionStage: "job-block-ready" });
    assert.match(quizBody.innerHTML, /安全封鎖/);
    assert.match(quizBody.innerHTML, /我拒絕付款，並退出連結/);
    assert.match(quizBody.innerHTML, /data-scene-action="open-job-menu"/);
    assert.doesNotMatch(quizBody.innerHTML, /class="options"|data-answer=/);
    renderFocusExercise({ ...session, interactionStage: "job-menu" });
    assert.match(quizBody.innerHTML, /聊天室選單/);
    assert.match(quizBody.innerHTML, /關閉提醒/);
    assert.match(quizBody.innerHTML, /class="line-job-menu-overlay"/);
    assert.equal((quizBody.innerHTML.match(/<button\b/g) ?? []).length, 4);
    renderFocusExercise({ ...session, answered: true, correct: true, interactionStage: "job-blocked" });
    assert.match(quizBody.innerHTML, /line-job-focus-result/);
    assert.match(quizBody.innerHTML, /✓ 答對了/);
    assert.match(quizBody.innerHTML, /data-next/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  }
});
