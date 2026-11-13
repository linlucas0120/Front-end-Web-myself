import { types } from "../data/questions.js?v=job-9-4";
import { getState, getMistakes } from "../core/store.js?v=job-9-4";
import { moduleArt } from "./illustrations.js?v=job-9-4";
export function moduleCards(filter = "all") {
  return `<div class="cards">${Object.entries(types)
    .filter(([k]) => filter === "all" || k === filter)
    .map(
      ([k, v]) =>
        `<article class="module ${k}">${moduleArt(k)}<div class="module-body"><div class="module-top"><span class="module-number">練習 0${Object.keys(types).indexOf(k) + 1}</span><span>3 個情境</span></div><h3>${v.name}</h3><p>${v.desc.replace("\n", "<br>")}</p><div class="module-bottom"><button data-start="${k}">開始${k === "line" ? "訊息" : k === "phone" ? "電話" : "網購"}練習 <span>→</span></button></div></div></article>`,
    )
    .join("")}</div>`;
}
export function stats() {
  const a = getState().attempts;
  return `<div class="stats"><div class="stat"><strong>${a.length}<small>題</small></strong><span>已完成練習</span></div><div class="stat"><strong>${a.length ? Math.round((a.filter((x) => x.correct).length / a.length) * 100) : 0}<small>%</small></strong><span>作答正確率</span></div><div class="stat"><strong>${getMistakes().length}<small>題</small></strong><span>等待複習</span></div></div>`;
}
