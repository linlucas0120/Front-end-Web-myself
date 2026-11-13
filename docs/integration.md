# 組員模組串接

載入主網站後，同一頁的模組可透過 `window.VaultTraining` 存取題庫與回傳結果：

```js
const questions = window.VaultTraining.getQuestions();
window.VaultTraining.recordResult({ questionId: "l1", correct: false });
const attempts = window.VaultTraining.getProgress();
window.VaultTraining.startPractice("line"); // phone / shop / random / review / borrow-branch
const completedScenarios = window.VaultTraining.getScenarioResults();
```

也可用事件回傳；與 `recordResult` 擇一，避免重複計入：

```js
window.dispatchEvent(new CustomEvent("vault:module-result", {
  detail: { questionId: "p1", correct: true },
}));

window.addEventListener("vault:result-saved", (event) => {
  console.log(event.detail);
});
```

`questionId` 必須存在於題庫，`correct` 必須是布林值。讀取介面回傳副本，修改副本不會更動儲存資料。跨網域 iframe 尚未提供訊息橋接。

題庫位於 `dist/js/data/questions.js`，一般題包含唯一的 `id`、`type`、`title`、`sender`、`text`、`options`、`answer`（從 0 起算）、`trap`、`explain`。LINE 原稿保留九題，但目前一般與隨機練習只開放 `activeLineQuestionIds` 指定的第 1、5、9 題；調整開放題目時請同步更新該清單與題數測試。

互動分支情境由 `branchScenarios` 宣告 `mode` 和 `startId`；情境節點以 `branchScenario` 分組，根節點另標 `branchStart: true`。每個節點的 `branchResponses`、`next` 與 `endingIds` 陣列都依選項索引排列：前者說明選擇後的情況；`next` 填下一個節點 ID 或 `null`；路徑以 `null` 結束時，`endingIds` 必須給該選項一個結局 ID。分支節點不會混入一般隨機抽題；透過 `startPractice("borrow-branch")` 啟動。尚未完成的節點路徑與選項保存在目前分頁的 `sessionStorage`，重新整理後可以接續。

分支完成後，`window.VaultTraining.getScenarioResults()` 回傳已完成紀錄的副本；每完成一次，也會先寫入本機再派發 `vault:scenario-result-saved`，事件的 `detail` 即完整結果。若要即時接收，請在呼叫 `startPractice("borrow-branch")` 前註冊監聽器：

```js
window.addEventListener("vault:scenario-result-saved", (event) => {
  const { scenarioId, path, endingId, score, maxScore, completedAt } = event.detail;
  // path 每一步含 nodeId、questionId、optionIndex、optionText、correct
});
```

完整結果保存於本機 `localStorage` 的 `vault-scenario-results-v1`，含 `scenarioId`、逐步節點／題目與所選選項、`endingId`、得分（`score`／`maxScore`）及完成時間。這項整段紀錄不會送到伺服器。原有 `recordResult`、`vault:result-saved` 和 `getProgress()` 仍只處理逐題作答，行為不變。

新增任何題目或分支節點後，請同步新增 `dist/js/data/compact-options.js` 的短版選項並執行 `npm run check`、`npm test`。分支節點作答仍逐題保存並獲得安心星；完成時另保存整段情境結果。「完成全部情境」統計只計目前開放的三個 LINE 情境。
