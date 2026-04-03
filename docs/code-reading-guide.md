# HazelSpam 代码阅读指南

本文档面向“想快速看懂项目”的开发者，重点解释目录职责、关键数据流和历史命名。

## 1. 先看什么

建议阅读顺序：

1. `src/main.ts`
2. `src/mountApp.ts`
3. `src/App.vue`
4. `src/components/PanelContent.vue`
5. `src/composables/useTextSpamForm.ts` 与 `src/modules/spam/textSpamModule.ts`
6. `src/composables/useEmotionSpamForm.ts` 与 `src/modules/spam/emotionSpamModule.ts`
7. `src/modules/default/userInfo.ts`
8. `src/utils/storage/schema.ts`

## 2. 三条主线

### 2.1 UI 主线（面板和交互）

- `App.vue`：壳层、主题接线、Dialog/Toast 容器。
- `PanelMenu.vue`：左侧导航。
- `PanelContent.vue`：根据菜单索引切换主视图（文本/表情/Crybaby/设置）。
- 各视图组件只负责界面，状态和行为尽量下沉到 composable。

### 2.2 运行主线（发车与停车）

- 触发入口在 `useSpamTaskRunner.ts`。
- 文本发车由 `TextSpamModule` 监听 emitter 的 `textSpam` 事件并执行。
- 表情发车由 `EmotionSpamModule` 监听 emitter 的 `emotionSpam` 事件并执行。
- 停车通过模块 `stop()` 关闭 `enable` 标记并清理定时器。

### 2.3 配置主线（存储与清洗）

- 唯一真源是 `src/utils/storage/schema.ts`。
- `sanitizeUiConfig` / `sanitizeModuleConfig` 负责读取和写入前的结构修正。
- store 里拿到的是“已经清洗后的配置对象”。

## 3. 历史命名说明（重要）

项目为了兼容历史数据，保留了一些旧键名。阅读时按“语义”理解，不要只看字面：

- `textSpam.textInterval`：实际语义是“单条弹幕字数上限”。
- `*.sequentialMode`：`true` 表示顺序发送，`false` 表示随机发送。
- `textSpam.sourceMode`：`single` 为单文本来源，`tabs` 为标签页聚合来源。

store 中也保留了兼容别名：

- 推荐使用：`infoByUser`、`danmakuLengthLimit`、`bilibiliLive`
- 兼容别名：`infoByuser`、`danmuLengthLimit`、`BilibiliLive`

## 4. 看功能时的“对照关系”

### 文本独轮车

- 视图：`src/components/TextView.vue`
- 表单逻辑：`src/composables/useTextSpamForm.ts`
- 标签页逻辑：`src/composables/useTextTabs.ts`
- 运行模块：`src/modules/spam/textSpamModule.ts`

### 表情独轮车

- 视图：`src/components/EmotionView.vue`
- 包/网格数据：`src/composables/useEmotionPackages.ts`
- 表单逻辑：`src/composables/useEmotionSpamForm.ts`
- 运行模块：`src/modules/spam/emotionSpamModule.ts`

### Crybaby 增强

- 视图：`src/components/CrybabyView.vue`
- 宿主输入框桥接与发送逻辑：`src/composables/useCrybabyView.ts`
- 工具栏注入与行为：`src/modules/settings/danmaku/danmakuActionsModule.ts`

## 5. 主题相关文件

- 主入口：`src/composables/useHostThemeSync.ts`
- 宿主信号桥：`src/composables/hostThemeSignalBridge.ts`
- 宿主表面补丁：`src/composables/hostThemeSurfaceBootstrap.ts`
- 状态模型说明：`docs/bilibili-live-theme-model.md`

## 6. 阅读建议

- 看字段时，优先看 `schema.ts` 的默认值和 sanitize 规则。
- 看 UI 行为时，优先从组件跳到对应 composable，不要先钻 modules。
- 看“为什么发送失败/没发车”，先看 `useSpamTaskRunner.ts` 和对应 module 的 `start*` 分支。
