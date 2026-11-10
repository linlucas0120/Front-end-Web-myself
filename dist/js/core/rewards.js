// Each saved, valid attempt earns one star, including repeat practice and mistakes.
export function getRewards(attempts, questions) {
  const validIds = new Set(questions.map((q) => q.id));
  const regularQuestions = questions.filter((q) => !q.branchScenario);
  const validAttempts = attempts.filter(
    (a) => a && validIds.has(a.id) && typeof a.correct === "boolean",
  );
  const completed = new Set(
    validAttempts
      .filter((a) => regularQuestions.some((q) => q.id === a.id))
      .map((a) => a.id),
  );
  const categories = new Set(
    regularQuestions.filter((q) => completed.has(q.id)).map((q) => q.type),
  );
  const categoryTotal = new Set(regularQuestions.map((q) => q.type)).size;
  const total = regularQuestions.length;
  const completedCount = completed.size;
  const stars = validAttempts.length;
  const badges = [
    {
      id: "first",
      title: "踏出第一步",
      description: "完成第一個情境",
      earned: completedCount >= 1,
      icon: "step",
    },
    {
      id: "three",
      title: "認真練習",
      description: "完成 3 個不同情境",
      earned: completedCount >= 3,
      icon: "star",
    },
    {
      id: "types",
      title: "生活守護者",
      description: "三種情境都練過",
      earned: categoryTotal > 0 && categories.size === categoryTotal,
      icon: "shield",
    },
    {
      id: "all",
      title: "安心小達人",
      description: "完成全部情境",
      earned: total > 0 && completedCount === total,
      icon: "medal",
    },
  ];
  return {
    stars,
    completed: completedCount,
    total,
    badges,
    earned: badges.filter((b) => b.earned).length,
  };
}

// The companion grows with participation stars; collection continues after the crown.
export function getCompanion(stars, total) {
  const complete = total > 0 && stars >= total;
  const grown = stars >= 3;
  const next =
    stars < 1 ? Math.min(1, total) : stars < 3 ? Math.min(3, total) : total;
  return {
    stage: complete ? "guardian" : grown ? "helper" : "friend",
    title: complete ? "安心守護隊長" : grown ? "勇敢防詐夥伴" : "小小安心夥伴",
    message: complete
      ? "持續練習，你是安心守護隊長！"
      : grown
        ? "越練越安心，我陪你一起！"
        : "你好呀！我們一起學防詐。",
    remaining: Math.max(0, next - stars),
    goal: complete
      ? "再練一題，再多一顆星！"
      : stars < 1
        ? "拿到第一顆星"
        : stars < 3
          ? "讓夥伴披上披風"
          : "讓夥伴戴上皇冠",
  };
}
