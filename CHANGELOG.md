# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

### Added

### Changed

### Fixed

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
