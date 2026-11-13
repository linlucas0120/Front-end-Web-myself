import { bank, types } from "../data/questions.js?v=job-9-4";
import { getState } from "../core/store.js?v=job-9-4";
import { stats } from "./learning.js?v=job-9-4";
export function learningHistory({ before = "" } = {}) {
  const data = getState();
  return `<details class="learning-details"><summary>看紀錄與複習</summary><div class="details-content">${before}<section class="progress-panel"><div class="panel-head">我的練習紀錄</div>${stats()}</section><section class="progress-panel"><h2 class="details-title">各情境正確率</h2>${Object.entries(
    types,
  )
    .map(([k, v]) => {
      const a = data.attempts.filter((a) => a.type === k),
        rate = a.length
          ? Math.round((a.filter((a) => a.correct).length / a.length) * 100)
          : 0;
      return `<div class="bar-row"><span>${v.name.replace("練習", "")}</span><div class="bar" role="meter" aria-label="${v.name}正確率" aria-valuenow="${rate}" aria-valuemin="0" aria-valuemax="100"><i style="width:${rate}%"></i></div><span>${a.length ? rate + "%" : "未練習"}</span></div>`;
    })
    .join(
      "",
    )}</section><div class="section-head"><h2>最近的練習</h2><button class="secondary" id="exportBtn">下載紀錄</button></div>${
    data.attempts.length
      ? data.attempts
          .slice(-8)
          .reverse()
          .map(
            (a) =>
              `<article class="record"><span class="record-meta">${new Date(a.time).toLocaleString("zh-TW")} · ${a.correct ? "答對了 ✓" : "需要再練習"}</span><h3>${bank.find((q) => q.id === a.id)?.title}</h3></article>`,
          )
          .join("")
      : '<p class="muted">還沒有紀錄，完成練習後就會出現在這裡。</p>'
  }<p class="muted">紀錄只保存在這個瀏覽器，清除瀏覽資料後就會消失。</p></div></details>`;
}
