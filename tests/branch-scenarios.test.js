import test from "node:test";
import assert from "node:assert/strict";
import {
  activeLineQuestionIds,
  bank,
  branchScenarios,
} from "../dist/js/data/questions.js";
import { compactOptions } from "../dist/js/data/compact-options.js";
import { selectQuestions } from "../dist/js/core/engine.js";
import { validateDraft } from "../dist/js/core/session.js";
import { getCompanion, getRewards } from "../dist/js/core/rewards.js";
import {
  getScenarioResults,
  getState,
  loadState,
  recordResult,
  recordScenarioResult,
} from "../dist/js/core/store.js";
import { practice } from "../dist/js/pages/practice.js";
import { initIntegration } from "../dist/js/features/integration.js";

const branchNodes = bank.filter((question) => question.branchScenario);
const byId = new Map(branchNodes.map((question) => [question.id, question]));

function safeVerifiedPath() {
  return [
    {
      nodeId: "l4",
      questionId: "l4",
      optionIndex: 2,
      optionText: byId.get("l4").options[2],
      correct: true,
    },
    {
      nodeId: "l6",
      questionId: "l6",
      optionIndex: 0,
      optionText: byId.get("l6").options[0],
      correct: true,
    },
    {
      nodeId: "l7",
      questionId: "l7",
      optionIndex: 0,
      optionText: byId.get("l7").options[0],
      correct: true,
    },
  ];
}

test("branch nodes align options, outcomes, compact labels, links, and ending IDs", () => {
  assert.equal(branchScenarios.length, 1);
  for (const question of branchNodes) {
    assert.equal(question.options.length, 3, `${question.id} should have 3 choices`);
    assert.equal(question.branchResponses.length, question.options.length);
    assert.equal(question.next.length, question.options.length);
    assert.equal(question.endingIds.length, question.options.length);
    assert.equal(compactOptions[question.id].length, question.options.length);
    for (let i = 0; i < question.next.length; i++) {
      const nextId = question.next[i];
      if (nextId !== null) {
        assert.ok(byId.has(nextId), `${question.id} -> ${nextId}`);
        assert.equal(question.endingIds[i], null);
      } else assert.ok(question.endingIds[i], `${question.id} option ${i} needs an ending ID`);
    }
  }
});

test("every node is reachable from the start and every path terminates without a cycle", () => {
  const scenario = branchScenarios[0];
  const root = byId.get(scenario.startId);
  assert.ok(root?.branchStart);
  const reached = new Set();
  function visit(id, path = []) {
    assert.ok(!path.includes(id), `cycle found at ${[...path, id].join(" -> ")}`);
    const question = byId.get(id);
    assert.ok(question, `missing node ${id}`);
    reached.add(id);
    const children = question.next.filter(Boolean);
    if (!children.length) return 1;
    return 1 + Math.max(...children.map((child) => visit(child, [...path, id])));
  }
  const longestPath = visit(scenario.startId);
  assert.equal(reached.size, branchNodes.length);
  assert.ok(longestPath <= 8);
});

test("branch mode starts at the root while LINE and random practice use only questions 1, 5, and 9", () => {
  const scenario = branchScenarios[0];
  const branchStart = selectQuestions(bank, [], scenario.mode);
  assert.deepEqual(branchStart.map((question) => question.id), [scenario.startId]);
  const lineQuestions = selectQuestions(bank, [], "line");
  assert.equal(lineQuestions.length, 3);
  assert.deepEqual(lineQuestions.map((question) => question.id).sort(), [...activeLineQuestionIds].sort());
  assert.ok(lineQuestions.every((question) => question.type === "line" && !question.branchScenario));
  const randomQuestions = selectQuestions(bank, [], "random");
  assert.equal(randomQuestions.length, 3);
  assert.ok(randomQuestions.every((question) => !question.branchScenario));
});

test("the replacement quiz contains the nine supplied LINE scam scenarios", () => {
  const regular = bank.filter((question) => !question.branchScenario);
  assert.equal(regular.length, 9);
  assert.deepEqual(regular.map((question) => question.id).sort(), Array.from({ length: 9 }, (_, i) => `line-scam-${i + 1}`).sort());
  assert.ok(regular.every((question) => question.type === "line" && question.options.length === 3));
  assert.deepEqual(new Set(regular.map((question) => question.answer)), new Set([1]));
  assert.match(regular[0].text, /寵物攝影比賽/);
  assert.match(regular[8].text, /1,000 元保證金/);
});

test("question 5 retains the safe hang-up answer and explicit scam warning", () => {
  const question = bank.find((item) => item.id === "line-scam-5");
  assert.equal(question.interaction, "support-call");
  assert.equal(question.answer, 1);
  assert.match(question.options[1], /立即掛斷電話/);
  assert.match(question.explain, /絕不會主動以語音電話聯繫用戶/);
});

test("all mode includes the three active LINE questions without branch-only nodes", () => {
  const selected = selectQuestions(bank, [], "all");
  assert.equal(selected.length, 3);
  assert.deepEqual(selected.map((question) => question.id).sort(), [...activeLineQuestionIds].sort());
  assert.deepEqual(new Set(selected.map((question) => question.type)), new Set(["line"]));
  assert.ok(selected.every((question) => !question.branchScenario));
});

test("the practice page exposes the branch scenario entry", () => {
  assert.match(practice(), /data-start="borrow-branch"/);
  assert.match(practice(), /熟人借錢分支/);
  assert.match(practice(), /data-start="line"/);
  assert.match(practice(), /第 1、5、9 題/);
  assert.match(practice(), /3 題完整練習/);
  assert.match(practice(), /data-start="random"/);
  assert.match(practice(), /答錯扣 NT\$100/);
});

test("VaultTraining exposes scenario history and accepts the branch start mode", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const starts = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { addEventListener() {} },
  });
  try {
    initIntegration({ start: (mode) => starts.push(mode) });
    assert.equal(typeof window.VaultTraining.getScenarioResults, "function");
    window.VaultTraining.startPractice("borrow-branch");
    window.VaultTraining.startPractice("all");
    window.VaultTraining.startPractice("phone");
    window.VaultTraining.startPractice("unrecognized-mode");
    assert.deepEqual(starts, ["borrow-branch", "all", "phone", "random"]);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else delete globalThis.window;
  }
});

test("branch attempts earn stars without changing the three-question completion total", () => {
  const rewards = getRewards([{ id: "l4", correct: false }], bank);
  assert.equal(rewards.stars, 1);
  assert.equal(rewards.completed, 0);
  assert.equal(rewards.total, 3);
});

test("the companion still earns the crown at nine stars after the active quiz is shortened", () => {
  assert.equal(getCompanion(3, 3).stage, "helper");
  assert.equal(getCompanion(3, 3).remaining, 6);
  assert.equal(getCompanion(9, 3).stage, "guardian");
});

test("an answered branch node restores its selected answer and next target", () => {
  const firstStep = {
    nodeId: "l4",
    questionId: "l4",
    optionIndex: 0,
    optionText: byId.get("l4").options[0],
    correct: false,
  };
  const draft = validateDraft(
    {
      ids: ["l4"],
      index: 0,
      score: 0,
      answered: true,
      complete: false,
      correct: false,
      selectedAnswer: 0,
      branchPath: [firstStep],
      branchFlow: true,
      nextId: "l8",
    },
    bank,
  );
  assert.equal(draft.branchFlow, true);
  assert.equal(draft.branchScenario, "familiar-new-account");
  assert.equal(draft.selectedAnswer, 0);
  assert.equal(draft.nextId, "l8");
  assert.deepEqual(draft.branchPath, [firstStep]);

  const invalid = validateDraft(
    {
      ids: ["l4"],
      index: 0,
      score: 0,
      answered: true,
      complete: false,
      correct: false,
      selectedAnswer: 0,
      branchPath: [firstStep],
      branchFlow: true,
      nextId: "p1",
    },
    bank,
  );
  assert.equal(invalid, null);
});

test("a completed scenario is stored locally, retrieved as a copy, and emitted as a full-result event", () => {
  const descriptors = Object.fromEntries(
    ["localStorage", "window", "CustomEvent"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const data = new Map();
  const events = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { dispatchEvent: (event) => (events.push(event), true) },
  });
  if (typeof globalThis.CustomEvent !== "function")
    Object.defineProperty(globalThis, "CustomEvent", {
      configurable: true,
      writable: true,
      value: class CustomEvent {
        constructor(type, options = {}) {
          this.type = type;
          this.detail = options.detail;
        }
      },
    });

  try {
    loadState();
    const result = recordScenarioResult({
      scenarioId: "familiar-new-account",
      path: safeVerifiedPath(),
      endingId: "verified-stopped-reported",
      score: 3,
      maxScore: 3,
      completedAt: 1234,
    });
    assert.equal(result.scenarioId, "familiar-new-account");
    assert.equal(result.path.length, 3);
    assert.equal(result.path[0].optionText, byId.get("l4").options[2]);
    assert.equal(result.endingId, "verified-stopped-reported");
    assert.equal(result.score, 3);
    assert.equal(result.maxScore, 3);
    assert.equal(events.at(-1).type, "vault:scenario-result-saved");
    assert.deepEqual(events.at(-1).detail, result);
    assert.ok(data.has("vault-scenario-results-v1"));

    loadState();
    assert.deepEqual(getScenarioResults(), [result]);
    const returnedCopy = getScenarioResults();
    returnedCopy[0].path[0].optionText = "被修改的副本";
    assert.equal(getScenarioResults()[0].path[0].optionText, byId.get("l4").options[2]);

    recordResult({ questionId: "line-scam-1", correct: false });
    assert.equal(getState().attempts.length, 1);
    assert.equal(JSON.parse(data.get("vault-training-v1")).attempts.length, 1);
    assert.equal(getScenarioResults().length, 1);
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test("inconsistent scenario paths and endings are rejected", () => {
  assert.throws(
    () =>
      recordScenarioResult({
        scenarioId: "familiar-new-account",
        path: safeVerifiedPath(),
        endingId: "invented-ending",
        score: 3,
        maxScore: 3,
      }),
    /不符合題庫設定/,
  );
});
