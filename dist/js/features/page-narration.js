// Short spoken directions avoid reading decorative icons or closed details.
export function pageNarration(hash, main) {
  switch (hash.replace(/^#/, "")) {
    case "practice":
      return "LINE 詐騙情境測驗只練第 1、5、9 題，共三題；也可按隨機練習，挑戰這三題。熟人借錢分支會依選擇進入不同情境。";
    case "rewards":
    case "review":
      return `我的獎勵。${main.querySelector(".companion-count")?.innerText || ""}。按繼續練習，就可以再做三題。`;
    case "guide":
      return "先按開始練習。慢慢看，選一個答案。看完解說，再按下一題。答錯也沒關係。";
    case "mistakes":
      return main.innerText;
    default:
      return "這裡可以練習辨認詐騙，保護自己的錢。請按最上方的開始練習，做三題。也可以選練習主題、看我的獎勵或操作說明。";
  }
}
