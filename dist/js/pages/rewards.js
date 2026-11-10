import { bank } from "../data/questions.js?v=branch-2";
import { getState, getMistakes } from "../core/store.js?v=branch-2";
import {
  getRewards,
  getCompanion,
} from "../core/rewards.js?v=branch-2";
import { rewardBadges } from "../components/badges.js?v=branch-2";
import { companion } from "../components/companion.js?v=branch-2";
export function rewardsPage() {
  const reward = getRewards(getState().attempts, bank);
  const friend = getCompanion(reward.stars, reward.total);
  const due = getMistakes().length;
  return `<section class="rewards-page"><div class="ios-title"><h1>我的獎勵</h1></div>
    <section class="companion-card simple-reward-card" aria-label="安心星獎勵">${companion(friend.stage)}<p class="companion-count"><strong>${reward.stars}</strong><span>顆星</span></p><button class="primary" data-start="${due ? "review" : "random"}">繼續練習</button></section>
    <div class="section-head"><h2>我的勳章</h2><span class="reward-total">已獲得 ${reward.earned} 枚</span></div>${rewardBadges(reward.badges)}<details class="reward-rules"><summary>獎勵怎麼拿？</summary><ul><li><strong>安心星</strong><span>每完成 1 題，加 1 顆星。答錯、重複練習都算。</span></li>${reward.badges.map((b) => `<li><strong>${b.title}</strong><span>${b.description}</span></li>`).join("")}</ul></details></section>`;
}
