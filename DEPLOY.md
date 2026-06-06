# GitHub Pages 部署说明

本文档说明如何将本 Vite + React 项目部署到 GitHub Pages，并通过 `404.html` + `sessionStorage` 解决 SPA 路由刷新 404 问题。

> **仓库根目录**：若你推送的是整个「个人知识管理系统」文件夹，请确保 Git 仓库根目录就是 `knowledge-base-web`（内含 `package.json`）。若 Git 根目录在上一级，需在 Actions 工作流中增加 `working-directory: knowledge-base-web`，或只将 `knowledge-base-web` 作为独立仓库推送。

---

## 一、在 GitHub 创建仓库并推送代码

### 1. 在 GitHub 新建仓库

1. 登录 [GitHub](https://github.com)。
2. 点击右上角 **+** → **New repository**。
3. 填写 **Repository name**（例如 `knowledge-base-web`）。
4. 选择 **Public**（GitHub Pages 免费版需公开仓库，或按你账号策略选择）。
5. **不要**勾选 “Add a README” 等初始化选项（若本地已有代码）。
6. 点击 **Create repository**。

### 2. 在本地初始化 Git 并推送（若尚未初始化）

在 **`knowledge-base-web` 目录** 下打开终端：

```bash
git init
git add .
git commit -m "Initial commit: knowledge base web app"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

将 `你的用户名` 和 `仓库名` 替换为实际值。

---

## 二、配置 GitHub Actions Secrets

构建时需要 Supabase 环境变量，请在仓库中配置 Secrets：

1. 打开仓库页面 → **Settings** → **Secrets and variables** → **Actions**。
2. 点击 **New repository secret**，分别添加：

| Secret 名称 | 说明 |
|-------------|------|
| `SUPABASE_URL` | Supabase 项目 URL（与本地 `.env` 中 `VITE_SUPABASE_URL` 相同） |
| `SUPABASE_ANON_KEY` | Supabase 匿名公钥（与本地 `VITE_SUPABASE_ANON_KEY` 相同） |
| `OPENAI_API_KEY` | OpenAI API Key（与本地 `VITE_OPENAI_API_KEY` 相同，用于 AI 摘要功能） |

Workflow 会在构建时自动映射为 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 和 `VITE_OPENAI_API_KEY`。

---

## 三、启用 GitHub Pages

1. 仓库 **Settings** → 左侧 **Pages**。
2. **Build and deployment** → **Source** 选择 **Deploy from a branch**。
3. **Branch** 选择 `gh-pages`，目录选择 **/ (root)**。
4. 点击 **Save**。

首次推送 `main` 分支后，GitHub Actions 会构建并推送到 `gh-pages` 分支；Pages 生效可能需要 1～3 分钟。

---

## 四、访问地址

部署成功后，在浏览器打开：

```text
https://你的用户名.github.io/仓库名/
```

例如仓库名为 `knowledge-base-web`、用户名为 `alice`：

```text
https://alice.github.io/knowledge-base-web/
```

---

## 五、自动部署

每次向 **`main`** 分支执行 `git push`，`.github/workflows/deploy.yml` 会自动：

1. 安装依赖并执行 `npm run build`（注入 Supabase Secrets）
2. 将 `dist` 目录发布到 **`gh-pages`** 分支

可在仓库 **Actions** 标签页查看每次部署日志。

---

## 六、本地手动部署（可选）

除 Actions 外，也可在本地构建并发布：

```bash
npm run deploy
```

该命令会先执行 `predeploy`（`npm run build`），再使用 `gh-pages` 将 `dist` 推送到远程 `gh-pages` 分支。需已配置 `git remote` 并有推送权限。

---

## 七、SPA 路由说明

| 机制 | 作用 |
|------|------|
| `public/404.html` | GitHub Pages 在找不到文件时返回此页；将当前路径写入 `sessionStorage` 后跳转到 `index.html` |
| `index.html` 内联脚本 | 读取 `sessionStorage` 中的路径，用 `history.replaceState` 恢复 URL |
| 构建变量 `VITE_BASE` | GitHub Actions 自动设为 `/仓库名/`；静态资源从正确子路径加载 |
| `BrowserRouter` 的 `basename` | 与仓库子路径对齐，保证 React Router 正确匹配路由 |

若使用 **用户/组织主页**（`https://用户名.github.io/`，无仓库名路径前缀），请编辑 `public/404.html`，将 `segmentCount` 从 `1` 改为 `0`，并将 Actions 中的 `VITE_BASE` 改为 `/`。

> 若部署到 **Cloudflare Pages**，请参阅 [DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md)，`VITE_BASE` 应设为 `/`。

---

## 八、Supabase 回调 URL（如使用登录）

在 Supabase 控制台 **Authentication → URL Configuration** 中，将 **Site URL** 和 **Redirect URLs** 加入你的 Pages 地址，例如：

```text
https://你的用户名.github.io/仓库名/
```
