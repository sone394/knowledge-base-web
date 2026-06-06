# Cloudflare Pages 部署说明

本文档说明如何将本 Vite + React 项目部署到 Cloudflare Pages（例如 `https://knowledge-base-web-bpo.pages.dev/`）。

> **仓库根目录**：若 Git 仓库根目录在「个人知识管理系统」上一级，请在 Cloudflare 构建配置中将 **Root directory** 设为 `knowledge-base-web`。

---

## 一、在 Cloudflare 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 选择包含本项目的 GitHub 仓库。
3. 配置构建设置：

| 配置项 | 值 |
|--------|-----|
| **Production branch** | `main` |
| **Framework preset** | None（或 Vite） |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory**（若需要） | `knowledge-base-web` |

4. 展开 **Environment variables**，添加构建变量：

| 变量名 | 说明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥 |
| `VITE_BASE` | 固定填 `/`（根域名部署） |

5. 点击 **Save and Deploy**，等待首次构建完成。

---

## 二、访问地址

部署成功后，在浏览器打开 Cloudflare 分配的域名，例如：

```text
https://knowledge-base-web-bpo.pages.dev/
```

**不要**把 `/note/index.html` 当作入口——该地址不是有效笔记 ID。若误访问会被重定向到 `/notes/edit`。正确路由示例：

| 页面 | 路径 |
|------|------|
| 首页 / 登录 | `/` |
| 某条笔记 | `/note/{笔记UUID}` |
| 新建笔记 | `/notes/edit` |
| 知识图谱 | `/graph` |
| 回收站 | `/trash` |

---

## 三、SPA 路由（刷新不 404）

项目使用两层 SPA 回退：

1. `public/_redirects`（构建后位于 `dist/_redirects`）：

```text
/* /index.html 200
```

2. `functions/[[path]].ts`：当 `_redirects` 未生效时，由 Cloudflare Pages Functions 在 404 时返回 `index.html`。

部署后请验证：

1. 打开 `https://你的域名.pages.dev/graph`，应显示知识图谱页（而非 404）。
2. 打开 `https://你的域名.pages.dev/note/某笔记UUID`，应进入笔记编辑页。
3. 若子路径仍 404，检查 **Build output directory** 是否为 `dist`，并 **Retry deployment** 重新部署。

### 子路径白屏（仅标题、无内容）

若首页 `/` 正常，但 `/note/xxx` 白屏，多半是构建时 `VITE_BASE` 被设成了 `./`（相对路径），导致 JS 请求到 `/note/assets/...` 而 404。

**处理**：在 Cloudflare 环境变量中将 `VITE_BASE` 设为 `/`，或删除该变量（项目已默认使用 `/`）。重新部署后，在浏览器查看页面源码，脚本地址应为 `/assets/xxx.js` 而非 `./assets/xxx.js`。

---

## 四、资源路径（`VITE_BASE`）

`vite.config.ts` 通过环境变量 `VITE_BASE` 控制静态资源前缀：

| 部署目标 | `VITE_BASE` |
|----------|-------------|
| Cloudflare Pages 根域名（`*.pages.dev`） | `/` |
| GitHub Pages 项目站（`用户名.github.io/仓库名/`） | `/仓库名/` |

Cloudflare 根域名部署时**必须**使用 `/`。若使用旧的相对路径 `base: './'`，在 `/note/xxx` 等子路径下会导致 JS/CSS 加载到错误地址，出现**白屏**（仅显示 HTML 标题）。

---

## 五、自动部署

每次向 **`main`** 分支 `git push`，Cloudflare 会自动：

1. 执行 `npm install` 与 `npm run build`（注入上述环境变量）
2. 将 `dist` 发布到 Pages

可在 Cloudflare 项目 **Deployments** 标签页查看构建日志。

---

## 六、本地预览 Cloudflare 构建（可选）

```bash
npm run build
npx wrangler pages dev dist
```

`wrangler.toml` 仅用于本地预览，**不要**在其中设置 `pages_build_output_dir`，否则 Cloudflare Git 构建可能忽略控制台中的 `VITE_*` 环境变量。

---

## 七、Supabase 回调 URL

在 Supabase 控制台 **Authentication → URL Configuration** 中，将 **Site URL** 和 **Redirect URLs** 加入你的 Pages 地址，例如：

```text
https://knowledge-base-web-bpo.pages.dev/
```

---

## 八、与 GitHub Pages 的区别

| 项目 | Cloudflare Pages | GitHub Pages |
|------|------------------|--------------|
| 部署文档 | 本文档 | [DEPLOY.md](./DEPLOY.md) |
| `VITE_BASE` | `/` | `/仓库名/` |
| SPA 回退 | `public/_redirects` | `public/404.html` |
| 自动部署 | Cloudflare Git 集成 | `.github/workflows/deploy.yml` |

两个平台可同时使用，但需各自配置对应的 `VITE_BASE` 与环境变量。
