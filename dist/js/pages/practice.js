import { tile } from "../components/tiles.js?v=job-9-4";

export function practice() {
  return `<section class="ios-screen practice-screen"><div class="ios-title"><h1>選一種練習</h1><p>答對累積分數，答錯扣 NT$100；每場從 NT$400 開始。</p></div><div class="ios-grid">${tile({ title: "LINE 詐騙情境測驗", description: "只練第 1、5、9 題 · 3 題完整練習", icon: "line", color: "green", start: "line" })}${tile({ title: "隨機練習", description: "從第 1、5、9 題隨機挑戰 3 題", icon: "play", color: "purple", start: "random" })}${tile({ title: "熟人借錢分支", description: "新帳號借錢，選擇會改變後續", icon: "line", color: "green", start: "borrow-branch" })}</div><p class="ios-reassurance">全部都是練習，不需要填資料或付款。</p></section>`;
}
