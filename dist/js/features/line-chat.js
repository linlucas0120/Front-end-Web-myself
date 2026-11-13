export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function getLineContact(sender = "LINE 聯絡人") {
  const [name, ...details] = String(sender)
    .split(/\s*[·｜]\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const contactName = name || "LINE 聯絡人";
  const avatar = Array.from(contactName.replace(/^[「『“'"]+/u, "").trim())[0] || "友";
  return {
    name: contactName,
    detail: details.join(" · ") || "情境對話模擬",
    avatar,
  };
}

function getScenarioSegments(question) {
  const segments = Array.isArray(question.segments) ? question.segments : [];
  const validSegments =
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment && typeof segment.text === "string" && typeof segment.label === "string",
    ) &&
    segments.map((segment) => segment.text).join("") === String(question.text ?? "");

  return validSegments
    ? segments
    : [{ label: "收到的訊息", text: String(question.text ?? "") }];
}

function renderSceneCard(question) {
  if (question.interaction === "support-call")
    return `<section class="line-chat-scene-card line-chat-call-scene" aria-label="模擬 LINE 官方客服語音來電"><span class="line-chat-scene-icon" aria-hidden="true">☎</span><div><strong>LINE 語音來電 · 模擬中</strong><p>自稱「LINE 官方客服」的人正在要求你開啟螢幕共享。</p></div></section>`;
  if (question.interaction === "job-offer")
    return `<section class="line-chat-scene-card line-chat-job-scene" aria-label="模擬高薪居家打工廣告"><span class="line-chat-job-icon" aria-hidden="true">職</span><div><strong>居家打字／點讚員</strong><p><b>時薪 NT$500</b> · 上工前要繳 NT$1,000 保證金，或交出存摺與提款卡。</p></div></section><div class="line-chat-link-preview line-job-link-preview"><span aria-hidden="true">↗</span><div><strong>居家工作報到付款</strong><small>job-onboard-pay.example · 本機模擬連結</small></div><button type="button" data-scene-action="open-job-payment" aria-label="開啟模擬報到付款連結">開啟連結</button></div><p class="line-chat-sim-note">模擬連結只會開啟本機教學畫面，不會連到銀行或外部網站。</p>`;
  return "";
}

function renderFakeSite() {
  return `<section class="line-chat-fake-site" aria-labelledby="fake-site-title"><div class="line-chat-fake-address"><span aria-hidden="true">🔒</span><span>pet-vote-gift.example</span><small>模擬網站</small></div><div class="line-chat-fake-content"><span class="line-chat-fake-label">本機模擬，不會連到網路</span><h2 id="fake-site-title">你被騙了！！</h2><p>這個仿冒投票網站會以「幫好友投票」為由，要求你輸入手機號碼和簡訊驗證碼，藉此盜取 LINE 帳號。</p><strong>不要輸入驗證碼，也不要在這裡填任何資料。</strong><button class="primary" type="button" data-scene-action="submit-phishing">我知道了，查看解析</button></div></section>`;
}

function renderJobMenuToggle(stage) {
  const isOpen = stage === "job-menu";
  return `<button class="line-chat-menu-toggle" type="button" data-scene-action="${isOpen ? "close-job-menu" : "open-job-menu"}" aria-label="${isOpen ? "關閉" : "開啟"}聊天室選單" aria-expanded="${isOpen}"${isOpen ? ' aria-controls="job-chat-menu"' : ""}><span aria-hidden="true">${isOpen ? "×" : "☰"}</span><small>選單</small></button>`;
}

export function renderJobBlockResult() {
  return `<section class="line-job-block-result" role="status" aria-label="模擬封鎖完成"><span class="line-job-block-check" aria-hidden="true">✓</span><div><span class="line-job-block-kicker">聊天室選單 → 封鎖</span><h2>已模擬封鎖</h2><p>網路兼職廣告</p><small>只完成本機教學練習，沒有操作真實 LINE，也沒有傳送訊息。</small></div></section>`;
}

function renderJobPaymentCheckout() {
  return `<section class="line-chat-job-stage line-job-checkout" aria-label="仿冒電子支付付款頁，本機安全模擬"><div class="line-job-pay-header"><span aria-hidden="true">‹</span><strong>報到付款</strong><small>安全模擬</small></div><div class="line-job-pay-content"><span class="line-chat-fake-label">仿電子支付介面</span><h2>居家工作報到</h2><p>對方要求正式上工前先繳保證金。這個畫面只供辨識詐騙，不會發起交易。</p><div class="line-job-merchant"><span class="line-job-pay-icon" aria-hidden="true">付</span><span><strong>居家工作報到中心</strong><small>新進人員保證金</small></span></div><div class="line-job-total"><span>本次付款金額</span><strong>NT$1,000</strong></div><div class="line-job-pay-safety">不需要輸入帳號、卡號、密碼或驗證碼</div><button class="line-chat-payment-button" type="button" data-scene-action="simulate-job-payment">模擬付款 NT$1,000</button><button class="secondary line-chat-job-back" type="button" data-scene-action="refuse-job-payment">拒付並退出，回聊天室</button><small class="line-job-local-note">本機教學模擬 · 不連外、不收款、不收集資料</small></div></section>`;
}

function renderJobPaymentWarning() {
  return `<section class="line-chat-job-stage line-job-payment-warning" aria-label="模擬付款安全提醒"><div class="line-job-pay-header"><span aria-hidden="true">‹</span><strong>付款確認</strong><small>安全模擬</small></div><div class="line-chat-fake-content"><span class="line-chat-fake-label">剛才按下的是模擬付款</span><h2>你被騙了！！</h2><p>要求求職者先付保證金，或交出存摺、提款卡，都是重大警訊。交出帳戶工具可能被利用收受詐騙款項。</p><strong>這只是本機教學警示：沒有連到任何支付服務或銀行，也沒有真的扣款。</strong><div class="line-job-warning-tip"><b>安全做法</b><span>拒絕付款，不提供金融資料；退出頁面，再回聊天室選單按「封鎖」。</span></div><button class="primary" type="button" data-scene-action="refuse-job-payment">我知道了，拒付並回聊天室封鎖</button></div></section>`;
}

export function renderJobOfferStage(stage, { showMenuButton = false, notice = "", contact = null } = {}) {
  if (stage === "job-payment") return renderJobPaymentCheckout();
  if (stage === "job-payment-warning") return renderJobPaymentWarning();
  if (!["job-block-ready", "job-menu"].includes(stage)) return "";
  if (stage === "job-block-ready")
    return `<section class="line-job-safe-stage" aria-label="模擬封鎖操作練習">${showMenuButton ? `<header class="line-job-mini-header"><span>網路兼職廣告<small>模擬聊天室</small></span>${renderJobMenuToggle(stage)}</header>` : ""}<div class="line-job-safe-instructions"><span class="line-job-safe-step">第 1 步 · 找到聊天室選單</span><h2>不交錢、不交帳戶</h2><p>接下來，按聊天室右上角的<strong>「☰ 選單」</strong>。</p><div class="line-job-step-path"><strong>1 開啟選單</strong><span aria-hidden="true">→</span><span>2 按封鎖</span></div><small>這是本機教學模擬，不會傳送訊息或封鎖真實帳號。</small></div></section>`;
  const buttons = [
    ["關閉提醒", "job-menu-mute", '<path d="M11 4 6 8H2v8h4l5 4V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'],
    ["推薦", "job-menu-recommend", '<path d="M7 10v11H3V10h4Zm0 10h11a2 2 0 0 0 2-2l2-7a2 2 0 0 0-2-2h-6l1-5c0-2-3-3-3-1l-5 7"/>'],
    ["邀請", "job-menu-invite", '<path d="M10 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM2 22v-3a8 8 0 0 1 13-6m4-2v10m-5-5h10"/>'],
    ["封鎖", "confirm-job-block", '<circle cx="12" cy="12" r="10"/><path d="m5 19 14-14"/>'],
  ];
  const identity = contact || getLineContact("網路兼職廣告 · 模擬聊天室");
  return `<section class="line-job-menu-overlay" role="dialog" aria-modal="true" aria-label="聊天室選單"><div class="line-job-overlay-status" aria-hidden="true"><span>10:26</span><span>◖　▰　●</span></div><header class="line-job-overlay-header"><span class="line-job-overlay-back" aria-hidden="true">‹</span><span class="line-job-overlay-identity"><strong>${escapeHtml(identity.name)}</strong><small>${escapeHtml(identity.detail)}</small></span></header><div id="job-chat-menu" class="line-job-menu-overlay-actions" role="group" aria-label="聊天室四個操作按鈕">${buttons.map(([label, action, icon]) => `<button class="line-job-menu-action" type="button" data-scene-action="${action}" aria-label="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span>${label}</span></button>`).join("")}</div></section>`;
}

function renderJobConversation(question, session, stage) {
  const segments = getScenarioSegments(question);
  const adText = segments[0]?.text || "在家工作！徵求 LINE 打字員／商品點讚員，時薪 500 元，現領現金。";
  const requestText = segments[1]?.text || "正式上工前需要先繳納保證金，或提供銀行存摺與提款卡以發放薪資。";
  const hasJoined = stage !== "chat";
  const hasReturned = ["job-block-ready", "job-menu", "job-blocked"].includes(stage);
  const linkAction = hasReturned
    ? '<button type="button" disabled>已退出</button>'
    : '<button type="button" data-scene-action="open-job-payment" aria-label="開啟本機模擬報到付款連結">開啟連結</button>';
  return `<div class="line-chat-conversation line-job-conversation" role="log" aria-label="高薪求職情境模擬聊天流程">
    <div class="line-chat-safety-note"><span aria-hidden="true">練習</span> 以下為模擬對話，分段呈現並逐步發展，不會加入真實 LINE 或傳送訊息</div>
    <div class="line-chat-date">今天　10:24</div>
    <div class="line-chat-scene-card line-chat-job-scene" aria-label="模擬高薪居家工作廣告"><span class="line-chat-job-icon" aria-hidden="true">職</span><div><strong>居家打字／點讚員</strong><p>${escapeHtml(adText)}</p></div></div>
    ${hasJoined ? `<div class="line-chat-outgoing"><div class="line-chat-outgoing-bubble">你好，我想了解居家打字／點讚員工作。</div><time>10:25</time></div><div class="line-chat-incoming line-chat-segment"><span class="line-chat-segment-label">加入 LINE 後，對方提出要求</span><div class="line-chat-incoming-bubble">${escapeHtml(requestText)}</div><time>10:26</time></div><div class="line-chat-link-preview line-job-link-preview"><span aria-hidden="true">↗</span><div><strong>居家工作報到付款</strong><small>job-onboard-pay.example · 本機模擬連結</small></div>${linkAction}</div><p class="line-chat-sim-note">連結只會開啟本機仿電子支付頁，不連到外部網站。</p>` : `<div class="line-chat-incoming line-chat-segment"><span class="line-chat-segment-label">收到高薪徵才廣告</span><div class="line-chat-incoming-bubble">${escapeHtml(adText)}</div><time>10:24</time></div><div class="line-chat-job-action"><p>按下方按鈕，模擬加入 LINE 聯絡。</p><button class="primary" type="button" data-scene-action="join-job-chat">加入 LINE 聯絡</button><small>本機情境互動，不會開啟或加入真實帳號</small></div>`}
    ${hasReturned ? `<div class="line-chat-outgoing"><div class="line-chat-outgoing-bubble">我拒絕付款，並退出連結。</div><time>10:27</time></div><div class="line-chat-system-note" role="status">${escapeHtml(stage === "job-blocked" ? "已在本機模擬封鎖，沒有操作真實 LINE。" : session.jobMenuNotice || "已拒付並返回聊天室。請開啟右上角「選單」，再按「封鎖」完成練習。")}</div>` : ""}
  </div>`;
}

export function renderSupportCallStage(stage) {
  if (stage === "screen-share")
    return `<section class="line-chat-call-stage line-chat-call-share" aria-label="模擬螢幕共享畫面"><div class="line-chat-fake-address"><span aria-hidden="true">◉</span><span>螢幕共享 · 安全模擬</span><small>不會真的分享畫面</small></div><div class="line-chat-fake-content"><span class="line-chat-fake-label">你照對方指示開啟了共享</span><h2>你被騙了！！</h2><p>假客服可能趁螢幕共享時看見簡訊驗證碼、密碼和金融操作。</p><strong>這只是情境演練，沒有連線，也沒有分享你的手機畫面。</strong><button class="primary" type="button" data-scene-action="stop-screen-share">停止模擬並查看解析</button></div></section>`;
  if (stage === "hangup")
    return `<section class="line-chat-call-stage line-chat-call-hangup" aria-label="模擬掛斷客服來電"><div class="line-chat-fake-address"><span aria-hidden="true">☎</span><span>LINE 語音通話 · 安全模擬</span><small>不會撥打或接聽電話</small></div><div class="line-chat-call-panel"><span class="line-chat-call-avatar" aria-hidden="true">☎</span><strong>自稱 LINE 官方客服</strong><p>對方仍在通話中。按下掛斷，結束這通模擬來電。</p><button class="line-chat-hangup-button" type="button" data-scene-action="confirm-hangup">掛斷電話</button></div></section>`;
  return "";
}

function renderChoices(question) {
  return question.options
    .map((option, index) => {
      const sceneAction =
        question.interaction === "vote-link" && index === 0
          ? ' data-scene-action="open-fake-site"'
          : question.interaction === "vote-link" && index === 1
            ? ' data-scene-action="prepare-safe-reply"'
            : question.interaction === "support-call" && index === 0
              ? ' data-scene-action="start-screen-share"'
              : question.interaction === "support-call" && index === 1
              ? ' data-scene-action="start-hangup"'
              : question.interaction === "job-offer" && index === 0
                ? ' data-scene-action="open-job-payment"'
                : question.interaction === "job-offer" && index === 1
                  ? ' data-scene-action="prepare-job-block"'
            : ` data-answer="${index}"`;
      const actionLabel =
        question.interaction === "vote-link" && index === 0
          ? "開啟模擬投票網址"
          : question.interaction === "vote-link" && index === 1
            ? "預填安全回覆"
            : question.interaction === "support-call" && index === 0
              ? "開啟模擬螢幕共享"
              : question.interaction === "support-call" && index === 1
              ? "前往模擬掛斷流程"
              : question.interaction === "job-offer" && index === 0
                ? "開啟模擬付款連結"
                : question.interaction === "job-offer" && index === 1
                  ? "前往聊天室選單封鎖練習"
            : "選擇這個做法";
      const actionText =
        question.interaction === "vote-link" && index === 1
          ? "準備回覆　›"
          : question.interaction === "support-call" && index === 0
            ? "開啟模擬畫面　›"
            : question.interaction === "support-call" && index === 1
              ? "掛斷來電　›"
              : question.interaction === "job-offer" && index === 0
                ? "查看模擬付款頁　›"
                : question.interaction === "job-offer" && index === 1
                  ? "練習選單封鎖　›"
            : "選這個做法　›";
      return `<button class="line-chat-reply" type="button"${sceneAction} aria-label="${actionLabel}：${escapeHtml(option)}"><span class="line-chat-reply-number" aria-hidden="true">${index + 1}</span><span class="line-chat-reply-text">${escapeHtml(option)}</span><span class="line-chat-reply-action" aria-hidden="true">${actionText}</span></button>`;
    })
    .join("");
}

function renderComposer(interactionStage) {
  if (interactionStage === "compose")
    return `<div class="line-chat-composer line-chat-composer-ready" aria-label="訊息已預填，請按傳送"><span class="line-chat-composer-icon" aria-hidden="true">＋</span><span class="line-chat-composer-input" role="textbox" aria-readonly="true">不了謝謝</span><button class="line-chat-send" type="button" data-scene-action="send-safe-reply">傳送</button></div>`;
  return `<div class="line-chat-composer" aria-label="訊息輸入列，請選擇上方回覆"><span class="line-chat-composer-icon" aria-hidden="true">＋</span><span class="line-chat-composer-input">輸入訊息</span><span class="line-chat-composer-icon" aria-hidden="true">☺</span><span class="line-chat-composer-icon line-chat-mic" aria-hidden="true">●</span></div>`;
}

export function renderLineChatQuestion(question, session) {
  const contact = getLineContact(question.sender);
  const step = session.index + 1;
  const total = session.qs.length;
  const segments = getScenarioSegments(question);
  const interactionStage = session.interactionStage || "chat";
  if (question.interaction === "job-offer" && interactionStage === "job-menu")
    return renderJobOfferStage("job-menu", { contact });
  const blockSuccess = question.interaction === "job-offer" && session.answered && session.correct && interactionStage === "job-blocked"
    ? `<div class="line-job-inline-success" role="status"><strong>✓ 答對了</strong><span>已在模擬選單按下「封鎖」</span></div>`
    : "";
  const messages = segments
    .map(
      (segment, index) => `<div class="line-chat-incoming line-chat-segment"><span class="line-chat-segment-label">第 ${index + 1} 段｜${escapeHtml(segment.label)}</span><div class="line-chat-incoming-bubble">${escapeHtml(segment.text)}</div><time>10:${String(24 + index).padStart(2, "0")}</time></div>`,
    )
    .join("");
  const voteLink =
    question.interaction === "vote-link"
      ? `<div class="line-chat-link-preview"><span aria-hidden="true">↗</span><div><strong>寵物比賽投票頁</strong><small>pet-vote-gift.example · 模擬網址</small></div><button type="button" data-scene-action="open-fake-site" aria-label="開啟模擬投票網址 pet-vote-gift.example">開啟網址</button></div><p class="line-chat-sim-note">這是安全演練連結，不會連到外部網站。</p>`
      : "";
  const stageView =
    question.interaction === "vote-link" && interactionStage === "fake-site"
      ? renderFakeSite()
      : question.interaction === "support-call"
        ? renderSupportCallStage(interactionStage)
        : question.interaction === "job-offer"
          ? ["job-payment", "job-payment-warning"].includes(interactionStage)
            ? renderJobOfferStage(interactionStage, { notice: session.jobMenuNotice })
            : ""
        : "";
  const jobConversation = question.interaction === "job-offer"
    ? renderJobConversation(question, session, interactionStage)
    : "";
  const choices =
    interactionStage === "compose"
      ? `<div class="line-chat-reply-divider"><span>訊息已填好</span><small>檢查後按「傳送」送出</small></div>`
      : session.answered ? "" : `<div class="line-chat-reply-divider"><span>${question.interaction === "support-call" ? "你會怎麼處理這通來電？" : question.interaction === "job-offer" ? "你會怎麼回應這則求職訊息？" : "你會怎麼回覆？"}</span><small>選擇下一步，看看情境會怎麼發展</small></div><div class="line-chat-replies">${renderChoices(question)}</div>`;
  const conversation =
    stageView || jobConversation ||
    `<div class="line-chat-conversation" role="log" aria-label="${escapeHtml(contact.name)} 傳來的模擬訊息，共 ${segments.length} 段，及可選做法"><div class="line-chat-safety-note"><span aria-hidden="true">練習</span> 以下為防詐模擬對話，分段呈現，不會傳送真實訊息</div><div class="line-chat-date">今天　10:24</div>${renderSceneCard(question)}${messages}${voteLink}${choices}</div>`;

  const headerActions = question.interaction === "job-offer" && ["job-block-ready", "job-menu"].includes(interactionStage)
    ? renderJobMenuToggle(interactionStage)
    : '<span class="line-chat-header-actions" aria-hidden="true"><span>⌕</span><span>☰</span></span>';
  const composer = !stageView && !session.answered
    ? renderComposer(interactionStage)
    : "";
  const readLabel = question.interaction === "job-offer"
    ? "唸出聊天情境和操作提示"
    : "唸出訊息和回覆選項給我聽";
  return `<div class="quiz-content line-question-layout line-chat-question"><section class="line-scenario-card" aria-label="模擬情境：${escapeHtml(question.title)}"><div class="line-scenario-topline"><span class="line-scenario-kicker">模擬情境</span><span class="line-scenario-count">${step} / ${total}</span></div><h1>${escapeHtml(question.title)}</h1>${blockSuccess}<div class="line-chat-device"><div class="line-chat-statusbar" aria-hidden="true"><time>10:24</time><span class="line-chat-status-icons"><span>●●●</span><span>◖</span><span class="line-chat-battery"><i></i></span></span></div><header class="line-chat-app-header"><span class="line-chat-back" aria-hidden="true">‹</span><span class="line-sim-avatar" aria-hidden="true">${escapeHtml(contact.avatar)}</span><span class="line-sim-contact"><strong>${escapeHtml(contact.name)}</strong><small>${escapeHtml(contact.detail)} · 模擬情境</small></span>${headerActions}</header>${conversation}${composer}</div>${session.answered ? "" : `<button class="secondary line-chat-read" type="button" data-read data-idle-label="${readLabel}">${readLabel}</button>`}</section></div>`;
}
