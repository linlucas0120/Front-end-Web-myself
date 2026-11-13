import { completionCard } from "../components/completion.js?v=job-9-4";
import { renderFocusExercise } from "./focus-reader.js?v=job-9-4";
import {
  renderBankruptcyModal,
  renderBranchChat,
  renderBranchFeedback,
  renderMoneyBar,
} from "./branch-chat.js?v=job-9-4";
import { escapeHtml, renderJobBlockResult, renderLineChatQuestion } from "./line-chat.js?v=job-9-4";
import { STARTING_MONEY, applyWrongAnswerPenalty } from "../core/money.js?v=job-9-4";
import { compactOptions } from "../data/compact-options.js?v=job-9-4";
import { $ } from "../core/dom.js?v=job-9-4";
import { bank, types } from "../data/questions.js?v=job-9-4";
import {
  getState,
  recordResult,
  recordScenarioResult,
} from "../core/store.js?v=job-9-4";
import { selectQuestions } from "../core/engine.js?v=job-9-4";
import { restoreSession, saveSession } from "../core/session.js?v=job-9-4";
import { say, stopSpeech, isSpeaking } from "./accessibility.js?v=job-9-4";
export function createExerciseController({ refresh }) {
  let session = restoreSession(bank);
  let lastFocusSpeech = "";
  function jobStageSpeech() {
    const question = session?.qs[session.index];
    if (session?.answered || question?.interaction !== "job-offer") return "";
    if (session.interactionStage === "chat")
      return "你看到一則時薪五百元的居家打字或點讚工作廣告。按加入 LINE 聯絡，看看對方接著會提出什麼要求。這是本機模擬，不會加入真實帳號。";
    if (session.interactionStage === "job-contact")
      return "你已模擬加入 LINE 聯絡。對方要求上工前先繳保證金，或交出存摺和提款卡，接著傳來付款連結。按開啟連結，只會進入本機仿電子支付頁。";
    if (session.interactionStage === "job-payment")
      return "這是仿電子支付頁面，只是本機模擬，不會連網或扣款。畫面要求先繳一千元保證金。按模擬付款只會顯示受騙警示；也可以拒付並退出。";
    if (session.interactionStage === "job-payment-warning")
      return "你被騙了！要求求職者先繳保證金，或提供存摺、提款卡，是重大警訊。剛才只是本機模擬，沒有連到任何支付服務或銀行，也沒有真的扣款。請拒付並回聊天室選單封鎖。";
    if (session.interactionStage === "job-block-ready")
      return "你已拒付並退出模擬付款頁。不要交錢，也不要交出存摺或提款卡。請按聊天室右上角的選單，再從四個操作按鈕中選擇封鎖，完成練習。這是本機模擬，不會操作真實 LINE。";
    if (session.interactionStage === "job-menu")
      return `${session.jobMenuNotice || "聊天室選單已開啟。"}選單有關閉提醒、推薦、邀請、封鎖四個模擬按鈕。請按封鎖完成安全做法。其他按鈕不會完成題目，也不會操作真實 LINE。`;
    return "";
  }
  function start(mode, id) {
    const qs = selectQuestions(bank, getState().attempts, mode, id);
    if (!qs.length) return;
    session = {
      qs,
      index: 0,
      score: 0,
      answered: false,
      complete: false,
      branchFlow: mode === "borrow-branch",
      branchScenario: mode === "borrow-branch" ? qs[0].branchScenario : null,
      nextId: null,
      selectedAnswer: null,
      branchPath: [],
      interactionStage: "chat",
      sentMessage: "",
      money: STARTING_MONEY,
      bankruptAcknowledged: false,
    };
    saveSession(session);
    if (location.hash === "#exercise") refresh();
    else location.hash = "exercise";
  }
  function feedback(q, correct, { includeBlockResult = true } = {}) {
    const sceneResult = session.sceneResult || q.sceneOutcomes?.[session.selectedAnswer]
      ? `<p class="line-scene-result${correct ? " is-safe" : ""}" role="status">${escapeHtml(session.sceneResult || q.sceneOutcomes?.[session.selectedAnswer])}</p>`
      : "";
    const sentMessage = session.sentMessage
      ? `<p class="line-scene-result is-safe" role="status">你已在模擬聊天室送出：「${escapeHtml(session.sentMessage)}」</p>`
      : "";
    const blockResult = includeBlockResult && q.interaction === "job-offer" && correct && session.interactionStage === "job-blocked"
      ? renderJobBlockResult()
      : "";
    const fakeSiteWarning =
      (q.interaction === "vote-link" && session.interactionStage === "fake-site") ||
      (q.interaction === "support-call" && session.interactionStage === "screen-share")
        ? `<p class="line-scene-result" role="alert"><strong>你被騙了！！</strong> 這是防詐情境演練，沒有連到外部網站，也沒有分享手機畫面。</p>`
        : "";
    return `<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><div class="quiz-content answer-page"><span class="answer-label">${correct ? "✓ 答對了" : "我們一起再看一次"}</span><h1>${correct ? "做得好，記住這個方法。" : "下次可以這樣做。"}</h1>${blockResult}${fakeSiteWarning}${sentMessage}${sceneResult}<section class="safe-action"><h2>安全的做法</h2><p>${q.options[q.answer]}</p></section><p class="answer-explanation">${q.explain}</p><details class="trap-details"><summary>為什麼要小心？</summary><p>${q.trap}</p></details><div class="answer-actions"><button class="primary" data-next>${session.index + 1 === session.qs.length ? "看練習結果" : "下一題"} <span aria-hidden="true">→</span></button><button class="secondary" data-read data-idle-label="唸解說給我聽">唸解說給我聽</button></div></div>`;
  }
  function renderQuestion() {
    const q = session.qs[session.index];
    document.body.classList.toggle(
      "line-job-menu-open",
      q.interaction === "job-offer" && !session.answered && session.interactionStage === "job-menu",
    );
    document.title =
      (session.answered ? "作答解說" : "正在練習") + "｜金庫防爆特攻隊";
    if (getState().settings.fontLevel >= 2) {
      renderFocusExercise(session, {
        moneyMarkup: renderMoneyBar(
          session,
          session.branchFlow ? "focus-money" : "quiz-money",
        ),
        bankruptcyMarkup:
          session.money === 0 && !session.bankruptAcknowledged
            ? renderBankruptcyModal()
            : "",
      });
      const speech = jobStageSpeech() || (
        session.questionView === "choose" && !session.answered
          ? compactOptions[q.id].map((o, i) => i + 1 + "，" + o).join("。")
          : $(".reading-copy")?.textContent);
      if (getState().settings.voice && speech && speech !== lastFocusSpeech) {
        lastFocusSpeech = speech;
        say(speech);
      }
      return;
    }
    if (session.branchFlow) {
      const bankrupt =
        session.money === 0 && !session.bankruptAcknowledged
          ? renderBankruptcyModal()
          : "";
      $("#quizBody").innerHTML = `${renderBranchChat(session)}${session.answered ? renderBranchFeedback(q, session) : ""}${bankrupt}`;
      const chatLog = $(".line-chat-log");
      if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
      if (!session.answered) {
        say(
          q.title +
            "。" +
            q.text +
            "。你會怎麼做？" +
            q.options.map((o, i) => i + 1 + "，" + o).join("。"),
        );
      }
      return;
    }
    const bankrupt =
      session.money === 0 && !session.bankruptAcknowledged
        ? renderBankruptcyModal()
        : "";
    if (
      session.answered &&
      q.interaction === "job-offer" &&
      session.correct &&
      session.interactionStage === "job-blocked"
    ) {
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${renderLineChatQuestion(q, session)}${feedback(q, true, { includeBlockResult: false })}${bankrupt}`;
      return;
    }
    if (session.answered) {
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${feedback(q, session.correct)}${bankrupt}`;
      if (q.branchResponses?.[session.selectedAnswer]) {
        const outcome = document.createElement("section");
        outcome.className = "safe-action";
        const heading = document.createElement("h2");
        heading.textContent = "這一步會發生什麼？";
        const description = document.createElement("p");
        description.textContent = q.branchResponses[session.selectedAnswer];
        outcome.append(heading, description);
        $("#quizBody .safe-action")?.before(outcome);
      }
      if (session.branchFlow) {
        const nextButton = $("#quizBody [data-next]");
        if (nextButton)
          nextButton.innerHTML = session.nextId
            ? '下一步 <span aria-hidden="true">→</span>'
            : '看練習結果 <span aria-hidden="true">→</span>';
      }
      return;
    }
    $("#quizBody").innerHTML =
      `${renderMoneyBar(session, "quiz-money")}<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><div class="exercise-progress" aria-label="目前第 ${session.index + 1} 題，共 ${session.qs.length} 題"><i style="width:${((session.index + 1) / session.qs.length) * 100}%"></i></div>${renderLineChatQuestion(q, session)}${bankrupt}`;
    say(jobStageSpeech() || (
      q.title +
        "。" +
        q.text +
        "。你會怎麼做？" +
        q.options.map((o, i) => i + 1 + "，" + o).join("。")),
    );
  }
  function answer(i) {
    if (!session || session.answered || session.complete) return;
    const q = session.qs[session.index];
    if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return;
    if (q.interaction === "job-offer" && i === q.answer && session.interactionStage !== "job-blocked") return;
    session.answered = true;
    session.readerOffset = 0;
    session.readerHistory = [];
    session.selectedAnswer = i;
    session.nextId = session.branchFlow ? q.next[i] ?? null : null;
    session.correct = i === q.answer;
    session.sceneResult = q.sceneOutcomes?.[i] || "";
    let moneyLoss = 0;
    if (!session.correct) {
      const debit = applyWrongAnswerPenalty(session.money ?? STARTING_MONEY);
      session.money = debit.money;
      moneyLoss = debit.loss;
      if (debit.reachedZero) session.bankruptAcknowledged = false;
    }
    if (session.correct) session.score++;
    if (session.branchFlow)
      session.branchPath.push({
        nodeId: q.id,
        questionId: q.id,
        optionIndex: i,
        optionText: q.options[i],
        correct: session.correct,
      });
    recordResult({ questionId: q.id, correct: session.correct });
    saveSession(session);
    renderQuestion();
    if (moneyLoss) animateMoneyLoss(moneyLoss);
    document.title = "作答解說｜金庫防爆特攻隊";
    window.scrollTo(0, 0);
    const modalDismiss = $("[data-bankrupt-dismiss]");
    if (modalDismiss) modalDismiss.focus({ preventScroll: true });
    else $("#main").focus({ preventScroll: true });
    if (getState().settings.fontLevel < 2)
      say(
        (session.correct ? "答對了！" : "沒關係，我們一起看懂它。") +
          (moneyLoss ? `答錯扣了新台幣${moneyLoss}元，目前還有新台幣${session.money}元。` : "") +
          (q.branchResponses?.[i]
            ? "你選的做法會怎樣？" + q.branchResponses[i]
            : "") +
          q.explain,
      );
  }
  function next() {
    if (!session?.answered || session.complete) return;
    if (session.branchFlow) {
      const nextQuestion = session.nextId
        ? bank.find(
            (question) =>
              question.id === session.nextId &&
              question.branchScenario === session.branchScenario,
          )
        : null;
      if (nextQuestion) {
        session.qs.push(nextQuestion);
        session.index = session.qs.length - 1;
        session.answered = false;
        session.correct = undefined;
        session.selectedAnswer = null;
        session.nextId = null;
        session.questionView = "read";
        session.readerOffset = 0;
        session.readerHistory = [];
        saveSession(session);
        renderQuestion();
        window.scrollTo(0, 0);
        $("#main").focus({ preventScroll: true });
      } else {
        const finalStep = session.branchPath.at(-1);
        const finalQuestion = bank.find((question) => question.id === finalStep?.questionId);
        recordScenarioResult({
          scenarioId: session.branchScenario,
          path: session.branchPath,
          endingId: finalQuestion?.endingIds?.[finalStep?.optionIndex],
          score: session.score,
          maxScore: session.branchPath.length,
          completedAt: Date.now(),
        });
        session.complete = true;
        saveSession(session);
        refresh();
        window.scrollTo(0, 0);
        $("#main").focus({ preventScroll: true });
        say("你完成了，真棒！");
      }
      return;
    }
    if (session.index + 1 < session.qs.length) {
      session.index++;
      session.answered = false;
      session.interactionStage = "chat";
      session.sentMessage = "";
      session.questionView = "read";
      session.readerOffset = 0;
      session.readerHistory = [];
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $("#main").focus({ preventScroll: true });
    } else {
      session.complete = true;
      saveSession(session);
      refresh();
      window.scrollTo(0, 0);
      $("#main").focus({ preventScroll: true });
      say("你完成了，真棒！");
    }
  }
  function renderResults() {
    $("#quizBody").innerHTML = `${renderMoneyBar(session, "branch-result-money")}${completionCard(session.qs.length)}`;
  }
  function animateMoneyLoss(amount) {
    const wallet = $(".bankrupt-dialog") || $(".branch-money");
    if (!wallet) return;
    const animation = document.createElement("span");
    animation.className = "money-flight";
    animation.setAttribute("aria-hidden", "true");
    animation.textContent = `💸 −NT$${amount}`;
    wallet.append(animation);
    animation.addEventListener("animationend", () => animation.remove(), {
      once: true,
    });
    window.setTimeout(() => animation.remove(), 1400);
  }
  function dismissBankruptcy() {
    if (!session || session.money !== 0) return;
    session.bankruptAcknowledged = true;
    saveSession(session);
    $(`[data-bankrupt-modal]`)?.remove();
    $("#quizBody [data-next], #quizBody [data-reader-next]")?.focus({ preventScroll: true });
  }
  function sceneAction(action) {
    if (!session || session.answered || session.complete) return;
    const question = session.qs[session.index];
    if (!question || !["vote-link", "support-call", "job-offer"].includes(question.interaction))
      return;
    if (action === "open-fake-site") {
      session.interactionStage = "fake-site";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $("[data-scene-action='submit-phishing']")?.focus({ preventScroll: true });
    } else if (action === "prepare-safe-reply") {
      session.interactionStage = "compose";
      saveSession(session);
      renderQuestion();
      $("[data-scene-action='send-safe-reply']")?.focus({ preventScroll: true });
    } else if (action === "submit-phishing") answer(0);
    else if (action === "send-safe-reply") {
      session.sentMessage = "不了謝謝";
      answer(1);
    } else if (action === "start-screen-share" && question.interaction === "support-call") {
      session.interactionStage = "screen-share";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="stop-screen-share"]`)?.focus({ preventScroll: true });
    } else if (action === "start-hangup" && question.interaction === "support-call") {
      session.interactionStage = "hangup";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="confirm-hangup"]`)?.focus({ preventScroll: true });
    } else if (action === "stop-screen-share" && question.interaction === "support-call") {
      answer(0);
    } else if (action === "confirm-hangup" && question.interaction === "support-call") {
      answer(1);
    } else if (action === "join-job-chat" && question.interaction === "job-offer" && session.interactionStage === "chat") {
      session.interactionStage = "job-contact";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="open-job-payment"]`)?.focus({ preventScroll: true });
    } else if (action === "open-job-payment" && question.interaction === "job-offer" && session.interactionStage === "job-contact") {
      session.interactionStage = "job-payment";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="simulate-job-payment"]`)?.focus({ preventScroll: true });
    } else if (action === "simulate-job-payment" && question.interaction === "job-offer" && session.interactionStage === "job-payment") {
      session.interactionStage = "job-payment-warning";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="refuse-job-payment"]`)?.focus({ preventScroll: true });
    } else if (["refuse-job-payment", "cancel-job-payment"].includes(action) && question.interaction === "job-offer" && ["job-payment", "job-payment-warning"].includes(session.interactionStage)) {
      session.interactionStage = "job-block-ready";
      session.jobMenuNotice = "你已拒付並退出模擬付款頁；接著請在聊天室選單按「封鎖」。";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="open-job-menu"]`)?.focus({ preventScroll: true });
    } else if (action === "open-job-menu" && question.interaction === "job-offer" && ["job-block-ready", "job-menu"].includes(session.interactionStage)) {
      session.interactionStage = "job-menu";
      session.jobMenuNotice = "";
      saveSession(session);
      renderQuestion();
      $(".line-chat-device, .line-job-menu-stage")?.scrollIntoView({ block: "start" });
      $(`[data-scene-action="job-menu-mute"]`)?.focus({ preventScroll: true });
    } else if (action === "close-job-menu" && question.interaction === "job-offer" && session.interactionStage === "job-menu") {
      session.interactionStage = "job-block-ready";
      saveSession(session);
      renderQuestion();
      $(`[data-scene-action="open-job-menu"]`)?.focus({ preventScroll: true });
    } else if (["job-menu-mute", "job-menu-recommend", "job-menu-invite"].includes(action) && question.interaction === "job-offer" && session.interactionStage === "job-menu") {
      const actionName = {
        "job-menu-mute": "關閉提醒",
        "job-menu-recommend": "推薦",
        "job-menu-invite": "邀請",
      }[action];
      const debit = applyWrongAnswerPenalty(session.money ?? STARTING_MONEY);
      session.money = debit.money;
      if (debit.reachedZero) session.bankruptAcknowledged = false;
      session.interactionStage = "job-block-ready";
      session.jobMenuNotice = `已模擬${actionName}；尚未封鎖，請再次選擇「封鎖」。`;
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      if (debit.loss) animateMoneyLoss(debit.loss);
      $(`[data-scene-action="open-job-menu"]`)?.focus({ preventScroll: true });
    } else if (action === "confirm-job-block" && question.interaction === "job-offer" && session.interactionStage === "job-menu") {
      session.interactionStage = "job-blocked";
      session.sentMessage = "";
      answer(1);
    }
  }
  function closeQuiz() {
    stopSpeech();
    document.body.classList.remove("line-job-menu-open");
    session = null;
    saveSession(null);
    location.hash = "practice";
  }
  function render() {
    if (session?.complete) renderResults();
    else if (session) renderQuestion();
  }
  function read() {
    if (isSpeaking()) {
      stopSpeech();
      return;
    }
    const question = session?.qs[session.index];
    if (!question) return;
    const stageSpeech = jobStageSpeech();
    if (stageSpeech) {
      say(stageSpeech, true);
      return;
    }
    if (getState().settings.fontLevel >= 2) {
      const text = !session.answered && session.interactionStage === "hangup"
        ? "模擬來電仍在通話中。按下掛斷電話，結束這通可疑來電。這只是練習，不會撥打或接聽真實電話。"
        : !session.answered && session.interactionStage === "screen-share"
          ? "你被騙了！這是螢幕共享情境模擬，沒有分享手機畫面。不要讓假客服看到驗證碼或金融操作。"
          : !session.answered && session.interactionStage === "compose"
            ? "訊息框已填入：不了謝謝。按傳送後，還要用原本保存的電話確認阿明本人。"
            : !session.answered && session.interactionStage === "fake-site"
              ? "你被騙了！這是假網站模擬。不要輸入手機號碼或簡訊驗證碼。"
              : session.questionView === "choose" && !session.answered
          ? compactOptions[question.id]
              .map((o, i) => i + 1 + "，" + o)
              .join("。")
          : document.querySelector(".reading-copy")?.textContent;
      if (text) say(text, true);
      return;
    }
    if (session.answered)
      say(
        "安全的做法。" +
          question.options[question.answer] +
          "。" +
          (question.branchResponses?.[session.selectedAnswer]
            ? "你選的做法會怎樣？" +
              question.branchResponses[session.selectedAnswer] +
              "。"
            : "") +
          question.explain,
        true,
      );
    else if (session.interactionStage === "hangup")
      say("模擬來電仍在通話中。按下掛斷電話，結束這通可疑來電。這只是練習，不會撥打或接聽真實電話。", true);
    else if (session.interactionStage === "screen-share")
      say("你被騙了！這是螢幕共享情境模擬，沒有分享手機畫面。不要讓假客服看到驗證碼或金融操作。", true);
    else if (session.interactionStage === "compose")
      say("訊息框已填入：不了謝謝。按傳送後，還要用原本保存的電話確認阿明本人。", true);
    else if (session.interactionStage === "fake-site")
      say("你被騙了！這是假網站模擬。不要輸入手機號碼或簡訊驗證碼。", true);
    else
      say(
        jobStageSpeech() ||
          question.title +
            "。" +
            question.text +
            "。你會怎麼做？" +
            question.options
              .map((text, index) => index + 1 + "，" + text)
              .join("。"),
        true,
      );
  }
  function reader(action) {
    if (!session || session.complete) return;
    stopSpeech();
    if (action === "back") {
      session.questionView = "read";
      session.readerOffset = 0;
      session.readerHistory = [];
    } else if (action === "previous") {
      if (!session.readerHistory?.length) return;
      session.readerOffset = session.readerHistory.pop();
    } else if (session.readerFinished) {
      if (session.answered) {
        next();
        return;
      }
      session.questionView = "choose";
    } else {
      session.readerHistory ||= [];
      session.readerHistory.push(session.readerOffset || 0);
      session.readerOffset = session.readerEnd;
    }
    saveSession(session);
    renderQuestion();
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  }
  let lastViewport = `${window.innerWidth}:${window.innerHeight}`;
  function reflow(event) {
    const size = `${window.innerWidth}:${window.innerHeight}`;
    if (event?.type !== "vault:text-size-changed" && size === lastViewport)
      return;
    lastViewport = size;
    if (location.hash === "#exercise" && session && !session.complete)
      renderQuestion();
  }
  window.addEventListener("vault:text-size-changed", reflow);
  window.addEventListener("resize", reflow);
  window.visualViewport?.addEventListener("resize", reflow);
  return {
    reader,
    start,
    answer,
    sceneAction,
    next,
    dismissBankruptcy,
    close: closeQuiz,
    read,
    render,
    getSession: () => session,
  };
}
