# AGENTS.md

给 AI 编码 agent 的项目说明书（人类读者同样适用）。结论先行，坑点在后半段。

> **最近一次大改动：2026-09-25**（commit `652d660`，分支 `feat/liushen-restyle`）—— 从上游 `astro-aria` 模板改造成**克喵的个人主页**：视觉与布局逐像素复刻 `https://www.liushen.fun/`，文章不再用本地 Markdown，改为构建时**远程拉取** `https://blog.518339.xyz/` 的全文。
> 同时包含了 `f7790e7` 的 **Astro 4.8.2 → 7.3.5 / Tailwind 3 → 4** 升级（历史记录见 §12）。

---

## 0. 一句话

一份 **Astro 7 静态站点**：纯 Tailwind 手工排版、无 UI 框架、无后端、无数据库。**文章来自远程博客**（构建时抓取），其余内容（站点信息 / 项目 / 经历 / 友站 / 导航 / 社交）由 `src/collections/*.json` 驱动。

## 1. 先搞清楚的三件事

1. **仓库根在 workspace 下一层**：所有命令都要先 `cd homepage/homepage`。
2. **文章不在仓库里**。`src/content/` 已被删除，页面上的文章全部来自 `src/loaders/blog-posts.ts` 在构建时抓取的远程博客。仓库里改不到文章内容。
3. **视觉是"复刻"而不是"参考"**。目标站快照是 `E:/CSharp/Temp/lsf.html`（105,764 B）与 `lsf-main.css`（97,068 B），样式类名、圆角、间距、shadows 都从那两个文件里抄。改 UI 前先在那里 grep。

远端：`git@github.com-kmoretti:kemiao-moretti/homepage.git`（SSH 主机别名 `github.com-kmoretti`）。
Blog 源仓库（用于取 frontmatter）：`kemiao-moretti/meowloge` @ `main`。

## 2. 技术栈

| 项 | 值 | 备注 |
| --- | --- | --- |
| 框架 | Astro `7.3.5` | `output: static` |
| 样式 | Tailwind CSS `4.3.3` + `@tailwindcss/typography` `0.5.20` | 经 `@tailwindcss/vite` 接入，**没有 `tailwind.config.mjs`** |
| 包管理 | pnpm `9.12.2` | `lockfileVersion: '9.0'`，别用 npm/yarn |
| Node | `>= 22.12.0` | Astro 7 硬性要求；实测 `22.22.2` 正常 |
| Lint / 格式化 | Biome `2.5.14` | ⚠️ `pnpm check` 会带 `--write --unsafe` **直接改文件** |
| 类型 | TypeScript `5.9.3` | **不要升到 7.x**：`@astrojs/check@0.9.10` 的 peer 只声明 `^5.0.0 \|\| ^6.0.0` |
| 运行时依赖 | `fast-xml-parser`（解析 RSS）、`yaml`（解析 frontmatter）、`sharp`（astro:assets 出图） | 缺 `sharp` 会让构建 exit 1，见 §9.18 |
| SEO | `@astrojs/sitemap` | 见 §6.4 |
| CI / 部署 | **无** | 没有 `.github/`、没有 `.env` 示例 |

## 3. 常用命令

```bash
cd homepage/homepage          # 注意：仓库根在 workspace 下一层

# 本机（WorkBuddy 沙箱）跑 install / build 都要带这个前缀，原因见 §9.2
CODEBUDDY_SAFE_DELETE_ENABLED=0 pnpm install
CODEBUDDY_SAFE_DELETE_ENABLED=0 pnpm build   # = astro check && astro build

# ✔ 改了 loader / 想拿最新文章，必须强制刷新，否则命中 30 分钟 TTL 缓存
POSTS_REFRESH=1 CODEBUDDY_SAFE_DELETE_ENABLED=0 pnpm build

pnpm dev         # 开发服务器（不删文件，无需前缀；改 loader 仍需 POSTS_REFRESH=1）
pnpm preview     # 预览 dist/
```

**验证基线**（2026-09-25 实测）：

- `astro check` → **39 files / 0 errors / 0 warnings / 0 hints**
- `pnpm build` → **7 个页面** + `sitemap-index.xml` + `sitemap-0.xml`，退出码 0
- `biome check .` → 52 files，`No fixes applied`
- CDP 视觉判定表（对比 liushen.fun）→ `verify-b8.mjs` **152/152**
- CDP 交互回归 → `verify-b3.mjs` **22/22**

页面清单必须恰为：`index.html`、`posts/`、`projects/`、`sites/`、`about/`、`post/ai-summary/`、`post/shortcode-showcase/`。

## 4. 目录地图

```
src/
├─ assets/
│  ├─ css/main.css            # 唯一的全局 CSS：Tailwind v4 入口 + @theme token + 自定义类
│  ├─ images/                 # 走 astro:assets 的图片（会自动转 WebP 出 srcset + 带宽高）
│  └─ js/main.js              # 全部交互：深色模式、吸顶头部、移动端菜单、导航高亮、复制订阅地址
├─ collections/               # 【注意】纯 JSON 数据，不是 Astro Collections
│  ├─ site.json               # ⭐ 站点身份 + 首屏：name/title/description/hero/profile/subscribe/legal/font
│  ├─ pages.json              # ⭐ 页面与区块文案：common（全站微文案）/ home（三区块）/ posts·projects·sites·about（各页 meta+heading）
│  ├─ menu.json               # 导航项 [{name, url}]
│  ├─ social.json             # 页脚社交链接，按 group 分组
│  ├─ projects.json           # 项目卡片（现为占位骨架）
│  ├─ sites.json              # 友站 / 其他站点卡片
│  ├─ experiences.json        # 工作经历（现为占位骨架）
│  └─ about.json              # About 页正文文案 + 链接
├─ content.config.ts          # 唯一的 collection 定义（blogPostsLoader）——在 src/ 根，不在 src/content/ 里
├─ loaders/blog-posts.ts      # ⭐ 远程文章管道：RSS → 仓库文件树 → 正文抓取 → 绝对化
├─ layouts/
│  ├─ main.astro              # 全站唯一 <html> 骨架：SEO meta、字体、注入位、Header/Endnote+Footer
│  └─ post.astro              # 文章版式（标题 + prose 容器），由 [slug].astro 显式套用
├─ components/
│  ├─ tile-grid.astro         # 右上角虚线瓷砖背景（含裁剪容器，见 §9.14）
│  ├─ atmosphere.astro        # 全屏四角光斑
│  ├─ header.astro            # 吸顶导航：菜单 / 汉堡按钮 / 日夜切换
│  ├─ logo.astro              # ✦ + 站点名（shrink-0 whitespace-nowrap，见 §9.15）
│  ├─ hero.astro              # 首屏：徽章 + 标题 + 副标题 + 正文 + 标签 + CTA + 右侧头像面板
│  ├─ section-divider.astro   # 区块间的虚线分隔条 + 居中胶囊
│  ├─ endnote.astro           # 页脚上方的 Endnote 胶囊段（**包裹页脚**，见 §9.16）
│  ├─ section-header.astro    # 区块头：eyebrow + h2 + description + <slot> aside
│  ├─ helper-card.astro       # section-header 的 slot 内容：aside 卡片 + 箭头圆钮
│  ├─ article-card.astro      # 文章卡（整卡可点，双层虚线错位 hover）
│  ├─ site-card.astro         # 站点卡（aspect-[1782/971] 截图位 + 域名胶囊 + 箭头钮）
│  ├─ project.astro           # 项目卡（1/3 图 + 2/3 文）
│  ├─ posts-loop.astro        # 读 collection("post") 按日期倒排渲染 ArticleCard
│  ├─ subscribe-card.astro    # RSS 订阅卡（复制地址 / Feedly / Inoreader）
│  ├─ placeholder-media.astro # ⭐ 统一占位块：渐变底 + 首字，所有缺图位置都用它
│  ├─ button.astro / badge.astro / page-heading.astro
│  ├─ arrow-icon.astro        # 标题右侧的 hover 滑入箭头（opacity-0 → 100）
│  ├─ arrow-icon-glyph.astro  # 圆钮里的静态箭头
│  ├─ about-experience.astro  # 单条工作经历
│  └─ home/{projects,sites,writings}.astro   # 首页三个内容区块
└─ pages/
   ├─ index.astro             # /
   ├─ posts.astro             # /posts
   ├─ projects.astro          # /projects
   ├─ sites.astro             # /sites
   ├─ about.astro             # /about
   └─ post/[slug].astro       # /post/<slug>
```

**已删除、不要试图找回**：`src/content/`（32 篇本地文章）、`tailwind.config.mjs`、`src/content/config.js`、`components/{square,square-line,square-lines}.astro`、`components/home/separator.astro`、`public/assets/images/{posts,projects}/`。

`src/env.d.ts` **不要删** —— Astro 7 会在跑 `build` / `dev` 时自动重新生成它。

## 5. 远程文章管道（`src/loaders/blog-posts.ts`）

```
RSS (blog.518339.xyz/posts/index.xml，退路 /index.xml)
   │  parseRss()：只留 pathname 形如 /p/<slug>.html 的条目
   ▼
jsDelivr 包索引 API (data.jsdelivr.com/v1/packages/gh/kemiao-moretti/meowloge@main)
   │  listPostFiles()：走 content/posts/**.md（不消耗 GitHub API 配额）
   ▼
jsdmirror CDN 拉每个 .md → 只取 frontmatter（cover / tags / categories / ai_summary）
   ▼
逐篇抓 https://blog.518339.xyz/p/<slug>
   · extractArticle() 用**标签配对**（不是非贪婪正则）取出 <article class="post-content article-container">
     ── 正文里嵌套着 <article>（solitude-tag 卡片），非贪婪正则会提前截断
   · absolutize() 把站内根相对 URL 补成绝对 URL
   ▼
store.set({ id: slug, data, body, digest })
   ▼
getCollection("post") → pages/post/[slug].astro（render(entry) + 显式套 Layout）
```

### 5.1 环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `POSTS_REFRESH` | 未设 | `=1` 跳过 30 分钟 TTL 缓存，强制重抓 |
| `POSTS_STRICT` | 未设 | `=1` 时 RSS 全挂**抛错中止构建**；默认只 warn 并继续 |
| `POSTS_BLOG` | `https://blog.518339.xyz` | 博客站点根 |
| `POSTS_CDN` | `https://cdn.jsdmirror.com/gh` | 取 frontmatter 的 CDN 前缀 |
| `POSTS_REPO` | `kemiao-moretti/meowloge` | 博客源码仓库 |
| `POSTS_REF` | `main` | 分支 / tag |

### 5.2 降级行为（**不要静默伪装全文**）

正文提取失败时：`body = RSS description`、`truncated = true`、`logger.warn('<slug>: 正文提取失败，降级为 RSS 摘要')`，UI 上在日期旁渲染「仅摘要」胶囊。RSS 两源全挂且本地有缓存时保留旧缓存；无缓存则 warn 并产出空列表（除非 `POSTS_STRICT=1`）。

## 6. 内容模型

### 6.1 站点信息全部在 `src/collections/site.json`

`name` / `logoIcon` / `title` / `description` / `hero{badge,title,subtitle,intro,skills[],cta[]}` / `profile{avatar,since,panelLabel,sinceLabel}` / `subscribe{feedUrl,title,description}` / `legal{icp,police,credit}` / `font{label,name,author,license,url}` / `copyright`。所有可见文字都在这里，`.astro` 只做排版（见 §6.6）。

- `profile.avatar` 填的是**`src/assets/images/` 下的文件名**（如 `avatar.webp`），不是 URL、也不是 `/assets/images/...` 路径。`hero.astro` 用 `import.meta.glob` 把该目录映射成 `{ 文件名 → ImageMetadata }`，交给 `<Image>` 输出 WebP + srcset + `width/height`（防 CLS）。
  - 换头像：把图片丢进 `src/assets/images/`，把文件名填进 `profile.avatar`，**不用动代码**。
  - 留空或文件名对不上 → `avatar` 为 `undefined` → 自动降级成 `PlaceholderMedia` 渐变圆（首字）。
  - 别把图片放 `public/`：那会原样进 `dist`、绕过优化。放 `src/assets/images/` 后，实测一张 103 kB 的源图在 `widths={[360,540,720]}` 下产出 19 / 37 / 57 / 102 kB 四档，首屏按 `sizes` 只会取其中一档。
- `legal.icp` / `legal.police` 为 `null` 时**整个链接不渲染**（footer 里做了条件判断）。
- `post.astro` 的 meta description 取 `frontmatter.description || aiSummary || title`。

### 6.2 post collection schema（`src/content.config.ts`）

`title` / `description` / `date` / `updated?` / `cover?` / `categories[]` / `tags[]` / `series[]` / `aiSummary?` / `sourceUrl` / `dateFormatted` / `truncated`。

`dateFormatted` 由 loader 产出，格式是 **`M/D/YYYY`**（如 `9/22/2026`），与目标站一致；**不要**改回 `<Mon> <day>, <year>` 三段式。

### 6.3 文章卡一律跳博客原文，不在本站打开

`PostsLoop` 传给 `ArticleCard` 的是 `href={post.data.sourceUrl}` + `external`，即 `https://blog.518339.xyz/p/<slug>`，`_blank` 新标签打开，箭头额外 `-rotate-45` 表示外链。

`/post/[slug]` **仍然构建**（7 页里占 2 页）——它是旧分享链接与 SEO 的兜底，但站内已无入口。为免被判「重复内容」，`main.astro` 暴露了 `canonical` prop，`post.astro` 传 `frontmatter.sourceUrl` 把 canonical 交回博客；其余页面不传 → 默认指本站自身。

想改回站内阅读：`posts-loop.astro` 的 `href` 换回 `` `/post/${post.id}` `` 并去掉 `external`，同时删掉 `post.astro` 里那行 `canonical={frontmatter.sourceUrl}`。

### 6.4 五个 JSON 集合都是"保留 key、值置 `""`"

`projects.json` 的 `image`、`sites.json` 的 `screenshot`、`experiences.json` 的 `logo`、`about.json` 的 `photo`、`site.json` 的 `profile.avatar` **都是空串而不是删除**。

原因：Astro 从 JSON 推断出的字面类型**逐字段推断**，删掉 key 会让另外几处 `item.image` 的访问报 `ts(2339) Property 'image' does not exist`（实测一次踩到 7 个错）。空串语义也更好读：**空 = 未设置 → 渲染占位块**。

### 6.5 SEO（`src/layouts/main.astro`）

`site` 已在 `astro.config.mjs` 配成 `https://home.518339.xyz`，canonical / og / sitemap / robots 全依赖它。输出 `<title>`、`description`、`rel=canonical`、`generator`、`og:type|site_name|locale|title|description|url|image`、`twitter:card|title|description`、`rel=alternate`（RSS）。**换域名时记得同步改 `public/robots.txt` 的 Sitemap 行。**

`<title>` 规则：首页 = `site.title`；子页 = `` `${title} · ${site.name}` ``。

### 6.6 页面与区块文案全部外置在 `src/collections/pages.json`

`.astro` 里**不留任何用户可见文案**（例外只有 Feedly / Inoreader / RSS 这类品牌名和 `# tag` 前缀）。想改字，只用碰 `src/collections/`：

| 想改的东西 | 改哪里 |
| --- | --- |
| 站点名 / Logo 图标 / SEO / 首屏（徽章·标题·副标题·正文·标签·CTA） | `site.json` |
| 首屏头像面板的 `Personal Profile` / `Since`、页脚字体行前缀 | `site.json` → `profile.panelLabel` / `profile.sinceLabel` / `font.label` |
| 首页三区块（标题·描述·辅助卡·按钮） | `pages.json` → `home.{projects,sites,writings}` |
| 首页区块间分隔条胶囊 | `pages.json` → `home.<区块>.divider.{label,href}` |
| 内页 `<title>` / meta description / 页头 | `pages.json` → `<页面>.meta` / `<页面>.heading` |
| 全站微文案（`发布于：`、`仅摘要`、空列表提示、`感谢驻足`、`日间`/`夜间`、`Endnote`、`复制订阅地址`、文章页固定句） | `pages.json` → `common` |
| About 页正文 | `about.json` |
| 项目 / 站点 / 经历 / 社交 / 导航 | 各自的 `projects.json` / `sites.json` / `experiences.json` / `social.json` / `menu.json` |

**只改值，不要删 key。** 理由同 §6.4：Astro 从 JSON 推断的是**逐字段字面类型**，删 key 会让引用处报 `ts(2339)`。`pages.json` 的 `common` 每个 key 都被组件直接引用，删一个就是构建失败——比静默渲染空白好。

结构上的两个小约定：
- `divider` 塞在区块对象里（而不是单独一个数组），是为了**顺序不必两处维护**：`index.astro` 把 `projects → sites → writings` 的块序写死，只从 JSON 取文字。
- `home.sites.helper.width` 是 `pages.json` 里唯一的非文案字段（辅助卡宽度 token）。它和那条辅助卡一一对应，改文案时顺手能看见，就没有再拆文件。

## 7. 主题与样式系统

`src/assets/css/main.css` 是唯一 CSS 文件（Tailwind v4 CSS-first，**没有 `tailwind.config.mjs`**）：

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));   /* 恢复 class 策略深色 */
@theme { --font-sans / --font-serif / --color-brand-* / --radius-* / --shadow-* / --animate-* }
:root { --hero-offset / --scrollbar-* }           /* 非 Tailwind 命名空间 */
@layer base { html.dark { color-scheme: dark } ... }
/* 之后是一批手写的语义类：.homepage-hero / .hero-surface / .frost-panel /
   .header-shell / .header-surface.is-pill / .footer-shell / .tile-* /
   .grid-fade / .prose img{border-radius:30px} / #sun / #moon / @keyframes */
```

**设计 token（全部来自目标站实测，改之前先去 `lsf-main.css` 核对）**：

| token | 值 |
| --- | --- |
| `--radius-inner` / `--radius-card` / `--radius-panel` / `--radius-site` / `--radius-shell` | `1.22rem` / `1rem` / `1.5rem` / `1.55rem` / `2rem` |
| `--shadow-card` / `--shadow-footer` / `--shadow-header` | 三组 `0 Npx Mpx -Kpx rgb(15 23 42 / 0.a)` |
| `--hero-offset` | `80px`（header 是 `fixed`，用它把首屏顶下去） |
| `--scrollbar-thumb`（亮 / 暗） | `#73737347` / `#a3a3a338` |

**深色模式四处协同**，改动要保持一致：`@custom-variant dark`（main.css）→ 防闪烁内联脚本（main.astro，位于 `<title>` 之后）→ 切换逻辑（main.js 的 `showDay`/`showNight`）→ keyframes（main.css 尾部）。
`localStorage` 键名 `dark_mode`，值字符串 `"true"`；关灯是 `removeItem`（不是存 `"false"`）。

**新增任何可见元素必须同时给 `dark:` 变体**，否则深色下会出现白底黑字或不可读文字。

**字体**：正文用朱雀仿宋（OFL-1.1），在 `main.astro` 里引 jsdmirror 上**锁 commit SHA** 的分片 CSS（上游无 tag，`@main` 会漂）。`--font-serif` 首位即该字体名，不要动。

## 8. 设计语言（改 UI 时沿用）

| 模式 | 做法 |
| --- | --- |
| 细虚线边框 | `border border-dashed border-neutral-300 dark:border-neutral-700` |
| 卡片 hover | 两张绝对定位层反向位移：`group-hover:-translate-x-1` + 另一层 `translate-x-1`，配合 `shadow-lg → shadow-xl` |
| 光斑 | `pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100`，内含 `-left-6 top-0 h-20 w-20 bg-amber-100/70 blur-2xl` + `-bottom-4 right-0 … bg-sky-100/70 blur-2xl`（暗色 `dark:bg-amber-400/10` / `dark:bg-cyan-400/10`） |
| 圆角 | 面板 `rounded-panel`(1.5rem) / 卡片 `rounded-2xl` / 内层图 `rounded-inner`(1.22rem) / 胶囊 `rounded-full` |
| 圆钮 | `flex h-8 w-8 items-center justify-center rounded-full border ... backdrop-blur-sm` + 箭头 `h-3.5 w-3.5 -rotate-45` |
| eyebrow 小标题 | `text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400` |
| 区块标题 | 带 emoji：`😃 我的项目` / `😗 我的站点` / `✍🏻 我的文章` |
| 分隔条文案 | `Projects · 我最近在做什么` / `Sites · 我的在线作品` / `Writings · 我写下来的东西` / `Endnote` |
| 按钮文案 | `查看所有项目` / `查看所有网站` / `查看所有文章` |
| 换行裁剪 | Tailwind 内置 `line-clamp-1/2/4`（站点卡标题 1 行、描述 2 行；项目描述 4 行） |

## 9. 已知坑与雷区

### 9.1 `pnpm install` 在本机会因 esbuild 报 EBUSY

本机沙箱对子进程 `spawnSync(node.exe)` 有限制，esbuild 的 postinstall（只做版本校验）会抛 `spawnSync ...node.exe EBUSY`。**已在 `package.json` 声明 `pnpm.neverBuiltDependencies: ["esbuild"]` 规避**（真正的二进制来自 optionalDependency `@esbuild/win32-x64`，随包分发）。sharp 同理。

### 9.2 在本机跑 install / build 必须带 `CODEBUDDY_SAFE_DELETE_ENABLED=0`

本机 `node-safe-delete-shim` 会拦截 Node 的批量删除，而 pnpm 和 Astro 都会在正常流程里清理临时目录：

- `pnpm install` → `[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] ... EXIT:1`
- `astro build` → 删 `dist/.prerender/.vite/` 被拦 → `Build failed`（**页面还没开始生成**）

给命令加前缀即可。**同样不要用 `rm -rf dist` 手动清理**（Bash 工具层也有守卫），让 Astro 自己清。

### 9.3 `compressHTML` 必须显式 `true`

Astro 7 默认值从 `true` 改成 `"jsx"`，会像 React 一样剥离标签间空白。**但它同时会剥离属性值引号**（`src="/a.png"` → `src=/a.png`）—— 这就是下面 §9.4 那个「假阴性」的成因。

### 9.4 远程正文的 URL 绝对化必须兼容**无引号属性**（大坑）

博客是 Hugo + minify 输出的，正文里属性值**大多不带引号**：实测 `src=/…` 21 处、`href=/…` 80 处，带引号的只有 2 / 34 处。
只认 `(["'])/(?!\/)` 的正则会漏掉绝大部分，13 张正文图片全部 404 指向 `http://127.0.0.1:4399/img/...`。

更坑的是：**用 `grep 'src="/' dist/...` 检查产物会返回 0，看起来"已修好"**，因为 `compressHTML` 把引号剥掉了。

```js
// 正确写法（三形态通吃，统一输出双引号绝对 URL）
/(\s(?:src|href|poster)=)(?:"([^"]*)"|'([^']*)'|([^\s">]+))/gi
```

**判定标准**只有运行时可信：`probe-images.mjs` 数 `document.images` 的 `naturalWidth > 0`，并要求「正文内相对引用 = 0」。

### 9.5 `extractArticle` 必须做标签配对，不能用非贪婪正则

正文容器内嵌着 `<article>`（solitude-tag 卡片），非贪婪会提前截断。已实现的深度计数版本见 `blog-posts.ts`。

### 9.6 Biome 读不懂 `.astro` 模板语法

它看不到 frontmatter 变量在模板里的使用，会把 `header.astro` 的 `import menus`、`footer.astro` 的 `import Logo` 报成 unused。`biome.json` 已显式关掉 `noUnusedVariables` / `noUnusedImports`（否则 `--unsafe` 会**删掉真实在用的 import**，当场打断导航和页脚），也关掉了 `noImportantStyles`。**不要把这些规则重新打开。**

`biome.json` 开了 `css.parser.tailwindDirectives`，否则解析不了 `@import "tailwindcss"` / `@theme` / `@plugin`。

### 9.7 Tailwind v4 只产出源码里字面出现的类名

JS 里 `classList.add('任意值类')` **不会生成 CSS**。所有运行时切换的类必须是**语义类**，并且要写进 `main.css` 的 `@utility` 块（如 `.is-pill`、`.menu-open`）。

反过来说，**v4 能生成任意数值的 spacing**（v3 只认预设档位）—— `h-100` 在 v3 里无效，在 v4 里是 `25rem`（曾把项目卡撑到 400px 高）。新增 spacing 类时留意。

### 9.8 `rounded-full` 的计算值不是 `9999px`

Tailwind v4 里是 `border-radius: calc(infinity * 1px)`，`getComputedStyle` 实测返回 **`2.23696e+07px`**。写 CDP 断言 / 选择器时如果判 `=== "9999px"`，会**恒不命中、静默返回 null**，很容易伪装成「两边都是 null，通过」。用 `parseFloat(...) > 100`。

### 9.9 `leading-tight` 在 v4 中才真正生效（**已接受的视觉变化**）

v3 产物里 `.text-lg{line-height:1.75rem}` 靠源码顺序压掉了 `.leading-tight{line-height:1.25}`；v4 改成 CSS 变量协调，于是 `leading-tight` 终于按作者本意生效。这是升级后唯一残留的布局差异来源。

### 9.10 `main.css` 的自定义规则现在才真正作用于文章页（**已接受的视觉变化**）

升级前文章页**没加载含 `main.css` 的那个 CSS 文件**，`.prose img{border-radius:30px}`、日夜切换 keyframes 全部失效（既有 bug）。升级后 CSS 合并为单文件全量加载，这些规则开始生效。

`layouts/post.astro` 里那个 `<style> .prose img { border-radius: 20px }` 是**死代码**：Astro 编译成 scoped 选择器 `.prose[data-astro-cid-x] img[data-astro-cid-x]`，而 Markdown 渲染出的 `img` 不带 scoped 属性。实际生效的是 `main.css` 的 30px。

### 9.11 `main.js` 顶层直接挂事件监听

它在 `main.astro` 里以 `<script>import "../assets/js/main.js";</script>` 加载，被编译成 `type="module"`（延迟执行，DOM 已就绪）。**改成 `is:inline` 会拿不到元素而报错。**

顺带：Astro 5 起 `<script>` 不再被提升到 `<head>`、`<style>` 会被提取进 CSS bundle —— 产物 head 里看不到它们是正常的。

### 9.12 环境变量注入位

`main.astro` 预留了两个 HTML 注入点：

```astro
<Fragment set:html={import.meta.env.HEADER_INJECT} />
<Fragment set:html={import.meta.env.FOOTER_INJECT} />
```

当前无 `.env`、无值，输出为空。注意 Astro 6 起 `import.meta.env` 的值不再自动做类型转换（`"true"` 不会变 boolean）。

### 9.13 升级大版本后必须手动杀掉旧的 dev server

报错形态（**"See full stack trace in the browser"** = dev server 的 Vite 错误浮层，构建不会触发）：

```
[ERROR] __vite_ssr_import_0__.createCollectionToGlobResultMap is not a function
  at node_modules/.pnpm/vite@5.2.11/node_modules/vite/dist/node/chunks/dep-cNe07EU9.js
```

`createCollectionToGlobResultMap` **只存在于 astro@4**。根因是升级**之前**就启动着的 `astro dev` 内存里还是旧模块，**进程不会因报错自己退出**。

```bash
netstat -ano | grep ':4321'      # 拿监听 PID
taskkill //F //PID <pid> //T     # //T 连带子进程
```

**判断依据是栈里的 vite 版本**：显示 `vite@5.2.11` 一定是旧进程（Astro 7 用 vite 8）。

### 9.14 瓷砖背景必须套在裁剪容器里

目标站层级是 `.tile-grid` → `.tile-region-shell` → **`div.pointer-events-none.absolute.inset-x-0.top-0.-z-10.overflow-hidden`** → `body`。
少这一层的话，768px 高的 shell 会留在文档流里，把首屏顶下去约 600px，并且不裁剪横向溢出。**改 `tile-grid.astro` 时不要把这个外层 div 去掉。**

### 9.15 中文 logo 需要 `shrink-0 whitespace-nowrap`

目标站 logo 是拉丁文 `LIUSHEN`（`min-content` = 整词）；中文可任意两字间断行，`min-content` 只有一字宽，会被 header 里 `w-full` 的 nav 挤成竖排两行。

### 9.16 「Endnote」是**包裹页脚的 section**，不是分隔条

目标站 body 层级：`…内容 section… → <section class="relative z-20 mt-16 px-5 pb-10 sm:mt-20 md:px-0">` → `div.mx-auto.max-w-6xl` → [`div.relative.px-1`（渐变发丝线 + Endnote 胶囊）] + **`<footer>`**。
`main.astro` 里是 `<Endnote><Footer /></Endnote>`；`footer.astro` 因此**不能**再自带 `mx-auto w-full max-w-6xl px-7 lg:px-0` 外框（改由 section 提供 `px-5 md:px-0`）。

### 9.17 「文章区块的 `mt-10` 必须在外层 div 上」

目标站是 `div.mx-auto.mt-10.w-full.max-w-6xl > div.grid.items-start.gap-7.lg:grid-cols-[minmax(0,1fr)_320px]`。
把 `mt-10` 并到 `div.grid` 上会得到 40px vs 0px 的偏差（CDP 判定表会直接抓到）。

### 9.18 `astro:assets` 需要**根级** `sharp`，否则构建 exit 1

Astro 7 把 `sharp` 当**可选** peer。`node_modules/.pnpm` 里可能早就有 `sharp@0.35.4` + `@img/sharp-win32-x64`（被 astro 解析出来的），但**根 `node_modules/sharp` 不存在**时 `loadSharp()` 照样抛：

```
generating optimized images
[WARN] [build] Unable to generate optimized image for /_astro/avatar-mcy.xxxx.png:
MissingSharp: Could not find Sharp. Please install Sharp (`sharp`) manually ...
 ELIFECYCLE  Command failed with exit code 1.
```

**迷惑点**：此时 **7 个页面已经全部生成完毕**（`✓ Completed in 353ms` 打在报错之前），失败只在最后的图片优化一步 —— 只看 grep `page(s) built` 会以为成功了，必须看日志尾部 / 退出码。

修法（store 里已有的话下载量为 0，实测 31 秒）：`CODEBUDDY_SAFE_DELETE_ENABLED=0 pnpm add sharp@0.35.4`。放 `dependencies` 而非 `devDependencies`，只装生产依赖的部署环境同样需要它。

## 10. 常见改造任务速查

| 想做的事 | 改哪里 |
| --- | --- |
| 改站点名 / Logo 图标 | `collections/site.json` 的 `name` / `logoIcon` |
| 改首屏文案 / 标签 / 按钮 | `collections/site.json` 的 `hero.*` |
| 改首屏头像面板标签 | `collections/site.json` 的 `profile.panelLabel` / `profile.sinceLabel` |
| 换首屏头像 | `collections/site.json` 的 `profile.avatar`（填 `src/assets/images/` 下的文件名）；留空或对不上则渲染渐变占位圆 |
| 改首页三区块标题 / 描述 / 辅助卡 / 按钮 | `collections/pages.json` 的 `home.{projects,sites,writings}.*` |
| 改首页分隔条胶囊文字 | `collections/pages.json` 的 `home.<区块>.divider.label` |
| 改任意内页的 `<title>` / meta / 页头 | `collections/pages.json` 的 `<页面>.meta` / `<页面>.heading` |
| 改全站微文案（`发布于：`/`仅摘要`/空列表提示/`感谢驻足`/`日间`·`夜间`/`Endnote`/`复制订阅地址`/文章页固定句） | `collections/pages.json` 的 `common.*` |
| 改 About 页文案 | `collections/about.json` |
| 加 / 改项目 | `collections/projects.json`（`image` 留空 → 渐变占位） |
| 加 / 改站点卡 | `collections/sites.json`（`screenshot` 留空 → 渐变占位） |
| 改工作经历 | `collections/experiences.json`（`logo` 留空 → 首字母占位圆） |
| 改导航 | `collections/menu.json` |
| 改社交链接 | `collections/social.json`（按 `group` 分组渲染） |
| 改备案号 | `collections/site.json` 的 `legal.icp`（设 `null` 即隐藏） |
| 登文章（本地改不到） | 去博客仓库 `kemiao-moretti/meowloge` 的 `content/posts/` 加 md，然后 `POSTS_REFRESH=1 pnpm build` |
| 改主题色 / 字体 | `src/assets/css/main.css` 的 `@theme` 块 |
| 改占位块外观 | `src/components/placeholder-media.astro`（全站唯一入口） |

## 11. 代码规范

- **Biome 2.5.14** 说了算。当前 `biome check .` 无诊断。
- `.astro` / `.js` 用 **2 空格**缩进，`.json` 用 **tab**。
- 换行符 LF、UTF-8、无行尾空格裁剪（`.editorconfig`）。
- 组件用 `Astro.props` 解构，需要默认值就写在解构里。新增可见元素**必须给 `dark:` 变体**。
- 样式只写 Tailwind 类，不新增 `.css` 文件，不引入 UI 库或客户端框架。
- 交互 JS 集中在 `src/assets/js/main.js`，函数挂到 `window` 供内联 `onclick` 调用。
- 代码风格：少注释、直给。**不加解释性注释**，只在「不写就会被后人踩」的地方留一行说明（见 `blog-posts.ts` 的 `absolutize` / `extractArticle`）。

## 12. 验证方法（本机）

**首选原生 CDP 探针**（Node 22 自带全局 `WebSocket`，不需要 puppeteer）：

```bash
# 1. 起静态服务（用 run_in_background: true + exec，否则子进程随命令结束被回收）
cd homepage/homepage/dist && python -m http.server 4399 --bind 127.0.0.1

# 2. 跑探针
node .workbuddy/tmp/verify-b3.mjs  http://127.0.0.1:4399   # 交互回归 22 项
node .workbuddy/tmp/verify-b8.mjs                            # 视觉判定表 152 项 + 截图
node .workbuddy/tmp/verify-outlink.mjs http://127.0.0.1:4399 # 文章卡跳博客（真点击 + hover 截图）8 项
node .workbuddy/tmp/probe-images.mjs                         # 图片加载 + 相对引用
node .workbuddy/tmp/shot-view.mjs http://127.0.0.1:4399 <out> # 视口截图；TASKS 第 5 位传选择器可截元素特写
```

Chrome 在 `C:/Users/Administrator/.cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe`，用 `--headless=new --remote-debugging-port=N --user-data-dir=<temp> --no-sandbox --disable-gpu` 启动。

**写跨站断言的三条纪律**（踩过的坑，见 `verify-b8.mjs`）：

1. **不要用绝对文档坐标做比较** —— `getBoundingClientRect().top` 会因文案长度不同累积偏移（实测 Δ 达 −709px）。用**相对量**，如 `aside.bottom − 描述.bottom`。
2. **不要拿"卡片盒子的宽高比"当结构指标** —— 那是内容驱动的。取**卡内第一个 `aspect-ratio !== 'auto'` 的元素**当封面容器。
3. **图片加载数是「假回归」高发区** —— 必须滚动到页底触发懒加载再数；外链图床失败不算布局回归。

**验证"点一下到底发生了什么"，必须用真实输入事件**（`verify-outlink.mjs`）：

- 静态 grep 产物只能证明属性写对了，证明不了浏览器行为。要证明 `target="_blank"` 真的开新标签，**必须在 browser 层监听**：连 `/json/version` 的 `webSocketDebuggerUrl` → `Target.setDiscoverTargets({discover:true})` → 收集 `targetCreated` / `targetInfoChanged` 的 `targetInfo.url`（popup 的 URL 是先空后补，只认 `targetCreated` 会拿到空串）。**页面 session 收不到 popup 的 Target 事件**，且在 page session 调 `Target.setAutoAttach({waitForDebuggerOnStart:true})` 会让 popup 卡在启动前。
- 点击前先 `elementFromPoint(cx, cy)` 断言命中卡片自身，再发 `mouseMoved → mousePressed → mouseReleased`（`mousePressed` 带 `buttons:1`）。卡片中心常被 `z-[25]` 光斑层之类覆盖，但那些层是 `pointer-events-none`，命中检测能自动排除。
- **验 `:hover` 态**：先移到 `(300,300)` 再移到目标，两次移动之间 sleep 一下；否则同一次移动可能被判为无变化。hover 后 `getComputedStyle` 读 `rotate`（Tailwind v4 用独立 `rotate` 属性，不是 `transform`）能区分「箭头显形」与「箭头方向对」。
- **元素特写截图**用 `Page.captureScreenshot({clip, captureBeyondViewport:true})`，`clip` 是**文档坐标**（`rect.left + scrollX`）。比整页截图快得多，也不会像 `captureBeyondViewport` 截长页那样把 Chrome 挂住。

长任务一律：`cmd > .workbuddy/tmp/x.log 2>&1` + `run_in_background: true`，**不要管道给 `tail`/`head`**（外壳被回收会连子进程一起带走）。

## 13. 升级记录（Astro 4.8.2 → 7.3.5 + Tailwind 3 → 4）

跨了 Astro 5/6/7 三个大版本 + Tailwind 3→4 重写，提交 `f7790e7`。主要改动：

| 类别 | 改动 |
| --- | --- |
| 依赖 | astro 7.3.5、tailwindcss 4.3.3、@tailwindcss/vite 4.3.3、@astrojs/check 0.9.10、typescript 5.9.3、biome 2.5.14；**移除** `@astrojs/tailwind` |
| 集合 | `src/content/config.js` → `src/content.config.ts`；`type: "content"` → `glob()` loader；`z` 改从 `astro/zod` 导入 |
| 样式 | `@tailwind` 指令 → `@import "tailwindcss"`；删 `tailwind.config.mjs`；`darkMode: "class"` → `@custom-variant`；`flex-shrink-0`→`shrink-0`、`shadow-sm`→`shadow-xs`、`backdrop-blur-sm`→`backdrop-blur-xs`；移除 `h-100` |
| 布局 | `main.astro`：CSS 改 frontmatter `import`，JS 改 `<script>import</script>`；favicon 改绝对路径（原先子页面全 404） |
| 配置 | `astro.config.mjs` 加 `compressHTML: true` 与 vite tailwind 插件；`tsconfig.json` 加 `include`/`exclude`；`.node-version` → `22.12.0`；`biome.json` 用官方 `biome migrate` 迁到 2.x 并开 `tailwindDirectives` |

## 14. 视觉复刻的权威依据

- 目标站快照：`E:/CSharp/Temp/lsf.html`（105,764 B）、`E:/CSharp/Temp/lsf-main.css`（97,068 B）
- 字体分片 CSS 快照：`E:/CSharp/Temp/zq.css`（61,606 B，锁 SHA 版本）
- 探针与判定表：`E:/kemiao-kmoretti/homepage/.workbuddy/tmp/{verify-b3,verify-b8,probe-images}.mjs`
- 截图：`.../tmp/b8/`（两站四路由 × 亮暗）、`.../tmp/final/`（本站视口截图）

**目标站卡片 DOM 结构（逐段抓取的原文）**：

| 组件 | 关键类与结构 |
| --- | --- |
| 文章卡 | `<div class="group relative flex cursor-pointer rounded-2xl border border-dashed border-transparent bg-white/90 p-7 dark:bg-neutral-900/85">` → `z-[25]` 光斑 / `z-20` 白面（hover 左上抽 + `border-solid`）/ `z-10` 虚线底（hover 右下抽 + `shadow-lg→xl`）→ `relative z-30` 内含 `aspect-[4/1]` 封面（`sm:block`，`rounded-xl`）+ `h2` + 描述 + `发布于：M/D/YYYY`。**整卡可点** |
| 项目卡 | `<a class="… flex h-full flex-row items-center rounded-2xl bg-white/90 p-7 sm:p-3 dark:bg-neutral-900/85">`，`w-1/3` 图（`aspect-[16/9] rounded-lg`）+ `w-2/3` 文（描述 `line-clamp-4`） |
| 站点卡 | 外层 `rounded-[1.55rem] p-3 shadow-[0_16px_40px_-34px_…] hover:-translate-y-1` + 内层 `aspect-[1782/971] rounded-[1.22rem] overflow-hidden` + 左上域名胶囊（`h-1.5 w-1.5 bg-emerald-500` + `font-mono tracking-[0.16em]`）+ 右上 `h-8 w-8` 箭头钮 + `pt-3.5` 文案区（标题 `line-clamp-1` / 描述 `line-clamp-2`） |
| helper aside | `rounded-[1.5rem] border-dashed px-4 py-4 shadow-sm backdrop-blur-sm`；项目/文章 `md:max-w-[18.5rem]`、站点 `md:max-w-[18rem]`；内含 `line-clamp-1` 标题 + `line-clamp-2` 正文 + `h-8 w-8` 箭头圆钮 |
| 区块网格 | 项目 `mt-10 grid w-full items-stretch gap-7 md:grid-cols-2`；站点 `mt-9 grid w-full gap-5 sm:grid-cols-2 xl:grid-cols-3`；文章见 §9.17 |
| CTA 容器 | 项目/站点 `flex w-full items-center justify-center pt-8 pb-3`；文章 `pt-3 pb-3` |
