# 克喵 · 个人主页

`https://home.518339.xyz` 的源码。视觉参照 [liushen.fun](https://www.liushen.fun/)，
技术底座是 [ccbikai/astro-aria](https://github.com/ccbikai/astro-aria) 主题，
已升级到 Astro 7 + Tailwind CSS v4。

## 这个站做什么

- **文章全部远程拉取**，本仓库不放任何 Markdown。构建时从
  [blog.518339.xyz](https://blog.518339.xyz/) 的 RSS 拿清单、抓渲染后的 HTML 拿全文，
  再从 [meowloge](https://github.com/kemiao-moretti/meowloge) 仓库读 frontmatter
  补上封面 / 分类 / 标签 / 系列 / AI 摘要。博客发文后重建本站即可同步。
- 页面：`/`、`/posts`、`/post/<slug>`、`/projects`、`/about`、`/sites`。
- 所有文案都在 `src/collections/*.json` 里，改 JSON 就能换内容，不用动组件。

## 常用命令

```bash
pnpm install        # 本机需前缀 CODEBUDDY_SAFE_DELETE_ENABLED=0
pnpm dev            # 本地开发，默认 4321
pnpm build          # astro check + astro build
pnpm preview        # 预览 dist
pnpm check          # biome check --write --unsafe
```

内容有 30 分钟缓存，强制重拉远程文章：

```bash
POSTS_REFRESH=1 CODEBUDDY_SAFE_DELETE_ENABLED=0 pnpm build
```

| 环境变量 | 作用 |
|---|---|
| `POSTS_REFRESH=1` | 绕过 30 分钟 TTL，强制重新抓取 |
| `POSTS_STRICT=1` | 集合为空时直接报错（CI 用） |
| `POSTS_CDN` | 切换 CDN，默认 `https://cdn.jsdmirror.com/gh` |
| `POSTS_BLOG` / `POSTS_REPO` / `POSTS_REF` | 覆盖博客地址 / 仓库 / 引用 |

## 字体许可

正文字体为 **朱雀仿宋（Zhuque Fangsong）**，由
[TrionesType](https://github.com/TrionesType/zhuque) 开发，以 **SIL Open Font License 1.1** 发布。
本站通过 `cdn.jsdmirror.com` 加载 [willow-god/Sharding-fonts](https://github.com/willow-god/Sharding-fonts)
项目生成的 `unicode-range` 分片 CSS（锁 commit SHA，不随上游变动）。

## 部署

构建产物是纯静态站点，`dist/` 直接丢到任意静态托管即可。
换域名时需同步修改 `astro.config.mjs` 的 `site` 与 `public/robots.txt` 的 Sitemap 行。
