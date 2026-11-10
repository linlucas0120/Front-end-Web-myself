import { completionCard } from "../components/completion.js?v=branch-2";
import { renderFocusExercise } from "./focus-reader.js?v=branch-2";
import { compactOptions } from "../data/compact-options.js?v=branch-2";
import { $ } from "../core/dom.js?v=branch-2";
import { bank, types } from "../data/questions.js?v=branch-2";
import {
  getState,
  recordResult,
  recordScenarioResult,
} from "../core/store.js?v=branch-2";
import { selectQuestions } from "../core/engine.js?v=branch-2";
import { restoreSession, saveSession } from "../core/session.js?v=branch-2";
import { say, stopSpeech, isSpeaking } from "./accessibility.js?v=branch-2";
export function createExerciseController({ refresh }) {
  let session = restoreSession(bank);
  let lastFocusSpeech = "";
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
    };
    saveSession(session);
    if (location.hash === "#exercise") refresh();
    else location.hash = "exercise";
  }
  function feedback(q, correct) {
    return `<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><div class="quiz-content answer-page"><span class="answer-label">${correct ? "✓ 答對了" : "我們一起再看一次"}</span><h1>${correct ? "做得好，記住這個方法。" : "下次可以這樣做。"}</h1><section class="safe-action"><h2>安全的做法</h2><p>${q.options[q.answer]}</p></section><p class="answer-explanation">${q.explain}</p><details class="trap-details"><summary>為什麼要小心？</summary><p>${q.trap}</p></details><div class="answer-actions"><button class="primary" data-next>${session.index + 1 === session.qs.length ? "看練習結果" : "下一題"} <span aria-hidden="true">→</span></button><button class="secondary" data-read data-idle-label="唸解說給我聽">唸解說給我聽</button></div></div>`;
  }
  function renderQuestion() {
    const q = session.qs[session.index];
    document.title =
      (session.answered ? "作答解說" : "正在練習") + "｜金庫防爆特攻隊";
    if (getState().settings.fontLevel >= 2) {
      renderFocusExercise(session);
      const speech =
        session.questionView === "choose" && !session.answered
          ? compactOptions[q.id].map((o, i) => i + 1 + "，" + o).join("。")
          : $(".reading-copy")?.textContent;
      if (getState().settings.voice && speech && speech !== lastFocusSpeech) {
        lastFocusSpeech = speech;
        say(speech);
      }
      return;
    }
    if (session.answered) {
      $("#quizBody").innerHTML = feedback(q, session.correct);
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
    if (session.branchFlow) {
      $("#quizBody").innerHTML =
        `<div class="quiz-top"><span>${types[q.type].name}</span><span>分支情境 · 第 ${session.index + 1} 步</span></div><div class="quiz-content question-layout"><h1>${q.title}</h1><div class="scenario ${q.type}"><div class="scenario-label">${q.sender}</div><div class="bubble">${q.text}</div></div><button class="secondary read-question" data-read data-idle-label="唸題目和答案給我聽">唸題目和答案給我聽</button><h2 class="answer-prompt">你會怎麼做？</h2><p class="answer-instruction">慢慢想，選好後點一下答案就可以。</p><div class="options">${q.options.map((option, index) => `<button class="option" data-answer="${index}"><span class="option-number" aria-hidden="true">${index + 1}</span><span>${option}</span></button>`).join("")}</div></div>`;
      say(
        q.title +
          "。" +
          q.text +
          "。你會怎麼做？" +
          q.options.map((o, i) => i + 1 + "，" + o).join("。"),
      );
      return;
    }
    $("#quizBody").innerHTML =
      `<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><div class="exercise-progress" aria-label="目前第 ${session.index + 1} 題，共 ${session.qs.length} 題"><i style="width:${((session.index + 1) / session.qs.length) * 100}%"></i></div><div class="quiz-content question-layout"><h1>${q.title}</h1><div class="scenario ${q.type}"><div class="scenario-label">${q.sender}</div><div class="bubble">${q.text}</div></div><button class="secondary read-question" data-read data-idle-label="唸題目和答案給我聽">唸題目和答案給我聽</button><h2 class="answer-prompt">你會怎麼做？</h2><p class="answer-instruction">慢慢想，選好後點一下答案就可以。</p><div class="options">${q.options.map((option, index) => `<button class="option" data-answer="${index}"><span class="option-number" aria-hidden="true">${index + 1}</span><span>${option}</span></button>`).join("")}</div></div>`;
    say(
      q.title +
        "。" +
        q.text +
        "。你會怎麼做？" +
        q.options.map((o, i) => i + 1 + "，" + o).join("。"),
    );
  }
  function answer(i) {
    if (!session || session.answered || session.complete) return;
    const q = session.qs[session.index];
    if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return;
    session.answered = true;
    session.readerOffset = 0;
    session.readerHistory = [];
    session.selectedAnswer = i;
    session.nextId = session.branchFlow ? q.next[i] ?? null : null;
    session.correct = i === q.answer;
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
    document.title = "作答解說｜金庫防爆特攻隊";
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
    if (getState().settings.fontLevel < 2)
      say(
        (session.correct ? "答對了！" : "沒關係，我們一起看懂它。") +
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
    $("#quizBody").innerHTML = completionCard(session.qs.length);
  }
  function closeQuiz() {
    stopSpeech();
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
    if (getState().settings.fontLevel >= 2) {
      const text =
        session.questionView === "choose" && !session.answered
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
    else
      say(
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
    next,
    close: closeQuiz,
    read,
    render,
    getSession: () => session,
  };
}
