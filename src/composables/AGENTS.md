# AGENTS.md

本文件仅补充 `src/composables/` 下与 B 站直播间深浅主题、宿主主题同步、浏览器主题联动有关的实现约束。

如果当前任务不涉及以下内容，仍以根目录 `AGENTS.md` 为主，不要把这里的专项规则泛化到其他 composable。

---

## 1. 适用范围

优先适用于以下类型的代码与改动：

- `useHostThemeSync.ts`
- 宿主 `bililiveThemeV2` 接口接线
- 浏览器 `matchMedia('(prefers-color-scheme: dark)')` 同步逻辑
- B 站实验室深色模式开关、侧边栏控制器、`lab-style` 相关兼容逻辑
- 为定位宿主主题时序问题而做的调试、探针、覆盖式验证

---

## 2. 主题同步实现原则

- 优先复用宿主现有主题 API、实验室开关、侧边栏控制器和宿主状态读取能力，不要直接写死宿主 DOM 状态。
- 不要直接篡改 `document.documentElement` 上的 `lab-style` 作为主同步手段；它最多只能作为观测信号，不应成为唯一事实来源。
- 浏览器主题同步与 HazelSpam 自身主题跟随是两件事，修改时不要把“宿主主题”和“插件主题”耦合成单一路径。
- 主题切换统一入口以 `ensureBiliTheme()` 为准：
  - 浏览器主题只提供目标输入，不是真值
  - 宿主题快照负责提供当前宿主事实
  - 最终 `effectiveTheme / effectiveMode` 才是对 HazelSpam 和外部信号发布的结果层
- 对宿主主题的程序化切换，必须与“用户/宿主外部改动”区分开，避免把我们自己的同步动作误判成手动解耦。
- 宿主页面启动存在延迟恢复链路时，优先考虑“延后接管、宽限期、二次确认”这类稳妥时序控制，不要用一次性抢写覆盖宿主状态。
- 浏览器主题同步在首屏恢复阶段必须保留一段“startup reconcile window”：
  - 宿主可能先按旧 `lab-style` 恢复完整 `dark`
  - 随后再额外补一次等值 `changeTheme('dark')`
  - 在这段窗口里，不要因为宿主重复上报当前主题就关闭 `syncHostThemeWithBrowser`
- 只有当宿主在非启动保护期、非程序化切换路径下，真实从当前已解析主题切到另一个与浏览器不一致的新主题时，才应视为“用户/宿主外部手动解耦”。
- 当前已验证的 B 站直播页存在“临时 Dark / 完整 Dark”两层深色状态；只要 `bililiveThemeV2.changeTheme('dark')` 生效，就可能出现“内容区很暗，但顶栏和背景图仍未进入完整 dark”的中间态，不要把它直接折叠成宿主真 `dark`。
- 当前已验证的 `blackboard` 顶层页和 `/blanc/...?...liteVersion=true` 页面属于“不可控宿主题真值，但可尝试 surface-patch”的上下文：
  - 前者没有 `bililiveThemeV2`、实验室开关或侧边栏控制器
  - 后者即使存在 `bililiveThemeV2`，也只有 partial 主题能力，不具备直播页那种完整 dark 切换链路
  - 这两类页面里，浏览器同步不应再尝试把 partial 宿主题当成可控真值
  - 但可以对明显的浅色宿主壳层做 `surface-patch`；只有 patch 在启动窗口内仍无法验证成功时，才回退到 UI-only
- 不要把 `Dark Reader` 是否跳过整页接管，当成宿主题真值来源；它可能会把“临时 Dark”误判为站点自带暗色。涉及兼容判断时，仍应优先以 `lab-style`、`#__css-map__`、`.link-navbar-more`、`.room-bg::after` 为准。
- `Dark Reader` 信号发布层必须和宿主题桥接层分离：
  - 宿主完整 dark 可沿用桥接快照的默认推导
  - 未来 `surface-patch` 这类“非宿主完整 dark、但页面已验证够暗”的场景，应通过显式 override 发布信号
  - `ui-only` 结果不应对 `Dark Reader` 宣称页面已完整 dark
- `surface-patch` 场景即使把暗色补丁、`color-scheme` 和显式 override 前移到 `document-start`，当前也只能保证提示稳定，不保证 `Dark Reader` 在 `blackboard` / `liteVersion` 冷启动时放弃首屏接管；如果后续要进一步兼容，应优先从扩展判定时序或上游 site fix 角度考虑，而不是继续在 `useHostThemeSync.ts` 里堆更多运行时兜底。
- 这套宿主题状态模型和 `Dark Reader` 交互结论，统一以 `docs/bilibili-live-theme-model.md` 为详细依据；后续改 `useHostThemeSync.ts` 前优先先看这份文档。

---

## 3. 调试与排查约定

- 先确认事实链路，再改逻辑。至少区分：
  - 宿主初始化主题
  - HazelSpam 首次接管
  - 宿主后续恢复或重申主题
  - 用户手动改主题
- 如果需要在线上页面验证宿主行为，优先使用 Chrome DevTools / CDP 做页面级观察，不要先把大量临时代码并入正式实现。
- 如需打点，优先使用短生命周期、可移除的 tracing；调试数据不要作为正式数据流。
- 调试时可以使用：
  - DevTools Overrides 覆盖宿主 HTML / 内联脚本
  - Snippet 注入观察代码
  - `sessionStorage` 暂存 trace
  - Chrome CDP 读取控制台、页面状态和覆盖结果
- 所有临时 tracing、覆盖脚本、`console` 调试输出，在问题确认并修复后应及时清理，不要长期留在正式代码中。

---

## 4. Chrome CDP 专项约束

- 如果用户已接入 Chrome CDP / MCP，可优先通过 CDP 读取当前页面状态、控制台输出、运行表达式和验证 trace。
- 需要复现宿主启动时序问题时，优先使用 CDP 配合页面刷新、脚本求值、网络/控制台观测，不要只凭静态代码猜测。
- 使用 Overrides 时，必须确保：
  - 只改最小必要片段
  - 明确标记为临时调试
  - 结束后恢复宿主原始内容
- 不要把 CDP 验证阶段写入的临时函数名、调试 key、trace 结构，直接固化进正式代码或公开 API。

---

## 5. 测试要求

涉及宿主主题同步改动时，优先补或改以下类型测试：

- 浏览器主题变化后同步宿主主题
- 程序化切换宿主主题时不应误触发解耦
- 宿主延迟恢复主题时不应误判为用户手动脱钩
- 宿主真实偏离浏览器主题时应正确解耦
- 使用实验室开关 / 侧边栏兜底路径时的行为一致性

如果某次修复依赖“时序”成立，测试里应显式控制定时器，不要依赖真实时间等待。
