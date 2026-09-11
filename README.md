# ST Direct Event

SillyTavern 的分轮事件导演扩展。副模型一次生成完整事件档案，插件按回合只向主模型发送当前小纸条。

## 当前架构

- 副模型输出 `<event_outline>`：暗箱 `<the_key>`、连续 `<stage>` 与终局 `<judgment_criteria>`。
- 非终局阶段只包含客观环境变化、NPC 主动动作和 Action Hook。
- 当前纸条以独立 `{ role: "system" }` 消息插入最新真实玩家消息之后；玩家消息内容保持原样。
- 终局前不注入暗箱、结局条件或后续阶段。终局按玩家此前真实言行裁决。
- 结构解析失败时停止投递，不把完整原稿回退给主模型。
- 事件生成后不自动展示完整剧本。查看档案需要用户主动操作。

## 默认配置

- 辅助模型：`agy-gemini-3.8-flash-high`
- 最大输出：`40000`
- 温度：`0.8`
- 主题：深海蔚蓝
- 图标：`director.svg`

请求方式支持酒馆代理、自动和浏览器直连。酒馆代理需要在根目录 `config.yaml` 设置 `enableCorsProxy: true`，然后重启 SillyTavern 服务。

## 验证

```powershell
node --check index.js
node tests/regression.cjs
node tests/system-contract.cjs
node tests/proxy-regression.cjs
node tests/live-e2e.cjs
```

前三项验证解析、注入、轮次、保密、玩家消息纯度、停止/重试/删除消息与代理行为。`live-e2e.cjs` 会使用本地已保存的接口配置执行推理、战斗和恋爱两轮真实调用，并将不含密钥的结果写入用户数据目录的 `st-direct-validation`。

## 兼容

解析器同时接受 0.4 版 `<event_archive>/<segment_N>/<event_endings>` 档案和 0.5 版 `<event_outline>` 档案，旧事件仍可继续执行。普通事件预设会随 `configVersion: 7` 更新；破限与小说豁免文本不参与迁移。
