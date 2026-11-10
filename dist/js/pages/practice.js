import { tile } from "../components/tiles.js?v=branch-2";
export function practice() {
  return `<section class="ios-screen practice-screen"><div class="ios-title"><h1>選一種練習</h1><p>一般練習 3 題，也可以挑戰分支情境。</p></div><div class="ios-grid">${tile({ title: "訊息防詐", description: "看懂可疑訊息", icon: "line", color: "green", start: "line" })}${tile({ title: "電話防詐", description: "聽出來電話術", icon: "phone", color: "blue", start: "phone" })}${tile({ title: "網購防詐", description: "找出購物陷阱", icon: "shop", color: "orange", start: "shop" })}${tile({ title: "熟人借錢分支", description: "新帳號借錢，選擇會改變後續", icon: "line", color: "green", start: "borrow-branch" })}${tile({ title: "隨機練習", description: "直接開始 3 題", icon: "play", color: "purple", start: "random" })}</div><p class="ios-reassurance">全部都是練習，不需要填資料或付款。</p></section>`;
}
