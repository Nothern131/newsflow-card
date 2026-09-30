# Rinx 分享演示 · 证据位（提交前补截图/录屏）

> 官方要求（每场景 4 条）：明确用户/输入事件/目标；展示 Agent 读状态→提出行动→执行；核验结果 + 失败/拒绝/过期处理；可复现测试与截图，区分练习数据与真实服务。
> 本作品 = 网页卡片形态，分享入口是 Rinx 的 **URL 卡片**（`intentflow-card.pages.dev`）。

## 演示脚本（4 段，对应官方 4 条）

| 段 | 画面 | 要点 | 截图位 |
|---|---|---|---|
| 1 意图 | Rinx 会话里收到/打开 URL 卡片 | 用户、输入事件（订阅财经研究卡）、目标一句话讲清 | shots/01-rinx-open-card.png |
| 2 执行 | 页内：点主题 tag → 财经卡高亮；点股票号 → 定位行情 | Agent 读懂状态、多步联动（新闻↔财经 topics 胶水） | shots/02-rinx-linkage.png |
| 3 确认 | 日历卡"确认排入" → 状态 pending→confirmed 同步翻转 | 重要操作留人确认（官方第 2 条） | shots/03-rinx-confirm.png |
| 4 失败 | 点"拒绝/过期" → "已过期，Agent 将重试" | 失败/过期处理（官方第 3 条） | shots/04-rinx-expired.png |

- 录屏：4 段各 15-30s，或合成 90s 一条（视频不能替代可运行作品，仅作辅助证据）
- 接收方视角：URL 卡片静态页不继承账号权限、不读聊天记录（`appcard/page.data.json` 的 `permissions` 一节已声明），演示时讲一句"独立打开、无权限传递"

## 截法

1. Rinx 会话 → `+` → 网页卡片 → 填 `intentflow-card.pages.dev` → 打开
2. 每段全页截图（建议 1600×1000），裁出关键区域
3. 存 `shots/` 下（本仓库 `docs/` 已 gitignore，仅本地证据；提交仓库里放 `appcard/screenshots/`）

## 与 Hub 预检的关系

- Rinx URL 卡片 = **可运行验收线**（评委在注明版本宿主里打开 URL 跑任务）
- `appcard/` 目录 = **资料与权限预检线**（`hub check`，验 manifest/listing 完整性）
- 两条线互不替代，10/4 提交时一起交
