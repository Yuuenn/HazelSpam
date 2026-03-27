# B 站直播页宿主题状态模型

本文档整理 `2026-03-27` 通过 Chrome MCP 在某个真实直播页上验证过的宿主题行为，用来避免后续重复排查。

验证环境：

- 浏览器：Chrome MCP
- 页面：B 站直播页
- 扩展干扰：`Dark Reader` 已关闭
- 主题切换手段：
  - 临时切换：`bililiveThemeV2.changeTheme(...)`
  - 持久切换：实验室 `深色模式` 开关 / 对应 VM

## 1. 三种状态

宿主主题至少要区分以下三种状态：

### 1.1 Light

特征：

- `html[lab-style] === ""`
- `#__css-map__ -> light.css`
- `body` 背景为 `rgb(241, 242, 243)`

典型表现：

- 顶部横栏 `.link-navbar-more` 为白底
- 房间背景图 `.room-bg::after` 是浅色渐变遮罩
- 头部信息和聊天面板为浅色

### 1.2 临时 Dark

定义：仅调用 `bililiveThemeV2.changeTheme('dark')`，不动实验室开关。

特征：

- `html[lab-style] === ""`
- `#__css-map__ -> dark.css`
- `body` 背景为 `rgb(10, 11, 12)`

典型表现：

- `head-info-section`、`chat-history-panel` 等依赖主题 token 的区域会变暗
- 顶部横栏 `.link-navbar-more` 仍然保持白底
- 房间背景图 `.room-bg` 仍使用同一张图片，且 `.room-bg::after` 仍是浅色渐变遮罩

结论：

- 这是“部分 dark”
- 不能把它当成 B 站宿主完整 dark

### 1.3 实验室真 Dark

定义：通过实验室 `深色模式` 开关或对应 VM 打开 dark。

特征：

- `html[lab-style] === "dark"`
- `#__css-map__ -> dark.css`
- `body` 背景为 `rgb(10, 11, 12)`

典型表现：

- 顶部横栏 `.link-navbar-more` 背景变为 `rgb(23, 24, 26)`
- 房间背景图 `.room-bg` 的图片 URL 不变，但 `.room-bg::after` 变为整层深色遮罩 `rgba(28, 32, 34, 0.85)`
- 头部信息和聊天面板同样为深色

结论：

- 这是 B 站宿主完整 dark

## 2. 已验证的优先级

### 2.1 首屏 SSR 优先于 cookie

刷新时，服务端首屏 HTML 会直接返回：

- `html[lab-style]`
- `#__css-map__` 当前指向的 `light.css` / `dark.css`

这两个信号优先级高于 `theme_style` cookie。

已验证现象：

- 当实验室 `dark` 仍为 `on` 时，即使 cookie 里还是 `theme_style=light`，服务端首屏依然会返回：
  - `html lab-style="dark"`
  - `#__css-map__ -> dark.css`
- 当实验室 `dark` 关掉后，再刷新，服务端首屏会返回：
  - `html lab-style=""`
  - `#__css-map__ -> light.css`

### 2.2 页面启动时按 `lab-style` 初始化主题

直播页启动脚本会按 `document.documentElement.getAttribute('lab-style')` 调用：

- `bililiveThemeV2.initThemeWithCSR('dark' | 'light')`

所以刷新后的宿主题会重新回到 `lab-style` 对应状态。

### 2.3 `bililiveThemeV2.changeTheme()` 只是当前页临时切换

已验证行为：

- 会切换 `#__css-map__`
- 会切换当前页大部分 token 驱动区域
- 不会同步实验室 `dark` 状态
- 不会把 `html[lab-style]` 改成 `dark`

因此它不能代表“刷新后仍成立的宿主持久状态”。

### 2.4 跨会话浏览器同步时，宿主会先重放旧持久态

已在真实页验证过下面这条链路：

1. 浏览器为 `dark`
2. `HazelSpam` 的“直播间深浅主题与浏览器同步”保持开启
3. 宿主被切到完整 `dark`
4. 关闭页面
5. 将浏览器改为 `light`
6. 重新打开同一直播页

此时宿主不会一开始就直接进入 `light`，而是会先按旧持久态重放一次 `dark`：

- 首屏 SSR 仍返回 `html[lab-style="dark"]`
- `bililiveThemeV2` 初始 `getTheme()` 也是 `dark`
- 宿主启动后还可能再补一次等值 `changeTheme('dark')`

这说明：

- “浏览器现在是 `light`” 和 “宿主首屏先恢复成 `dark`” 可以同时成立
- 宿主这次补发的等值 `changeTheme('dark')` 不是用户手动改主题，只是启动期重申当前状态

对同步逻辑的直接约束：

- 首屏浏览器同步必须保留一段启动对齐窗口，不能在宿主第一次报 `dark` 时就立刻认为用户手动解耦
- 只有当宿主在启动保护期之外，真实切到一个新的、且与浏览器不一致的主题时，才应关闭同步
- 正确行为应是：先允许宿主完成自己的 `dark` 恢复链路，再由实验室 `dark` 开关 / VM 把宿主完整切回 `light`

## 3. 以后判断宿主题时怎么想

### 3.1 判断“当前页现在长什么样”

优先看：

- `html[lab-style]`
- `#__css-map__` 当前 href
- 关键区域是否命中 `lab-style` 专属规则
  - 顶栏：`.link-navbar-more`
  - 房间背景：`.room-bg::after`

### 3.2 判断“刷新后会回到什么样”

优先看：

- 实验室 `dark` 开关真实状态
- `html[lab-style]` 的 SSR 返回值

不要只看：

- `theme_style` cookie
- 单次 `bililiveThemeV2.changeTheme(...)` 的结果

## 4. 对 HazelSpam 的直接意义

### 4.1 主题检测

如果只是拿 `bililiveThemeV2.getTheme()` 或 cookie，当宿主处于“临时 dark / 临时 light”时会误判。

### 4.2 主题同步

如果目标是“刷新后仍保持一致”，必须优先走实验室 `dark` 开关或对应 VM。

如果是“跨会话后按浏览器主题纠正宿主”，还必须额外处理启动竞态：

- 宿主可能先完整恢复成旧持久态
- 随后再补一次等值 `changeTheme(...)`
- 这段时间不能过早把“浏览器同步”判定为失效，更不能把开关自动写回 `false`

### 4.3 `blackboard` / `liteVersion` 页面要当成 surface-patch 主题上下文

`2026-03-27` 额外在某个真实 `blackboard` 专题页上做了专题页验证。

已验证结论：

- `blackboard` 顶层页没有 `bililiveThemeV2`，也没有侧边栏控制器或实验室 `dark` 开关
- 顶层页虽然带有通用的 `#__css-map__ -> short/bili-theme/light.css`，但这类信号不足以代表可控宿主题
- 顶层页可以直接把 `#__css-map__` 在 `short/bili-theme/light.css` 和 `short/bili-theme/dark.css` 之间切换；再配合 `color-scheme`，顶部栏、搜索和页脚会走 B 站自己的原生暗色样式
- 顶层页的“活动主视觉”本身不应被整体重画；真正需要补的是 B 站通用壳层，如顶部栏、搜索和页脚
- 内嵌的 `/blanc/...?...liteVersion=true` 房间 iframe 虽然存在 `bililiveThemeV2`，但没有实验室控制器，`changeTheme()` 只会切 `cssMap`，不会形成直播页那种“完整 dark”
- `liteVersion` iframe 同样可以直接在 `laputa-css/light.css` 和 `laputa-css/dark.css` 之间切换；关键壳层会随原生样式一并进入 dark
- `liteVersion` iframe 最明显的浅色宿主壳层包括：
  - `.head-info-section`
  - `.gift-control-panel`
  - `.chat-history-panel`
  - `.chat-input-ctnr`
- 这两类页面当前都不具备“宿主完整 dark”切换链路，但已经可以优先通过“原生 `cssMap` 切换 + `color-scheme`”进入稳定暗色；只有原生链路不成立时，才应回退到自定义 `surface-patch`

对实现的直接约束：

- `blackboard` 顶层页和 `/blanc/...?...liteVersion=true` 页面，都应视为“不可控宿主题真值上下文”
- 这两类页面里，不要再尝试通过 `bililiveThemeV2` 推断或切换宿主完整主题
- 浏览器同步应优先尝试 `surface-patch`：
  - 先切宿主自己的 `#__css-map__` 到 `dark.css` / `light.css`
  - 同步 `color-scheme`
  - 只有原生样式链路仍不足时，才补自定义壳层样式
- 只有当 `surface-patch` 在启动窗口内仍无法验证成功时，才回退到 UI-only
- 这两类页面里，即使宿主回放 `changeTheme()`，也不应把它当成用户手动改主题，更不应因此关闭 `syncHostThemeWithBrowser`

### 4.4 不要再重复验证的点

以下结论已验证，无需反复重测：

- “`dark.css` 已挂载” 不等于“宿主完整 dark”
- 顶栏是否真的进入 dark，看 `.link-navbar-more`
- 背景图是否真的进入 dark，看 `.room-bg::after`
- `lab-style=dark` 才是宿主完整 dark 的关键分界线

## 5. 与 Dark Reader 的交互

本文档里的宿主状态模型已额外在 `2026-03-27` 用真实页面做过一轮 `Dark Reader` 交叉验证，验证时 `HazelSpam` 未挂载。

### 5.1 已观察到的 Dark Reader 行为

在“临时 Dark”状态下，也就是：

- `html[lab-style] === ""`
- `#__css-map__ -> dark.css`
- `body` 已经是深色
- 顶栏和背景图遮罩仍未进入完整 dark

`Dark Reader` 仍可能把当前页面识别成“站点自身已经带暗色”，从而不再做整页级样式接管。

当次观测到的现象：

- 页面里存在 `html[data-darkreader-proxy-injected="true"]`
- 页面里存在一批 `data-darkreader-inline-*` 标记
- 但没有整页 `darkreader` stylesheet，也没有根级 `--darkreader-*` 变量

### 5.2 为什么会出现“识别成暗色但仍不完整”

当前页面没有命中这些强显式信号：

- 没有 `meta[name="color-scheme"]`
- 没有 `html.dark` / `body.dark`
- 没有 `data-theme="dark"`
- `prefers-color-scheme: dark === false`
- `html[lab-style] !== "dark"`

但在“临时 Dark”状态下，视口里已经有大面积深背景：

- 播放器区域
- 头部信息区域
- 聊天区域
- 底部控制区域

实际采样时，视口网格里大多数采样点都落在深色背景上，只有顶部横栏一带仍是浅色。因此 `Dark Reader` 很可能是根据当前渲染结果的启发式，把页面判成了“宿主已自带暗色”，而不是依据 `lab-style` 这类宿主真值信号。

### 5.3 对 HazelSpam 的约束

- 不要把 `Dark Reader` 是否跳过整页接管，当成宿主是否“完整 dark”的事实来源
- `Dark Reader` 的判断更接近“当前页看起来是否已经够暗”，不是“B 站宿主是否进入完整 dark”
- 后续若修主题同步或兼容 `Dark Reader`，仍应以 `lab-style`、`#__css-map__`、`.link-navbar-more`、`.room-bg::after` 作为宿主状态判断依据

### 5.4 当前实现建议的分层

为了避免再次把“浏览器目标、宿主事实、对外信号”混成一条链，后续主题实现应保持三层分离：

- 输入层：浏览器 `prefers-color-scheme` 只表示目标主题，不表示页面已经切换完成
- 执行层：统一通过 `ensureBiliTheme()` 一类入口落地主题切换；当前可返回 `host-complete`、`ui-only`，后续可扩到 `surface-patch`
- 发布层：只有当页面最终结果已验证后，才向 `Dark Reader` 或其他观察者发布暗色信号

当前建议的发布策略：

- 宿主完整 dark：可使用宿主题桥接快照推导出的默认信号
- 非宿主完整 dark，但页面已被补成足够稳定的暗色表面：通过显式 override 发布 `Dark Reader` 信号
- 仅 HazelSpam 自己切换、宿主页面未补全的 `ui-only` 场景：不要对 `Dark Reader` 宣称页面已完整 dark

### 5.5 `surface-patch` 场景下当前对 `Dark Reader` 的更优解

`2026-03-27` 继续在真实 `blackboard` 专题页和 `/blanc/...?...liteVersion=true` iframe 上做了冷启动验证后，确认当前更有效的方案不是“继续手写补丁”，而是：

- 在 `document-start` 就按浏览器目标切宿主自己的 `#__css-map__`
- 同步 `color-scheme`
- 在页面结果验证通过后，再发布显式 override

这轮真页结果是：

- 普通直播页的“宿主完整 dark”仍然可以稳定让 `Dark Reader` 不接管
- `blackboard` 顶层页切到 `short/bili-theme/dark.css` 后，顶部栏、搜索和页脚会走 B 站原生暗色样式
- `liteVersion` iframe 切到 `laputa-css/dark.css` 后，头部信息、礼物区、聊天区和输入区也会走宿主自己的暗色样式
- 在这套原生 `dark.css + color-scheme` 链路下，`Dark Reader` 在两层页面上都不再注入 `darkreader` stylesheet

当前更接近事实的结论是：

- `blackboard` / `liteVersion` 的最佳路径不是继续扩大自定义 `surface-patch`
- 而是优先复用宿主自己的 `dark.css`，把自定义补丁收敛成兜底
- 只有当原生 `cssMap` 链路无法成立时，才继续用自定义样式补壳并发布 override
