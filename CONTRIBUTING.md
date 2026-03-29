# 欢迎

首先很高兴有更多人能参与到本项目的开发中，无论是添加新功能还是修复BUG或者是改进文案等都是欢迎的。

# 环境搭建

- 在浏览器中安装 [Tampermonkey](https://tampermonkey.net/) 扩展插件
- 安装 [Node.js](https://nodejs.org/zh-cn) (LTS版本就可以)
- 安装 [Visual Studio Code](https://code.visualstudio.com/download)
- 安装 [git](https://git-scm.com/) 或者任意GIT GUI客户端，例如 [Github Desktop](https://desktop.github.com/download/)
- 建议使用 `corepack` 启用仓库锁定的 `pnpm@10.30.3`
```sh
corepack enable
corepack prepare pnpm@10.30.3 --activate
```
- Fork 本项目 (不用勾选 Copy the `main` branch only)，并 clone 至本地
- 在项目根目录中运行以下命令安装依赖
```sh
pnpm install
```
- 运行以下命令切换至`dev`分支或在GIT GUI客户端中切换至`dev`分支
```sh
git checkout dev
```
至此，完成本项目的环境搭建，运行以下命令或在`Visual Studio Code`的`NPM脚本`栏中的`dev`点击运行按钮即可进行开发
```sh
pnpm dev
```

# 注意事项

- 提交`commit`时，请使用[约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0)的格式
- 发起`PR`前请进行测试
- 发起`PR`时请合并到主仓库的`dev`分支
- 如果改动涉及用户可见行为、发布流程、存储 schema 或主题同步，请同步更新对应 Markdown 文档

# 分支策略

本项目当前采用“`dev` 日常开发，`main` 正式发布”的流程。

- 日常开发、修复、评审与联调默认都在 `dev` 分支完成
- 平时不要直接把普通开发提交推到 `main`
- 面向用户的正式发布内容，应先在 `dev` 完成验证，再集中推进到 `main`

这样做的原因是：

- EdgeOne Pages 的正式域名以生产部署为准
- 当前发布链路更适合把 `main` 视为“待正式发版的稳定入口”，而不是日常开发分支
- 如果把日常提交持续推到 `main`，会让发布边界变得不清晰，也更容易误触正式发布链路

推荐日常协作方式：

1. 从 `dev` 切出功能分支开发
2. 完成后向 `dev` 发起 `PR`
3. 在 `dev` 上完成测试、联调与验收
4. 确认要正式发布时，再将本次发布内容一次性推进到 `main`

# 发版清单

正式发行源为 EdgeOne Pages，GitHub Release 仅保留同版本产物作为备份下载源。

发版前请按以下顺序执行：

1. 确认待发布内容已经在 `dev` 完成验证，并准备将其推进到 `main`
2. 将 [package.json](./package.json) 中的 `version` 更新到目标版本，例如 `1.1.2`
3. 更新 [CHANGELOG.md](./CHANGELOG.md)，将 `Unreleased` 改为目标版本并写入发布日期，然后补回新的空 `Unreleased`
4. 运行以下命令确认本地通过校验

```sh
pnpm check
pnpm build
```

5. 提交版本与变更记录
6. 将本次发布内容推进到 `main`
7. 在 `main` 上打 tag 并推送，例如

```sh
git tag v1.1.2
git push origin v1.1.2
```

更完整的推荐顺序如下：

1. 在 `dev` 整理并验证待发布内容
2. 更新版本号与 `CHANGELOG`
3. 提交 release preparation commit
4. 将该批次内容合并到 `main`
5. 确认 `main` 指向本次待发布提交
6. 打 `vX.Y.Z` tag 并推送
7. 等待发布工作流完成后，再检查 `latest.json` 与 userscript 链接是否更新

请注意，`tag` 应始终打在已经准备好正式发布的 `main` 提交上，而不是仍在继续开发的 `dev` 提交上。

补充说明：

- CI 会校验 Git tag 与 `package.json.version` 完全一致；如果 tag 是 `v1.1.2`，而 `package.json` 仍是 `1.1.1`，工作流会直接失败
- tag 推送会触发 [`.github/workflows/edgeone-release.yml`](./.github/workflows/edgeone-release.yml)
- 工作流会构建 `HazelSpam.user.js`、`HazelSpam.min.user.js` 和 `latest.json`，部署到 `https://hazel.idols.ltd`，并同步上传同版本 GitHub Release 资产

# 发布后同步 `dev`

正式发布完成后，建议尽快把 `dev` 拉回到当前 `main` 的发布提交，避免出现“代码内容一样，但 `dev` 和 `main` 不是同一个 commit”的情况。

## 目标

- 发布完成后，让 `dev` 与 `main` 指向同一个 release commit
- 保持后续开发仍从最新正式发布点继续推进
- 避免单纯为了“同步”再制造一条额外的 merge commit

## 推荐做法

发布 PR 从 `dev` 合并到 `main` 时，优先使用普通 merge commit 或 fast-forward；不要用 squash merge 作为默认做法。这样发布完成后，`dev` 可以直接 fast-forward 到 `main`。

推荐同步步骤：

1. 确认 `main` 上的 release 已完成，且 `dev` 上没有尚未准备发布的新提交
2. 拉取远端最新分支状态

```sh
git fetch origin
```

3. 切回 `dev`

```sh
git switch dev
```

4. 仅允许 fast-forward 方式把 `dev` 对齐到 `main`

```sh
git merge --ff-only origin/main
```

5. 推送同步后的 `dev`

```sh
git push origin dev
```

## 不推荐的做法

- 不要在“只是想把 `dev` 拉回到 `main`”时直接执行普通的 `git merge main`
- 不要为了同步分支而额外制造一条 `Merge branch 'main' into dev` 的提交

如果 `dev` 只是需要追上 `main`，正确结果应该是 fast-forward，而不是多一条新的 merge commit。

## 何时需要人工修复

如果过去已经用过 squash merge、rebase merge，或者 `dev` 上已经混入了不该存在的同步提交，`git merge --ff-only origin/main` 可能会失败。  
这时不要继续硬 merge；应先确认 `dev` 上是否存在还需要保留的未发布提交。

若确认目标就是“让 `dev` 完全等于 `main`”，可以在本地做一次人工对齐：

```sh
git fetch origin
git switch dev
git branch backup/dev-before-sync
git reset --hard origin/main
git push --force-with-lease origin dev
```

这属于修复性操作，不应当成为日常同步 `dev` 的默认流程。默认流程仍应以前面的 `merge --ff-only` 为准。
