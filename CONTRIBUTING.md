# 欢迎

首先很高兴有更多人能参与到本项目的开发中，无论是添加新功能还是修复BUG或者是改进文案等都是欢迎的。

# 环境搭建

- 在浏览器中安装 [Tampermonkey](https://tampermonkey.net/) 扩展插件
- 安装 [Node.js](https://nodejs.org/zh-cn) (LTS版本就可以)
- 安装 [Visual Studio Code](https://code.visualstudio.com/download)
- 安装 [git](https://git-scm.com/) 或者任意GIT GUI客户端，例如 [Github Desktop](https://desktop.github.com/download/)
- 运行以下命令安装pnpm
```sh
npm install -g pnpm
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
pnpm run dev
```

# 注意事项

- 提交`commit`时，请使用[约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0)的格式
- 发起`PR`前请进行测试
- 发起`PR`时请合并到主仓库的`dev`分支

# 发版清单

正式发行源为 EdgeOne Pages，GitHub Release 仅保留同版本产物作为备份下载源。

发版前请按以下顺序执行：

1. 将 [package.json](./package.json) 中的 `version` 更新到目标版本，例如 `1.0.1`
2. 更新 [CHANGELOG.md](./CHANGELOG.md)，将 `Unreleased` 改为目标版本并写入发布日期，然后补回新的空 `Unreleased`
3. 运行以下命令确认本地通过校验

```sh
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

4. 提交版本与变更记录
5. 打 tag 并推送，例如

```sh
git tag v1.0.1
git push origin v1.0.1
```

补充说明：

- CI 会校验 Git tag 与 `package.json.version` 完全一致；如果 tag 是 `v1.0.1`，而 `package.json` 仍是 `1.0.0`，工作流会直接失败
- tag 推送会触发 [`.github/workflows/edgeone-release.yml`](./.github/workflows/edgeone-release.yml)
- 工作流会构建 `HazelSpam.user.js`、`HazelSpam.min.user.js` 和 `latest.json`，部署到 `https://hazel.idols.ltd`，并同步上传同版本 GitHub Release 资产
