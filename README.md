# 三场景联动卡片 · Markets / Calendar / News

> GOSIM Agentic App 黑客松 · 多场景联动原型
> 一句话定位：用户订阅财经研究卡后，Agent 自动把关键日期排入日历（待确认状态），新闻简报聚合相关主题——三张卡片互相关联，一条意图链贯穿"意图→执行→核验"。

## 为什么选三场景联动

1. 官方允许联动多场景统一参评，三场景故事完整且视觉差异化强
2. 财经卡（markets）：事实/来源/分析三层 + 关联日程 + 关联新闻
3. 日历卡（calendar）：区分"待确认"与"已落实"日程，含失败处理（过期→Agent 重试）
4. 新闻卡（news）：保留来源+时间，主题 badge 点击可高亮关联财经卡

## 目录结构

```
markets-app/
├── card/                    # 网页卡片（三场景联动渲染）
│   ├── index.html           # 入口页（标题已更新为三场景版本）
│   ├── app.js               # 按 type 分支渲染：markets / calendar / news
│   └── style.css            # 财经=默认 / 日历=蓝色系 / 新闻=紫色系
├── appcard/                 # App Hub 资料包（manifest/listing/图标 + 权限声明，本地预检用）
│   ├── manifest.json        # Hub 包 manifest（integrity 待 hub stamp；权限最小：read-only + card.render）
│   ├── listing.json         # 商店展示资料（引用 screenshots/ 与 assets/icon.svg）
│   ├── page.data.json       # 卡片数据绑定 + 分享流程 + 权限声明（无账号/无聊天记录/纯静态）
│   ├── assets/icon.svg      # 包图标（本地资产）
│   ├── screenshots/         # 截图位（提交前放 ≥1 张 PNG，tools/crop_screenshot.py 裁 812×1552）
│   └── kit/                 # L0 lowering 用 kit（占位，按需生成）
├── agent/                   # Agent 侧（三场景卡片生成器）
│   ├── generate_card.py     # 输入 JSON 数组，按 type 分发，输出 JSON 数组
├── tools/
│   └── crop_screenshot.py   # 全页截图裁出 812×1552 artboard（Hub 要求）
├── data/
│   └── sample.json          # 7 条练习数据（3 markets + 2 calendar + 2 news）
├── docs/
│   ├── reproduce.md         # 复现步骤（已同步三场景版本）
│   └── rinx-share-demo.md   # Rinx 分享演示 4 段脚本 + 截图位（提交证据线 ②）
├── LICENSE                  # Apache-2.0
└── README.md                # 本文件
```

## 启动（一行）

```bash
# 本地预览卡片（在 markets-app 目录）
python -m http.server 8000   # 浏览器开 http://localhost:8000/card
# 跑 Agent 生成三场景卡片
python agent/generate_card.py data/sample.json
```

## 配 LLM（出 `_generated_by: llm` 的真卡）

复用天文赛 starter 的 `model_factory.py`（OpenAI-compatible，支持 GLM/DeepSeek/Kimi/Qwen 等）：

```bash
# 1. 在 starter 的 agent 目录配好 .env（不入库）
cp E:\gosim-starter\agent-observer-starter-kit\agent\.env.example E:\gosim-starter\agent-observer-starter-kit\agent\.env
# 编辑 .env：MODEL_PROVIDER=deepseek / MODEL_NAME=... / MODEL_BASE_URL=... / DEEPSEEK_API_KEY=...

# 2. 依赖（langchain-openai 等）
py -3.13 -m pip install -r E:\gosim-starter\agent-observer-starter-kit\agent\requirements.txt

# 3. 跑生成器
python agent/generate_card.py data/sample.json
# 有 LLM → "_generated_by": "llm"；没 LLM / 没网 → 自动退回 "template"，不会崩
```

## 联动叙事（提交时怎么讲）

### 录屏 1：意图（30 秒）

> "我订阅了一只股票的财经研究卡。"
> 展示：财经卡（ticker 600519）→ 点击"订阅跟踪"CTA → 显示"✓ 已订阅（用户授权确认成功）"
> 画外音：用户只需一个动作——订阅，后续由 Agent 接管。

### 录屏 2：执行（45 秒）

> "Agent 自动把财报发布日和股东大会日排进了日历。"
> 展示：财经卡上"相关日程"区块（⚠ 待确认 / ✓ 已落实）→ 滚动到日历卡（蓝色系）→ 点击"确认排入"按钮 → 状态从"⚠ 待确认"变为"✓ 已落实"
> 画外音：Agent 从公告中提取关键日期，生成待确认日程，用户一键确认。
> 失败处理演示：点击"拒绝 / 过期" → 显示"已过期，Agent 将重试"（对应官方失败处理要求）

### 录屏 3：核验（30 秒）

> "新闻简报把相关主题新闻聚合进来，保留来源和时间。"
> 展示：财经卡"相关新闻"区块（标注"来自新闻简报"）→ 滚动到新闻卡（紫色系）→ 点击主题 badge（如"动力电池"）→ 财经卡高亮闪烁
> 画外音：三张卡片互相关联，主题词是它们的"胶水"。

## 提交证据双通道（10/4 初赛口径）

官方允许三条交付形态：Hub 卡片包 / 网页卡片 / 原生宿主。本作品走**网页卡片**，两条证据线并行：

1. **可运行验收线**：URL 卡片 `https://intentflow-card.pages.dev` 在 Rinx 内分享（脚本见 [docs/rinx-share-demo.md](docs/rinx-share-demo.md)，4 段：意图→执行→确认→失败）
2. **资料与权限预检线**：[appcard/](appcard/) 目录（manifest + listing + 图标 + 权限声明），`hub check` 验资料完整性

> 官方明确："现阶段各轮评审仍以公开源码仓库和可运行作品为准，无需等待上架。"

## 待补（提交前必填）

- [x] `card/` 三件套（index.html / app.js / style.css）——三场景卡片渲染
- [x] `agent/generate_card.py`——三场景卡片生成器（markets/calendar/news 分发 + 确定性兜底）
- [x] `data/sample.json`——7 条练习数据（三场景 + 关联字段）
- [x] 三场景联动（财经 → 日历 → 新闻 意图链）已完成
- [x] `appcard/` App Hub 资料包（manifest + listing + 图标 + 权限声明）
- [x] `docs/rinx-share-demo.md` Rinx 分享 4 段演示脚本
- [x] `LICENSE` = Apache-2.0
- [x] 推到公开 GitHub 仓库，最后一个 commit 可运行
- [ ] `appcard/screenshots/` 放 ≥1 张 PNG（用 `tools/crop_screenshot.py` 裁 812×1552）
- [ ] Rinx 会话里分享 URL 卡片，录 4 段（证据线 ①，脚本见 rinx-share-demo.md）
- [ ] 配 LLM 出真卡（可选：见「配 LLM」节；template 兜底已可跑）
