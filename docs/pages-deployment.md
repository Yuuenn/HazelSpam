# Pages 部署与域名迁移

HazelSpam 是 Tampermonkey 用户脚本。Pages 只托管 `dist/` 中的静态文件，不运行 Vue 网站、SSR 或服务端函数。

| 用途 | 平台 | 自定义域名 |
| --- | --- | --- |
| 正式主源 | 阿里云 ESA Pages（函数和 Pages） | `hazel.idol.ltd` |
| 镜像 | Cloudflare Pages | `hazel.idol.su` |
| 备份下载 | GitHub Release | 仓库 Releases 页面 |

## 阿里云表单逐项填写

在 ESA 的「函数和 Pages」导入 `Yuuenn/HazelSpam`。以下设置用于迁移代码已进入 `main` 后的生产部署。

| 配置项 | 填写内容 |
| --- | --- |
| 项目名称 | `hazelspam`（若被占用，改用可用名称，不影响自定义域名） |
| 生产分支 | `main` |
| 非生产分支构建 | 关闭 |
| 框架预设（如有） | 无 / Other |
| 安装命令 | `npx --yes pnpm@10.30.3 install --frozen-lockfile` |
| 构建命令 | `npx --yes pnpm@10.30.3 build` |
| 根目录 | 留空，表示仓库根目录；若必填则填 `./` |
| 静态资源目录 | `dist` |
| 函数文件路径 | 留空 |
| Node.js 版本 | `22.x`（实际版本需至少 22.13，满足当前 ESLint 等依赖） |
| 函数变量 | 不添加，键和值都留空 |
| 加密存储 | 不需要 |

使用锁定的 pnpm 版本，避免构建机预装版本变化。不要填写 `src/main.ts` 作为函数入口；它是用户脚本的浏览器构建入口。不要将静态资源目录填成 `src`、`public` 或仓库根目录。

主源无需设置 `HAZELSPAM_RELEASE_ORIGIN`，默认就是 `https://hazel.idol.ltd`。若迁移旧项目设置，删除旧的域名变量或改成该值。构建变量和函数运行时变量是两回事，本项目没有函数运行时变量。

## Cloudflare Pages

在 Workers & Pages 中创建 **Pages** 项目，连接同一个 GitHub 仓库。

| 配置项 | 填写内容 |
| --- | --- |
| 项目名称 | `hazelspam`，或可用的其他名称 |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npx --yes pnpm@10.30.3 install --frozen-lockfile && npx --yes pnpm@10.30.3 build` |
| Build output directory | `dist` |
| Root directory | 留空 |
| Preview branch deployments | `None` / 关闭 |
| Functions | 不配置 |

设置以下**构建环境变量**，应用于 Production；若以后启用预览，也将同样的变量配置到 Preview。

| 键 | 值 | 是否为密钥 |
| --- | --- | --- |
| `NODE_VERSION` | `22` | 否 |
| `PNPM_VERSION` | `10.30.3` | 否 |
| `SKIP_DEPENDENCY_INSTALL` | `1` | 否 |
| `HAZELSPAM_RELEASE_ORIGIN` | `https://hazel.idol.su` | 否 |

`SKIP_DEPENDENCY_INSTALL` 关闭平台自动安装，依赖安装由上述构建命令执行。镜像域名变量同时控制 userscript 的 `@downloadURL` / `@updateURL` 和 `latest.json` 下载链接，不能只改其中一个。域名值不要加尾部 `/`。

这套 Git 集成不需要阿里云 AccessKey、Cloudflare API Token 或 Deploy Hook secret。

## 绑定域名与 DNS

1. 先等待两个项目构建成功，在各自控制台的自定义域名设置中分别添加 `hazel.idol.ltd` 和 `hazel.idol.su`。
2. 阿里云：按控制台要求完成域名验证，复制实际提供的 CNAME 目标和必要的验证记录，不要猜测目标域名。
3. Cloudflare：必须先在 Pages 项目的 Custom domains 中关联域名，再添加 DNS；仅手工添加 CNAME 不足以完成关联。若 `idol.su` 使用外部 DNS，也可用子域名 CNAME，无需为此迁移整个主域名的 NS。
4. 在对应 DNS 服务商添加下表记录。若同名已有冲突记录，先核实用途，再替换为新项目目标。
5. 等待两个平台的域名状态和 HTTPS 证书均显示正常，再验收完整下载地址。

| DNS 区域 | 记录类型 | 主机记录 | 记录值 |
| --- | --- | --- | --- |
| `idol.ltd` | CNAME | `hazel` | 阿里云该项目实际给出的 CNAME 目标 |
| `idol.su` | CNAME | `hazel` | Cloudflare 该项目实际分配的 `<项目>.pages.dev` |

记录值只填主机名，不加 `https://` 或文件路径。两个域名应各自指向自己的平台，镜像不要重定向回主源。

## 发布顺序与验收

1. 迁移改动先按仓库流程合入 `dev`，通过检查后再进入 `main`；平台生产分支始终选 `main`。
2. `main` 每次更新会触发两平台独立构建和生产发布。因此应在合入 `main` 前完成版本号和 CHANGELOG 准备。**Pages 上线不等待 tag。**
3. 确认两平台构建记录对应同一个 `main` 提交，并均已成功。
4. 在该提交打 `vX.Y.Z` tag；`.github/workflows/release.yml` 校验版本后创建 GitHub Release 备份。tag 本身不再触发 Pages 部署。
5. 两个域名都检查以下路径：

| 路径 | 预期结果 |
| --- | --- |
| `/HazelSpam.user.js` | HTTP 200，包含 `// ==UserScript==` 元信息 |
| `/HazelSpam.min.user.js` | HTTP 200，包含元信息和压缩后的代码 |
| `/latest.json` | HTTP 200，有效 JSON，`version` 等于本次 `package.json.version` |

检查主源脚本的 `@downloadURL` / `@updateURL` 为 `hazel.idol.ltd`，镜像脚本为 `hazel.idol.su`；两份脚本的 `@connect` 都应包含两个新域名，不能再包含旧域名。检查每份清单的下载链接能访问且与脚本版本一致。`publishedAt` 表示各平台的构建时间，可以不同。

这是下载源，没有首页；根路径 `/` 返回 404 不代表三个产物部署失败。不应将找不到的 JS/JSON 路径重写为 HTML 首页。

固定文件名不能设置长期 immutable 缓存。Cloudflare 使用仓库 `public/_headers` 中的规则；阿里云在控制台为三个路径设置短缓存或不缓存，并在发版后核对实际响应头和内容。不要对这些机器读取的文件启用需要交互的登录或验证码挑战。

## 更新机制与旧版迁移

- 应用内自动检查与“检测更新”：优先请求主源 `latest.json`，请求超时（10 秒）、网络错误、HTTP 错误或清单无效时尝试镜像。镜像下载链接保持在镜像域名。两源都失败才显示失败。
- 主源正常响应时不会比较两个平台谁更新；所以需确认两平台均发布成功，避免镜像版本落后。
- Tampermonkey 自带更新：读取 `@updateURL` 指定的 `.user.js`，不读取 `latest.json`，也不执行应用内的双源兜底。镜像安装使用镜像更新地址。
- 旧版中的 `hazel.idols.ltd` 已失效。新部署不能自动修复已安装脚本里的旧 URL。用户应从新域名打开安装链接，按 Tampermonkey 提示覆盖更新一次；不要先卸载，以便保留 GM 配置。脚本名称和 namespace 保持不变。同版本迁移也需要手动确认覆盖。
- 新源验证完成后，在 EdgeOne 控制台停用旧项目的 Git 自动部署/Deploy Hook，并按需删除旧域名绑定。仓库旧工作流已移除，`EDGEONE_DEPLOY_HOOK_URL` secret 可删除。不要依赖已到期域名做跳转。

## 官方参考

- [Cloudflare Pages 构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages 构建镜像与环境变量](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Cloudflare Pages 自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)

阿里云具体域名验证项以当前 ESA 控制台返回值为准；上表安装命令、构建命令和目录取自本仓库实际构建流程。
