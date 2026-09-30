# NewsFlow · 三场景联动卡片（Rinx 网页卡片形态）

GOSIM Agentic App 黑客松提交包。**作品主体 = 独立网页卡片**（`card/`，已部署 `intentflow-card.pages.dev`）+ Rinx 内分享演示证据（见 `docs/rinx-share-demo.md`）。

## 为什么这样交付（官方口径）

- 官方提交形态三选一：Hub 卡片包 / 网页卡片 / 原生宿主。本作品走 **网页卡片**（"网页小程序交付源码、可运行页面与 URL 卡片"）。
- 本目录 `manifest.json` + `listing.json` 按 OctoSense App Hub 包规范（`OctoSense-App-Hub/docs/PUBLISHING.md`）备齐资料与权限声明，用于**本地预检**。
- 但 Hub 包有硬约束：包内所有 card/data/文本**不允许出现 `http(s)://` 外链**（资产必须本地化进包）。网页卡片的运行本体是线上 URL，无法完全塞进 Hub 包——因此：
  - 本目录 = **资料包 + 预检占位**（manifest/listing/图标/说明），跑 `hub check` 验"资料与权限"维度
  - **可运行验收 = URL 卡片**：Rinx 分享 `intentflow-card.pages.dev`，评委在注明版本宿主里打开 URL 卡片跑任务（官方明确"现阶段各轮评审以公开源码仓库和可运行作品为准，无需等待上架"）
- 两条证据线并行，互不替代。

## 本目录文件

```
appcard/
├── manifest.json      # Hub 包 manifest（integrity 待 hub stamp；权限最小化：仅 read-only + card.render）
├── listing.json       # 商店展示资料（引用 screenshots/ 与 assets/icon.svg，提交前必须存在）
├── page.data.json     # 卡片数据绑定 + 分享流程 + 权限声明（无账号/无聊天记录/纯静态）
├── assets/icon.svg    # 包图标（本地资产）
├── screenshots/       # 截图位（提交前放 ≥1 张 PNG）
└── kit/               # 卡片 lowering 用 kit（可选：用 image-to-appcard 流程生成或手写 L0）
```

## 权限设计（manifest）

- `capabilities: []`：不申请 storage/net 等任何能力——卡片是纯静态页，数据绑死在 `page.data.json`，不需要网络出口。
  （若后续卡片要在线刷新行情，才加 `net` + `network.hosts: [行情API裸域名]`）
- `agent.profile: read-only` + `tools: [card.render]`：Agent 只能读卡片状态与渲染，不写不改。

## 本地预检（如已安装 hub CLI）

```bash
# 1. 生成包摘要（integrity.bundle_blake3 由 stamp 写入，勿手改）
hub stamp appcard
# 2. 预检（exit 0 = 可被 Hub 准入；看 grants 是否最小）
hub check appcard --allow-unsigned
# 3. 生成评审自检包（自己先答一遍 4 问）
hub scan  appcard --packet review.json
```

> 若 `hub` CLI 尚未开放，跳过预检，直接走 URL 卡片提交线（评审以仓库 + 可运行作品为准）。

## 提交前核对（对齐 10/4 初赛清单）

- [ ] `listing.json` 引用的 `screenshots/01-today-brief.png` 与 `assets/icon.svg` 真实存在
- [ ] `manifest.json` 的 `integrity.bundle_blake3` 由 `hub stamp` 生成（空值 = 未 stamp）
- [ ] 包内无 `http(s)://` 外链（除 listing 的 support/privacy_policy_url，官方允许 https）
- [ ] `docs/rinx-share-demo.md` 的分享/授权/结果回传流程有截图证据
- [ ] 截图区分练习数据 vs 真实服务（本作品 = 全练习数据，无真实服务接入）
