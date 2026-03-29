# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

### Added

### Changed

### Fixed

## [1.2.0] - 2026-03-29

### Added

- 新增 `CrybabyView` 增强页面入口与 `Crybaby 弹幕发送框`，支持激活 Crybaby 自动装填、增加重复弹幕、清空内容、插入表情与快速发送。
- 新增工具栏图标常量收口文件 `src/constants/danmakuActionIcons.ts`，统一 crybaby / repeat / clear 图标来源。
- 新增 Crybaby 模式界面预览图并补充 README 功能说明。

### Changed

- 调整 Crybaby 页面文案、按钮语义与交互映射，区分 inline 场景的“弹幕 +1”和输入框场景的“增加重复弹幕”。
- 调整 crybaby 图标为线条心形方案并统一按钮视觉规范，适配明暗主题与激活态表现。
- 更新 `README.md` 与 `CONTRIBUTING.md`，补充 Crybaby 模式说明与发布后同步 `dev` 约定。

### Fixed

- 修复 Crybaby 页面在受限宽度下的布局与自适应异常。
- 修复 Crybaby 页面与直播间工具栏在开启状态、注入状态和 toast 反馈上的不一致。
- 修复输入框字数上限在结构化艾特场景下未对齐直播间原生限制的问题。
- 修复发送锁定态与禁用态操作缺少预期提示的问题。

## [1.1.1] - 2026-03-28

### Added

### Changed

### Fixed

- 修复正式发行版中 crybaby 触发 `Toast` 时外层灰框先于消息卡出现的问题，恢复半透明模糊的提示表现。
- 修复设置页关于区暗色装饰规则的作用域泄漏，避免 `.hazelspam-dark` 浮层节点误吃背景和阴影。
- 修复 `Toast` 关闭按钮在正式发行版中的定位与尺寸异常。

## [1.1.0] - 2026-03-28

### Added

- 新增 crybaby 弹幕核心逻辑，并接入复制入框发送流程。
- 新增表情包图片预热与面板状态保留，减少表情视图切换时的等待与抖动。

### Changed

- 调整工具栏图标与 inline 挂载方式，统一相关 UI 接线。
- 重整 Toast 类型分工、`warn` 语义与文案表现，收口提醒反馈样式。
- 收口宿主主题引导与构建产物命名。

### Fixed

- 修复表情车并发发送时的重叠请求问题。
- 修复房间上下文缺失时的降级处理，避免用户信息链路异常。
- 修复 `liteVersion` 页面未按能力优先切入完整暗色的问题。
- 修复 `+1` 弹幕的结构化艾特发送。
- 修复 TOML 导入成功后缺少提示的问题。
- 修复 crybaby 在安全标点、空格差异化和输入框复读场景下的发送行为。

## [1.0.2] - 2026-03-21

### Added

### Changed

- 收口面板响应式布局规则，新增共享的容器驱动布局原语，并统一 `TextView`、`EmotionView`、`SettingView` 的窄宽处理方式。
- 更新 HazelSpam 图标资源与 userscript 图标接线，统一使用 `Icon.svg` 生成脚本图标。
- 根目录 `AGENTS.md` 补充面板响应式、浮层 tooltip 与 Chrome MCP 排查约定。

### Fixed

- 修复多处按钮与交互控件的焦点描边裁切问题。
- 修复设置页与响应式堆叠态下的 tooltip 宽度异常与定位退化问题。
- 修复设置页在正常宽度下的主区高度语义不一致问题，并暂时移除设置页中的调试模块展示以便后续排查。

## [1.0.1] - 2026-03-16

### Added

- 新增 `src/composables/AGENTS.md`，约束 B 站深色模式、宿主主题同步与 Chrome CDP 排查流程。

### Changed

- 控制台 `Logger` 前缀颜色回归 HazelSpam 主题 token，并为 `warn`、`error` 增加语义化颜色。
- 根目录 `AGENTS.md` 补充 Chrome DevTools Protocol / Chrome MCP 的动态排查约定。
- userscript 图标改为从 `Logo.svg` 动态生成 data URL。

### Fixed

- 修复“直播间深浅主题与浏览器同步”会被宿主延迟恢复主题误判为手动解耦的问题。
- 修复 `SettingView` 中 PrimeVue `SelectButton` 因缺少 `optionLabel` 导致的标签类型警告。
