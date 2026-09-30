# kit/ · 卡片 lowering 用 kit（占位）

官方推荐路径：用 `Octoscript-AppCard` 仓库的 `tools/image-to-appcard-flow.sh` 生成 card / data / kit，不手写 L0。

本作品走**网页卡片形态**（L0 Web Playground 不在参赛范围），kit 仅在需要给 App Hub 预检"卡片 lowering"证据时生成：

```bash
# 需要时执行（Octoscript-AppCard 仓库内）
./tools/image-to-appcard-flow.sh <设计图.png>
# 产物放这里：page.card + page.data.json + kit/
```

未执行状态：本页卡片本体是独立静态网页（`../card/`），不依赖 L0 包。
