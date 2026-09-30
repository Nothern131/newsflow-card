# 复现步骤 · 三场景联动卡片

## 1. 本地预览卡片

```bash
cd E:\gosim-starter\markets-app
python -m http.server 8000
# 浏览器开 http://localhost:8000/card
```

> 直接双击 `card/index.html` 也可以看（fetch 会失败，用内置兜底数据，三场景各一条照样渲染）。

## 2. 跑 Agent 生成三场景卡片

```bash
cd E:\gosim-starter\markets-app
python agent\generate_card.py data\sample.json
```

- 没配 LLM：输出 7 张卡（3 markets + 2 calendar + 2 news），每张 `_generated_by: template`（规则模板兜底，demo 不崩）
- 配了模型（`agent-observer-starter-kit/agent/.env`）：输出 `_generated_by: llm`

## 3. 数据说明

`data/sample.json` 包含 7 条练习数据：

| type | 条数 | 关联字段 |
|---|---|---|
| markets | 3 | calendar_events, related_news, topics |
| calendar | 2 | related_ticker, status(pending/confirmed) |
| news | 2 | topics, source, published_at, link |

财经与新闻通过 `topics` 关联（如 300750 动力电池 → 新闻主题"动力电池"）。

## 4. 三场景交互演示

1. **财经卡**：点"订阅跟踪" → 显示已订阅；点"相关日程"里的条目 → 切换 pending/confirmed
2. **日历卡**：点"确认排入" → 状态变已落实；点"拒绝 / 过期" → 显示"已过期，Agent 将重试"
3. **新闻卡**：点主题 badge（如"动力电池"）→ 财经卡高亮闪烁 3 秒

## 5. 接到 Rinx（提交时）

网页卡片路径：
1. 把 `card/` 部署到一个公开 HTTP(S) 地址（任意静态托管）
2. 在 Rinx 会话里用"网页卡片"分享该 URL
3. 接收者打开卡片，看三场景联动 + 点订阅 + 确认日程

> 现阶段 Rinx 商店未开放，评审看"公开源码仓库 + 可运行作品"，不必等上架。

## 6. 录屏（提交材料）

按 README"联动叙事"一节的 3 段录：
1. 意图（30s）：订阅财经卡
2. 执行（45s）：Agent 排入日历 + 确认/过期演示
3. 核验（30s）：新闻简报聚合 + 主题高亮关联
