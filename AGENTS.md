# AGENTS.md

## 1. 项目概览

本项目是一个运行在 B 站直播页面中的 Tampermonkey 用户脚本。

命名约定以当前实现为准：

- 产品名：`HazelSpam`
- 仓库名：`HazelSpam`
- 代码里的变量、函数、配置键：`hazelSpam`
- 技术标识：`hazelspam`

这里的“技术标识”包括 CSS namespace、DOM id、class 前缀、调试全局 key 前缀、导出类型前缀等。

核心目标：

- 在直播间页面内提供稳定、可控的脚本面板与交互
- 以模块化方式组织文字车、表情车、弹幕操作和设置能力
- 保持配置结构可预测、可测试、可维护
- 在不破坏宿主页面体验的前提下持续迭代 UI 和功能

这是一个“用户脚本 + 宿主页面注入 + B 站 API + 本地 GM 存储”项目，不要把它当成普通 SPA 来设计。

---

## 2. 技术栈与运行环境

核心栈：

- TypeScript（严格模式）
- Vue 3
- Pinia
- Vite
- vite-plugin-monkey
- PrimeVue

常用依赖：

- axios
- lodash
- mitt
- primeicons

测试与工具：

- ESLint
- Prettier
- Vitest
- vue-tsc

运行环境约束：

- 脚本通过 Tampermonkey 注入到 `*://live.bilibili.com/*`
- 持久化依赖 `GM_getValue` / `GM_setValue`
- 构建结果是 userscript，而不是传统站点产物
- 网络请求主要面向 B 站 API、EdgeOne 发行源和构建依赖 CDN

发布环境约束：

- 正式发行源为 EdgeOne Pages 固定域名 `https://hazel.idols.ltd`
- `latest` 发行清单为 `https://hazel.idols.ltd/latest.json`
- GitHub Release 仅保留同版本构建产物，作为备份下载源，不再作为主更新源

除非确有必要，不要把这个项目按普通站点、SSR 应用或后端服务来设计。

---

## 3. 项目结构

根目录重点：

- `src/`：应用源码
- `tests/`：Vitest 测试
- `scripts/`：构建后处理脚本，例如压缩 userscript
- `docs/`：迁移说明和补充文档
- `dist/`：构建产物
- `images/`：README 或文档配图

`src/` 下的职责约定：

- `components/`：面板、对话框、功能视图组件和小型纯展示子组件
- `composables/`：页面级界面逻辑、宿主交互逻辑、主题同步、注入逻辑、表单编排、视图业务状态
- `stores/`：Pinia 状态，例如 B 站上下文、模块配置、UI 状态
- `modules/`：运行时功能模块，通常继承 `BaseModule`
- `utils/`：B 站 API、DOM、存储、UI 工具、日志等基础设施
- `theme/`：PrimeVue 主题、设计 token、全局样式规则
- `constants/`：品牌常量、调试常量
- `types/`：B 站 API、Tampermonkey、全局类型声明
- `assets/`：SVG 等静态资源

模块加载约定：

- 启动逻辑从 `src/main.ts` 进入
- 应用挂载前需确保只注入一次根节点
- 运行模块通过 `src/modules/index.ts` 和各子目录 `index.ts` 统一注册
- 新模块应遵守现有注册和 store 驱动方式，不要绕过模块体系单独拼接副作用

---

## 4. 架构规则

实现代码时遵守以下边界：

- Vue 组件负责界面呈现与交互编排，尽量保持“薄组件”
- 页面级业务逻辑优先下沉到 `composables/`
- 与 B 站页面 DOM、按钮注入、宿主主题同步相关的逻辑优先放到 `composables/` 或 `utils/dom`
- 与 API 请求相关的逻辑优先放到 `utils/bili`
- 与持久化、导入导出、配置清洗相关的逻辑放到 `utils/storage`
- 与循环发送、启动停止、监听 emitter 等运行时行为相关的逻辑放到 `modules/`
- 全局共享状态通过 Pinia 管理，避免跨层级维护“影子状态”

当前拆分方向以现状为准：

- `App.vue` 应尽量只保留壳层接线、主题接线和挂载点
- `TextView.vue` 应尽量只保留文本视图接线，tab 管理和发送表单逻辑放入 composable
- `EmotionView.vue` 应尽量只保留表情视图接线，包列表、选择状态、发送表单逻辑放入 composable 或子组件
- 业务按钮优先通过 `src/components/AppButton.vue` 接入，不要在业务组件里继续把 PrimeVue `Button` 当成主要入口
- 业务弹窗优先通过 `src/components/AppDialog.vue` 接入，避免在多个组件里重复维护 `Dialog` 的主题 class、关闭按钮和尺寸规则
- PrimeVue 内部自动生成的按钮入口，例如 `Dialog`、`Toast`、`FileUpload` 的内置按钮，优先通过 `closeButtonProps`、`chooseButtonProps`、`pt` 等方式接入现有 HazelSpam 按钮语义，而不是另起一套样式分支
- 当同一 PrimeVue 组件在多个业务组件里重复维护 `pt`、主题 class、按钮 props、尺寸或关闭按钮逻辑时，优先抽一层薄包装组件；包装组件只负责语义、主题接线和默认 props，不承载业务状态或业务流程

如果一个改动同时涉及 UI、运行模块、存储结构，优先保持这三层分离，而不是把逻辑重新塞回单个 `.vue` 文件。

---

## 5. 命名规范

统一按以下规则命名：

- 变量、函数、store 字段、配置键：`camelCase`
- 组件、类、类型、接口：`PascalCase`
- 常量值：`UPPER_SNAKE_CASE`
- Vue 组件文件：`PascalCase.vue`
- composable / util 文件：`camelCase.ts`

品牌和技术标识按以下规则使用：

- `HazelSpam`：产品名、仓库名、用户可见标题
- `灰宝独轮车`：仅用于 userscript 中文显示名和 README 标题附近的对外昵称，不替代正式产品名 `HazelSpam`
- `hazelSpam`：代码标识符
- `hazelspam`：CSS namespace、DOM id、class 前缀、导出类型前缀、调试 key 前缀等技术字符串

外部 API 的原始字段不要直接硬改，放在适配层里映射。

---

## 6. 用户脚本与宿主页面约束

这是本项目最重要的特殊规则：

- 保持单次挂载，不要重复插入根节点、按钮或全局样式
- 修改 DOM 注入逻辑时，必须考虑 B 站页面结构可能变化
- 修改事件监听、定时器、轮询逻辑时，必须处理清理和重复注册
- 修改 userscript 元信息时，务必谨慎对待 `match`、`connect`、`downloadURL`、`updateURL`、`homepageURL` 等字段
- 修改 `vite.config.ts` 中 `vite-plugin-monkey` 配置时，不要破坏外部 CDN 映射和构建入口
- 宿主主题同步优先复用宿主现有 API、侧边栏控制器和实验室开关，不要直接硬改宿主 `lab-style` token 或伪造开关视觉状态
- 任何新的宿主页面选择器、按钮插入点、主题同步规则，都要尽量复用现有工具和常量

涉及宿主页面在线排查时：

- 如果用户已经提供可用的 Chrome DevTools Protocol / Chrome MCP 连接，应优先用它读取真实页面状态、控制台输出、运行表达式和验证宿主时序
- 使用 DevTools Overrides、Snippet 或控制台注入时，只做最小必要改动，并在修复确认后及时恢复或清理
- 不要把临时调试 trace、覆盖脚本或控制台探针长期留在正式代码里

优先做“在当前架构内稳妥增强”，避免用一次性 hack 解决宿主页面兼容问题。

---

## 7. 存储、导入导出与迁移

存储层当前采用“单一入口”：

- 默认值、clone、normalize、sanitize 放在 `src/utils/storage/schema.ts`
- 导入 payload 识别放在 `src/utils/storage/importPayload.ts`
- 组件层不要再自行维护 merge、normalize 或旧字段兼容逻辑

当前兼容策略：

- 运行时和导入流程默认只接受当前配置结构
- 不再自动兼容旧版导出文件
- 旧文件迁移说明统一写在 `docs/config-migration.md`
- 如果修改了配置结构、导入导出格式或失败提示，同时更新文档和测试

不要在业务层静默接受旧结构，除非用户明确要求恢复兼容，并且已经同步补上测试。

---

## 8. 样式与设计约定

Vue / 样式规则：

- 保持与现有 PrimeVue 和 token 体系一致
- 新样式优先复用 `theme/` 中的设计 token，不要随手写魔法数字
- 新增或修改组件样式时，颜色、字号、间距、圆角、阴影等设计属性应优先显式接入现有 design token 或 PrimeVue token 映射，不要长期依赖组件默认样式
- 修改 UI 时注意浅色/深色主题与 B 站跟随主题能力
- 不要为了小改动引入新的状态管理方式
- token 作用域按两层处理：`foundation tokens` 可放在 `:root` 供 PrimeVue preset 或兼容 token 使用；`semantic app tokens` 应优先作用在 HazelSpam 根容器、浮层容器和 Teleport 容器，避免污染宿主页面；新增浮层时同步检查 token scope
- 按钮语义按两层拆分：`appStyle` 负责形状与布局语义，`tone` 负责颜色语义；业务层优先使用 `tone`，不要继续用 `severity + outlined` 手工拼出主次、危险、成功按钮
- `src/theme/buttonRules.css` 优先基于 `data-hazelspam-button-style` 和 `data-hazelspam-button-tone` 写规则，不要把 `.p-button` 当成业务语义入口类
- 颜色语义以 `src/theme/colorTokens.ts` 为真源；`success`、`danger`、`brand` 等一等语义色优先走 token，不要在组件里散落硬编码；其中 `danger` 默认态使用 `#D83B44`
- 激活、选中、当前页等 UI 状态，优先使用 `aria-current`、`aria-pressed`、`aria-selected` 或 `data-*` 属性表达；不要优先新增纯视觉状态 class，除非现有语义属性无法准确表达
- 不要把 `.p-*` 类当成业务语义入口；如需定制 PrimeVue，优先通过包装组件、`pt`、组件 props、HazelSpam 自有 class 或 `data-*` 属性接入；仅在需要命中 PrimeVue 内部部件时，才使用 `.p-button-label`、`.p-togglebutton-content` 这类内部节点选择器

样式复用约定：

- 全局品牌命名空间使用 `hazelspam-*`
- 可复用交互样式优先使用 `bl-wheel-*`
- 胶囊按钮、排序按钮、列表项、宫格卡片等通用样式应优先收口到 `src/theme/buttonRules.css`
- 不要在多个组件里重复维护同一套按钮或列表项样式

如果某类样式已经在共享规则里存在，优先复用，不要在单个组件里再造一套近似实现。

---

## 9. 编码规范

通用规则：

- 使用 TypeScript 严格类型，避免 `any`
- 优先复用 `@/` 别名下已有工具和类型
- 优先使用 `<script setup lang="ts">`
- 保持函数短小、可测试、职责单一
- 倾向早返回，避免深层嵌套
- 命名清晰，避免含糊缩写

模块规则：

- 新运行模块优先继承 `BaseModule`
- 通过 store 配置和 emitter 驱动模块，而不是在模块外部保存隐式状态
- 任何 `setInterval` / `setTimeout` 都要有明确的停止与清理路径

注释规则：

- 仅在逻辑不直观时添加简短注释
- 不写显而易见的解释型注释

---

## 10. 依赖规则

修改代码时按以下顺序决策：

1. 先复用现有工具、store、composable、模块或类型
2. 再考虑用原生能力或轻量实现
3. 最后才考虑新增依赖

新增依赖前必须确认：

- 现有依赖是否已经能解决问题
- 是否会增加 userscript 体积、构建复杂度或运行时风险
- 是否会影响 `vite-plugin-monkey` 的外链或打包方式

没有充分理由时，不要新增库。

---

## 11. 开发工作流

包管理器：

- 使用 `pnpm`

常用命令：

```sh
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm preview
pnpm format
```

补充说明：

- `pnpm build` 会先执行类型检查，再进行 Vite 构建，并依次运行 `scripts/minifyUserscript.js`、`scripts/generateLatestReleaseManifest.js`
- `pnpm format` 当前只格式化 `src/`
- 提交前至少关注 `lint`、`test`、`typecheck`
- 涉及宿主页面时序、主题同步、注入点失效等问题时，如本地可用，优先结合 Chrome CDP / DevTools 做动态验证，不要只靠静态阅读推断
- 仓库文档要求使用约定式提交，并将 PR 合并到 `dev` 分支
- 当用户要求生成 commit summary 或 commit message 时，优先使用 `type(scope): subject` 格式
- `type` 常用 `feat`、`fix`、`refactor`、`docs`、`test`、`chore`
- `scope` 应尽量对应本次改动的核心范围，例如 `theme`、`ui`、`storage`、`module`
- `subject` 使用简洁中文，先概括结果，不写空泛描述
- 如用户需要补充描述，使用中文项目符号，优先说明主要改动、影响范围和验证结果
- 如用户需要补充描述，使用 Markdown 格式，并用 `-` 作为每行列表前缀
- `CHANGELOG.md` 由 agent 根据提交记录自动归类生成；优先按 commit message 前缀映射：`feat -> Added`、`fix -> Fixed`、`refactor/docs/chore/test -> Changed`，其余按内容判断
- 发版时由 agent 将 `Unreleased` 改为对应版本号并写入发布日期，然后补回新的空 `Unreleased`
- 发版前必须先将 `package.json` 的 `version` 更新到目标版本，并提交到仓库；CI 会校验 tag 与 `package.json.version` 完全一致，不再自动修正
- 一句命令发版：`git tag vX.Y.Z && git push origin vX.Y.Z`，触发 `.github/workflows/edgeone-release.yml`

---

## 12. 测试规则

当改动影响以下内容时，应补充或更新 Vitest 测试：

- 配置结构与清洗逻辑
- 导入导出 payload 解析
- 模块运行行为，尤其是文字车、表情车、启动停止和随机/顺序发送逻辑
- 容易回归的宿主页面兼容逻辑

当前优先关注的测试入口：

- `tests/schema.test.ts`
- `tests/importPayload.test.ts`
- 文字车、表情车对应模块测试

测试要求：

- 保持确定性，避免真实网络调用
- 涉及定时器时优先考虑可控的测试方式
- 针对 schema / import 这类边界输入，优先覆盖非法值、缺省值和当前合法结构
- 修 bug 时优先先补一个能复现问题的测试
- 如果改动涉及更新检查、发行清单、下载地址、userscript 元信息或发布工作流，至少补一组围绕 `latest.json` 或版本匹配规则的自动化测试
- 如果改动涉及 `src/theme/colorTokens.ts`、`src/theme/buttonRules.css`、`src/theme/interactionRules.css`、PrimeVue preset、主题同步或组件主题接线，除自动化校验外，还应做浅色/深色人工验收；至少检查 `TextView`、`EmotionView`、`SettingView`、`Dialog`、`Toast` 在 `default`、`hover`、`active`、`disabled`、`focus`、`selected` 状态下的表现

---

## 13. 性能与可靠性

优先关注：

- 避免重复注入 UI、按钮和全局样式
- 避免重复注册事件监听
- 避免创建无法回收的 interval / timeout
- 避免频繁、无保护地调用 B 站接口
- 避免在页面滚动、布局或主题同步上做高成本重复计算

实现上优先：

- 复用已有状态和缓存
- 对宿主页面读取结果做必要判空
- 在 API 异常、未登录、房间信息缺失时安全降级

---

## 14. 安全与数据处理

始终遵守：

- 所有外部输入都要校验和清洗，尤其是导入配置、GM 存储内容和 API 响应
- 不要信任旧版配置字段或未知 payload 结构
- 不要硬编码密钥、cookie 或敏感凭据
- 不要把调试输出当成正式数据流

特别注意：

- 本项目会读取 B 站登录态和用户相关信息，因此更要避免多余的数据暴露
- 修改网络请求时，只连接业务所需域名
- EdgeOne 发行清单 `latest.json` 也属于外部输入，更新检查逻辑必须校验字段并提供明确失败提示
- 修改导入导出功能时，优先保证“格式明确、失败可预期”

---

## 15. 代理行为规则

未来代理在这个仓库里工作时，应默认遵守：

1. 先读相关文件，再改代码，不要凭模板假设项目结构。
2. 优先修改现有文件，避免无意义地新建大块抽象。
3. 保持改动最小化，不主动做无关重构。
4. 不要回退用户未要求撤销的现有修改。
5. 新功能尽量接入现有模块、store、composable 和 storage 流程。
6. 修改公共配置结构时，同时更新对应测试和文档。
7. 修改用户可见行为时，优先保持默认值、文案和交互的一致性。
8. 如果发现当前工作区有未提交改动，应避免覆盖它们。

---

## 16. 需要先交给用户决策的情况

遇到以下情况，不要直接拍板，先向用户确认：

- 要改变存储 schema、导入导出格式或旧配置迁移策略
- 要修改 userscript 元信息、匹配域名、连接域名或发布地址
- 要新增第三方依赖或外部服务
- 要明显改变默认发送频率、默认文案、默认行为或主要交互流程
- 要做大规模 UI 改版、模块拆分或目录重组
- 遇到多个实现路径且会影响兼容性、可维护性或用户体验

如果只是小修复、低风险重构或现有模式内的增量功能，可直接实施并在结果里说明假设。

---

## 17. 沟通风格

说明改动时：

- 使用简洁中文
- 先说结果，再说原因
- 明确指出风险、假设和验证情况
- 中文文案中夹英文品牌名、产品名、库名或功能名时，按中英文混排习惯在英文前后保留空格，例如 `HazelSpam 设置`、`Dark Reader 扩展`
- 不写泛泛而谈的模板化总结

重点提供可执行、可判断的信息。
