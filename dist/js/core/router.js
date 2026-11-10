import { $ } from "./dom.js?v=branch-2";
import { home } from "../pages/home.js?v=branch-2";
import { practice } from "../pages/practice.js?v=branch-2";
import { mistakePage } from "../pages/mistakes.js?v=branch-2";
import { rewardsPage } from "../pages/rewards.js?v=branch-2";
import { guide } from "../pages/guide.js?v=branch-2";
import { stopSpeech } from "../features/accessibility.js?v=branch-2";
export function createRouter(exercise) {
  function render() {
    const session = exercise.getSession();
    let key = location.hash.slice(1) || "home";
    if (key === "review") {
      history.replaceState(null, "", "#rewards");
      key = "rewards";
    }
    if (key === "exercise" && !session) {
      history.replaceState(null, "", "#practice");
      key = "practice";
    }
    document.body.classList.toggle("is-exercising", key === "exercise");
    document.body.classList.toggle("is-home", key === "home");
    $("#backBar").hidden = key === "home";
    const pages = {
      home,
      practice,
      mistakes: mistakePage,
      rewards: rewardsPage,
      guide,
    };
    if (key === "exercise") {
      $("#main").innerHTML =
        `<section class="exercise-page"><div class="exercise-shell" id="quizBody"></div></section>`;
      exercise.render();
    } else {
      $("#main").innerHTML = (pages[key] || home)();
    }
    document.querySelectorAll("nav a").forEach((a) => {
      const active =
        a.hash ===
        "#" +
          (key === "exercise"
            ? "practice"
            : key === "mistakes"
              ? "rewards"
              : key);
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.title =
      ({
        home: "安心學防詐",
        practice: "情境練習",
        exercise: session?.complete ? "練習成果" : "正在練習",
        mistakes: "錯題筆記",
        rewards: "我的獎勵",
        guide: "使用說明",
      }[key] || "安心學防詐") + "｜金庫防爆特攻隊";
  }
  function init() {
    window.addEventListener("hashchange", () => {
      stopSpeech();
      render();
      window.scrollTo(0, 0);
      $("#main").focus({ preventScroll: true });
    });
    window.addEventListener("vault:result-saved", () => {
      if (location.hash !== "#exercise") render();
    });
    render();
  }
  return { render, init };
}
