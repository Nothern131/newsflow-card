// 要闻简报 Newsflow · 新闻驱动三场景联动
// 结构：首屏要闻（新闻当主角）→ 关联证据区（财经 + 日历）
// 联动：新闻 topic → 高亮关联财经卡；财经日程确认 → 日历卡按 title 主键同步翻转
// 数据：topics 做新闻/财经胶水，calendar_events.title 做财经/日历主键

const RAW_DATA_URL = "data/sample.json";
const TYPE_LABEL = { markets: "财经", calendar: "日程", news: "新闻" };
const EVENT_KEY = "title";

let ALL_DATA = [];
let currentFilter = "all";
let activeTicker = null; // 当前从要闻牵出的财经卡 ticker

// 种子 hash（粒子无随机，每帧是 t 的纯函数）
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const SCENE_COLORS = { markets: "#34d399", calendar: "#f5a524", news: "#a78bfa" };

// ── 渲染分派 ──
function renderAll(container) {
  ALL_DATA.forEach((raw) => {
    const type = raw.type || "markets";
    let card;
    if (type === "news") card = renderNewsCard(raw);
    else if (type === "calendar") card = renderCalendarCard(raw);
    else card = renderMarketsCard(raw);
    card.dataset.type = type;
    card.dataset.idx = String(ALL_DATA.indexOf(raw));
    if (type === "markets") card.dataset.ticker = raw.ticker;
    if (type === "calendar") card.dataset.event = raw[EVENT_KEY] || "";
    container.append(card);
  });
}

// ── 新闻大头条（首屏主角）──
function renderNewsCard(raw) {
  const card = document.createElement("div");
  card.className = "card news";

  const head = document.createElement("div");
  head.className = "head";
  const h = document.createElement("span");
  h.className = "news-headline";
  h.textContent = raw.headline;
  h.append(typeBadge(raw.type));
  head.append(h);
  card.append(head);

  // 导语（用分析层判断：新闻里的关键数字 = 事实）
  const lede = document.createElement("p");
  lede.className = "news-lede";
  lede.textContent = raw.summary || "（规则模板：Agent 已保留来源与时间，待 LLM 生成导语）";
  card.append(lede);

  // meta：时间 + 来源
  const meta = document.createElement("div");
  meta.className = "news-meta";
  const timeStr = raw.published_at ? new Date(raw.published_at).toLocaleString("zh-CN") : "—";
  const t = document.createElement("span");
  t.textContent = timeStr;
  const src = document.createElement("span");
  src.className = "src";
  src.textContent = raw.source;
  meta.append(t, src);
  card.append(meta);

  // 原文链接（练习数据 link 为相对占位符，拦截 click，不真跳）
  if (raw.link) {
    const a = document.createElement("a");
    a.className = "news-link";
    a.href = raw.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "原文链接 →";
    a.addEventListener("click", (e) => {
      if (!/^https?:/i.test(raw.link)) { e.preventDefault(); }
    });
    card.append(a);
  }

  // 主题 tag（点 → 牵出关联财经卡）+ 股票号 tag（点 → 定位财经卡）
  const badgeRow = document.createElement("div");
  badgeRow.className = "badge-row";
  if (raw.related_ticker) {
    const tick = document.createElement("span");
    tick.className = "badge ticker-tag";
    tick.textContent = `关联 ${raw.related_ticker}`;
    tick.addEventListener("click", () => focusTicker(raw.related_ticker));
    badgeRow.append(tick);
  }
  (raw.topics || []).forEach((topic) => {
    const b = document.createElement("span");
    b.className = "badge topic";
    b.textContent = topic;
    b.addEventListener("click", () => highlightByTopic(topic));
    badgeRow.append(b);
  });
  card.append(badgeRow);

  // 已读态（官方新闻场景"让用户决定何时阅读"）
  const read = document.createElement("div");
  read.className = "news-read";
  const state = document.createElement("span");
  state.className = "state" + (raw.status === "read" ? " read" : "");
  state.textContent = raw.status === "read" ? "✓ 已读" : "未读";
  read.append(state);
  const readBtn = document.createElement("button");
  readBtn.className = "btn confirm";
  readBtn.textContent = raw.status === "read" ? "标记未读" : "标记已读";
  readBtn.addEventListener("click", () => {
    raw.status = raw.status === "read" ? "unread" : "read";
    state.className = "state" + (raw.status === "read" ? " read" : "");
    state.textContent = raw.status === "read" ? "✓ 已读" : "未读";
    readBtn.textContent = raw.status === "read" ? "标记未读" : "标记已读";
  });
  read.append(readBtn);
  card.append(read);

  return card;
}

// ── 财经卡（关联证据）──
function renderMarketsCard(raw) {
  const card = document.createElement("div");
  card.className = "card markets";

  const head = document.createElement("div");
  head.className = "head";
  const ticker = document.createElement("span");
  ticker.className = "ticker";
  ticker.textContent = raw.ticker;
  ticker.append(typeBadge(raw.type));
  const price = document.createElement("span");
  const up = (raw.change_pct || "").startsWith("+");
  price.className = `price ${up ? "up" : "down"}`;
  price.textContent = `${raw.price}  ${raw.change_pct}`;
  head.append(ticker, price);
  card.append(head);

  card.append(section("事实", raw.notice ? [raw.notice] : ["（无公告）"], "fact"));
  card.append(section("来源", [raw.source || "练习数据"], "source"));
  card.append(section("分析", [ruleAnalysis(raw)], "analysis"));

  // 相关日程（内嵌，点确认 → 同步独立日历卡）
  card.append(renderCalendarSection(raw.calendar_events || [], raw));

  const cta = document.createElement("div");
  cta.className = "cta";
  cta.textContent = "订阅跟踪 → 价格 / 公告再变化时推送";
  cta.addEventListener("click", () => {
    const on = cta.classList.toggle("subscribed");
    cta.textContent = on ? "✓ 已订阅（演示：用户授权确认成功）" : "订阅跟踪 → 价格 / 公告再变化时推送";
    if (on) {
      // 订阅后把该财经卡的 pending 日程全部提示为"待确认提醒"（触发日历卡高亮）
      (raw.calendar_events || []).forEach((ev) => {
        if (ev.status === "pending") flashCalendarByTitle(ev.title);
      });
    }
  });
  card.append(cta);

  return card;
}

// 财经卡内嵌日程：点行 → 翻转本卡状态 + 同步独立日历卡（按 title 主键）
function renderCalendarSection(events, rawMarkets) {
  const wrap = document.createElement("div");
  wrap.className = "section sub-section";
  const h = document.createElement("div");
  h.className = "label";
  h.textContent = "相关日程";
  wrap.append(h);

  const ul = document.createElement("ul");
  if (!events.length) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "暂无排入日程";
    ul.append(empty);
  }
  events.forEach((ev) => {
    const li = document.createElement("li");
    li.className = "cal-event";

    const icon = document.createElement("span");
    icon.className = `cal-icon ${ev.status}`;
    icon.textContent = ev.status === "confirmed" ? "✓" : "⚠";
    li.append(icon);

    const title = document.createElement("span");
    title.textContent = ev.title;
    li.append(title);

    const kindBadge = document.createElement("span");
    kindBadge.className = "badge";
    kindBadge.textContent = ev.kind === "earnings" ? "财报" : "股东会议";
    li.append(kindBadge);

    const date = document.createElement("span");
    date.className = "cal-date";
    date.textContent = ev.date;
    li.append(date);

    const statusText = document.createElement("span");
    statusText.className = `cal-status ${ev.status}`;
    statusText.textContent = ev.status === "confirmed" ? "已落实" : "待确认";
    li.append(statusText);

    // 点击翻转：本卡 + 独立日历卡（按 title 主键同步）
    li.addEventListener("click", () => {
      ev.status = ev.status === "confirmed" ? "pending" : "confirmed";
      icon.className = `cal-icon ${ev.status}`;
      icon.textContent = ev.status === "confirmed" ? "✓" : "⚠";
      statusText.className = `cal-status ${ev.status}`;
      statusText.textContent = ev.status === "confirmed" ? "已落实" : "待确认";
      syncCalendarCard(ev.title, ev.status);
    });

    ul.append(li);
  });
  wrap.append(ul);
  return wrap;
}

// 按 title 主键找到独立日历卡并翻转其状态
function syncCalendarCard(title, status) {
  const card = document.querySelector(`.card.calendar[data-event="${CSS.escape(title)}"]`);
  if (!card) return;
  const idx = Number(card.dataset.idx);
  const raw = ALL_DATA[idx];
  raw.status = status;
  const area = card.querySelector(".status-area");
  if (area) {
    // 重绘日历卡状态区（复用日历卡的渲染逻辑）
    area.innerHTML = "";
    const holder = { status: raw.status };
    area.append(buildStatusUI(holder, () => {
      raw.status = holder.status;
      syncCalendarCard(title, raw.status);
    }));
  }
}

// ── 日历卡（关联证据）──
function renderCalendarCard(raw) {
  const card = document.createElement("div");
  card.className = "card calendar";

  const head = document.createElement("div");
  head.className = "head";
  const title = document.createElement("span");
  title.className = "cal-title";
  title.textContent = raw.title;
  title.append(typeBadge(raw.type));
  head.append(title);

  const date = document.createElement("span");
  date.className = "cal-date-large";
  date.textContent = raw.date;
  head.append(date);
  card.append(head);

  const kindRow = document.createElement("div");
  kindRow.className = "badge-row";
  const b = document.createElement("span");
  b.className = "badge kind";
  b.textContent = raw.kind === "earnings" ? "财报" : "股东会议";
  kindRow.append(b);
  card.append(kindRow);

  const statusArea = document.createElement("div");
  statusArea.className = "status-area";
  statusArea.append(buildStatusUI(raw, () => {
    syncCalendarCard(raw.title, raw.status);
  }));
  card.append(statusArea);

  if (raw.related_ticker) {
    const rel = document.createElement("div");
    rel.className = "related-ticker";
    rel.innerHTML = `关联股票：<b>${raw.related_ticker}</b>`;
    card.append(rel);
  }

  return card;
}

// 状态区 UI 构建（pending→待确认按钮组 / confirmed→已落实 / expired→重试）
function buildStatusUI(raw, onStatusChange) {
  const wrap = document.createElement("div");
  if (raw.status === "confirmed") {
    wrap.append(statusLine("confirmed", "✓ 已落实"));
  } else if (raw.status === "expired") {
    wrap.append(statusLine("expired", "已过期，Agent 将重试"));
    const retry = document.createElement("button");
    retry.className = "btn confirm";
    retry.textContent = "重试排入";
    retry.addEventListener("click", () => {
      raw.status = "pending";
      onStatusChange();
    });
    wrap.append(retry);
  } else {
    wrap.append(statusLine("pending", "⚠ 待确认"));
    const group = document.createElement("div");
    group.className = "btn-group";
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn confirm";
    confirmBtn.textContent = "确认排入";
    confirmBtn.addEventListener("click", () => {
      raw.status = "confirmed";
      onStatusChange();
    });
    const rejectBtn = document.createElement("button");
    rejectBtn.className = "btn reject";
    rejectBtn.textContent = "拒绝 / 过期";
    rejectBtn.addEventListener("click", () => {
      raw.status = "expired";
      onStatusChange();
    });
    group.append(confirmBtn, rejectBtn);
    wrap.append(group);
  }
  return wrap;
}

function statusLine(cls, text) {
  const s = document.createElement("div");
  s.className = `status ${cls}`;
  s.textContent = text;
  return s;
}

// ── 联动：topic / ticker / 日程高亮 ──
function highlightByTopic(topic) {
  document.querySelectorAll(".card.highlight").forEach((c) => c.classList.remove("highlight"));
  document.querySelectorAll(".card.markets").forEach((c) => {
    const idx = Number(c.dataset.idx);
    const raw = ALL_DATA[idx];
    if (raw && Array.isArray(raw.topics) && raw.topics.includes(topic)) {
      c.classList.add("highlight");
      scrollToLinked(c);
      setTimeout(() => c.classList.remove("highlight"), 2600);
    }
  });
}

function focusTicker(ticker) {
  activeTicker = ticker;
  const card = document.querySelector(`.card.markets[data-ticker="${ticker}"]`);
  if (card) {
    card.classList.add("highlight");
    scrollToLinked(card);
    setTimeout(() => card.classList.remove("highlight"), 2600);
  }
}

function flashCalendarByTitle(title) {
  const card = document.querySelector(`.card.calendar[data-event="${CSS.escape(title)}"]`);
  if (card) {
    card.classList.add("highlight");
    scrollToLinked(card);
    setTimeout(() => card.classList.remove("highlight"), 2600);
  }
}

function scrollToLinked(card) {
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

// 公共小工具
function typeBadge(type) {
  const b = document.createElement("span");
  b.className = `badge type-${type}`;
  b.textContent = TYPE_LABEL[type] || type;
  return b;
}

function ruleAnalysis(raw) {
  return `基于 ${raw.change_pct} 波动，关注「${raw.notice || "公告"}」落地节奏。规则模板，未含 LLM 判断。`;
}

function section(label, items, cls) {
  const div = document.createElement("div");
  div.className = "section";
  const h = document.createElement("div");
  h.className = "label";
  h.textContent = label;
  div.append(h);
  const ul = document.createElement("ul");
  items.forEach((text) => {
    const li = document.createElement("li");
    li.className = cls;
    li.textContent = text;
    ul.append(li);
  });
  div.append(ul);
  return div;
}

// ── tabs 过滤：全部/新闻/财经/日程 ──
function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentFilter = tab.dataset.type;
      document.querySelectorAll(".tab").forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", String(on));
      });
      // 新闻区：all/news 显示，否则隐藏
      const briefVisible = currentFilter === "all" || currentFilter === "news";
      document.getElementById("brief-cards").style.display = briefVisible ? "" : "none";
      document.querySelector(".brief-head").style.opacity = briefVisible ? "" : "0.35";
      // 关联区：按 type 过滤
      document.querySelectorAll("#cards .card").forEach((c) => {
        c.style.display = currentFilter === "all" || c.dataset.type === currentFilter ? "" : "none";
      });
      const linkedVisible = currentFilter !== "news";
      document.querySelector(".linked").style.display = linkedVisible ? "" : "none";
    });
  });
}

// ── 背景粒子 ──
function initParticles() {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, t;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  const N = 60;
  const colors = Object.values(SCENE_COLORS);
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < N; i++) {
      const speed = 0.15 + hash(i * 3.7) * 0.35;
      const x = (hash(i * 1.3) * w + t * speed) % w;
      const y = (hash(i * 7.1) * h + Math.sin(t * 0.01 + i) * 24) % h;
      const r = 0.6 + hash(i * 2.9) * 1.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length] + "2e";
      ctx.fill();
    }
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}

async function main() {
  let data;
  try {
    const resp = await fetch(RAW_DATA_URL);
    data = await resp.json();
  } catch (e) {
    data = [
      { type: "news", headline: "练习要闻", published_at: "2026-09-20T08:00:00+08:00", source: "内置", link: "", topics: ["练习"], related_ticker: "", status: "unread" },
      { type: "markets", ticker: "600519", price: "1450.00", change_pct: "-1.2%", notice: "练习兜底数据", source: "内置", calendar_events: [], topics: [] },
      { type: "calendar", title: "练习日程", date: "2026-10-18", kind: "earnings", status: "pending", source: "内置" },
    ];
  }
  ALL_DATA = data;

  // 首屏要闻区：只渲染 news
  const brief = document.getElementById("brief-cards");
  data.filter((d) => d.type === "news").forEach((raw) => brief.append(renderNewsCard(raw)));
  // 关联证据区：财经 + 日历
  const linked = document.getElementById("cards");
  data.filter((d) => d.type !== "news").forEach((raw) => linked.append(renderCardTo(raw, linked)));

  bindTabs();
}

// 渲染单个非新闻卡
function renderCardTo(raw, container) {
  const type = raw.type || "markets";
  const card = type === "calendar" ? renderCalendarCard(raw) : renderMarketsCard(raw);
  card.dataset.type = type;
  card.dataset.idx = String(ALL_DATA.indexOf(raw));
  if (type === "markets") card.dataset.ticker = raw.ticker;
  if (type === "calendar") card.dataset.event = raw[EVENT_KEY] || "";
  container.append(card);
  return card;
}

main();
