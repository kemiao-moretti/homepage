import type { Loader } from "astro/loaders";
import { XMLParser } from "fast-xml-parser";
import { parse as parseYaml } from "yaml";

const BLOG = process.env.POSTS_BLOG ?? "https://blog.518339.xyz";
const RSS_PRIMARY = `${BLOG}/posts/index.xml`;
const RSS_FALLBACK = `${BLOG}/index.xml`;
const CDN = process.env.POSTS_CDN ?? "https://cdn.jsdmirror.com/gh";
const MIRROR = process.env.POSTS_REPO ?? "kemiao-moretti/meowloge";
const REF = process.env.POSTS_REF ?? "main";
const TREE_API = `https://data.jsdelivr.com/v1/packages/gh/${MIRROR}@${REF}`;
const POSTS_DIR = "content/posts";
const ARTICLE_OPEN = '<article class="post-content article-container">';
const ARTICLE_CLOSE = "</article>";
const CACHE_TTL_MS = 30 * 60 * 1000;

const parser = new XMLParser({
	ignoreAttributes: false,
	trimValues: true,
	processEntities: true,
});

interface RssItem {
	title: string;
	link: string;
	pubDate?: string;
	description?: string;
}

interface Frontmatter {
	slug?: string;
	title?: string;
	date?: string;
	lastmod?: string;
	description?: string;
	cover?: string;
	categories?: string[] | string;
	tags?: string[] | string;
	series?: string[] | string;
	ai_summary?: string;
}

async function get(url: string, timeout = 20000): Promise<string> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);
	try {
		const res = await fetch(url, {
			signal: controller.signal,
			headers: { "user-agent": "astro-aria/1.0 (+blog-posts loader)" },
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.text();
	} finally {
		clearTimeout(timer);
	}
}

async function getWithRetry(url: string, tries = 3): Promise<string | null> {
	for (let attempt = 0; attempt < tries; attempt++) {
		try {
			return await get(url);
		} catch {
			if (attempt < tries - 1) {
				await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
			}
		}
	}
	return null;
}

function parseRss(xml: string): RssItem[] {
	const doc = parser.parse(xml) as {
		rss?: { channel?: { item?: unknown } };
	};
	const raw = doc?.rss?.channel?.item;
	const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

	return list
		.map((entry) => {
			const it = entry as Record<string, unknown>;
			return {
				title: String(it.title ?? "").trim(),
				link: String(it.link ?? "").trim(),
				pubDate: it.pubDate ? String(it.pubDate) : undefined,
				description:
					it.description === undefined ? undefined : String(it.description),
			};
		})
		.filter((it) => {
			try {
				return /\/p\/[^/]+\.html?$/.test(new URL(it.link).pathname);
			} catch {
				return false;
			}
		});
}

function slugFromLink(link: string): string {
	try {
		const path = new URL(link).pathname.replace(/\.html?$/, "");
		return path.split("/").filter(Boolean).pop() ?? "";
	} catch {
		return "";
	}
}

/** 正文容器内部还嵌套着 <article>（solitude-tag 卡片），非贪婪正则会截断，必须做标签配对。 */
function extractArticle(html: string): string | null {
	const start = html.indexOf(ARTICLE_OPEN);
	if (start === -1) return null;

	let depth = 0;
	let cursor = start;

	while (cursor < html.length) {
		const nextOpen = html.indexOf("<article", cursor + 1);
		const nextClose = html.indexOf(ARTICLE_CLOSE, cursor + 1);

		if (nextClose === -1) return null;

		if (nextOpen !== -1 && nextOpen < nextClose) {
			depth++;
			cursor = nextOpen;
			continue;
		}

		if (depth === 0) {
			return html.slice(start, nextClose + ARTICLE_CLOSE.length);
		}

		depth--;
		cursor = nextClose;
	}

	return null;
}

/** 博客正文里大量使用站内根相对链接，不绝对化的话嵌入本站后图片与内链全部 404。 */
function absolutize(html: string, base = BLOG): string {
	const isRootRelative = (value: string) =>
		value.startsWith("/") && !value.startsWith("//");

	// 博客 HTML 是 Hugo minify 过的，属性值大多不带引号（`src=/img/x.webp`）。
	// 只认带引号的写法会漏掉绝大部分正文图片和站内链接 —— 实测 21 个 img / 80 个 a。
	let out = html.replace(
		/(\s(?:src|href|poster)=)(?:"([^"]*)"|'([^']*)'|([^\s">]+))/gi,
		(full, prefix: string, dq?: string, sq?: string, uq?: string) => {
			const value = dq ?? sq ?? uq ?? "";
			return isRootRelative(value) ? `${prefix}"${base}${value}"` : full;
		},
	);

	out = out.replace(
		/\ssrcset=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
		(full, dq?: string, sq?: string, uq?: string) => {
			const value = dq ?? sq ?? uq ?? "";
			if (!value.trim()) return full;
			const next = value
				.split(",")
				.map((part) => {
					const segment = part.trim();
					if (!isRootRelative(segment)) return segment;
					const [url, ...descriptors] = segment.split(/\s+/);
					return [`${base}${url}`, ...descriptors].join(" ");
				})
				.join(", ");
			return ` srcset="${next}"`;
		},
	);

	return out;
}

/** 封面等元数据里的站内相对路径也要绝对化，否则嵌入本站后图片 404。 */
function absoluteUrl(value: string, base = BLOG): string {
	if (!value) return value;
	if (
		/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value) ||
		value.startsWith("data:")
	) {
		return value;
	}
	return `${base}${value.startsWith("/") ? "" : "/"}${value}`;
}

function parseFrontmatter(md: string): Frontmatter | null {
	const matched = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!matched) return null;
	try {
		return parseYaml(matched[1]) as Frontmatter;
	} catch {
		return null;
	}
}

function asArray(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String);
	return value ? [String(value)] : [];
}

function formatDate(input: string): string {
	const date = new Date(input);
	if (Number.isNaN(date.getTime())) return "";
	return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/** 用 jsDelivr 的包索引拿仓库文件树（不消耗 GitHub API 配额）。 */
async function listPostFiles(): Promise<string[]> {
	const tree = await getWithRetry(TREE_API, 2);
	if (!tree) return [];

	try {
		const data = JSON.parse(tree) as {
			files?: Array<{ name: string; type: string; files?: unknown[] }>;
		};
		const paths: string[] = [];

		const walk = (nodes: unknown[], prefix: string) => {
			for (const node of nodes ?? []) {
				const n = node as { name: string; type: string; files?: unknown[] };
				const current = `${prefix}/${n.name}`;
				if (n.type === "directory") walk(n.files ?? [], current);
				else paths.push(current);
			}
		};

		walk(data.files ?? [], "");

		return paths.filter(
			(p) =>
				p.startsWith(`/${POSTS_DIR}/`) &&
				p.endsWith(".md") &&
				!p.endsWith("/_index.md"),
		);
	} catch {
		return [];
	}
}

async function fetchRssItems(): Promise<RssItem[]> {
	const primary = await getWithRetry(RSS_PRIMARY, 2);
	if (primary) {
		const items = parseRss(primary);
		if (items.length) return items;
	}

	const fallback = await getWithRetry(RSS_FALLBACK, 2);
	return fallback ? parseRss(fallback) : [];
}

export function blogPostsLoader(): Loader {
	return {
		name: "blog-posts",
		load: async ({ store, meta, logger, parseData, generateDigest }) => {
			const force = process.env.POSTS_REFRESH === "1";
			const strict = process.env.POSTS_STRICT === "1";
			const lastFetched = Number(meta.get("lastFetched") ?? 0);
			const cachedCount = store.keys().length;

			if (
				!force &&
				cachedCount > 0 &&
				Date.now() - lastFetched < CACHE_TTL_MS
			) {
				logger.info(
					`命中缓存（${cachedCount} 篇，${Math.round((Date.now() - lastFetched) / 1000)}s 前同步），跳过拉取`,
				);
				return;
			}

			const items = await fetchRssItems();

			if (!items.length) {
				if (cachedCount > 0) {
					logger.warn("RSS 两源均不可用，保留上一次缓存");
					return;
				}
				const message = "RSS 两源均不可用，且本地无缓存";
				if (strict) throw new Error(message);
				logger.warn(`${message}（构建继续，文章列表为空）`);
				return;
			}

			const files = await listPostFiles();
			const frontmatterBySlug = new Map<string, Frontmatter>();

			if (files.length) {
				for (const file of files) {
					const md = await getWithRetry(`${CDN}/${MIRROR}@${REF}${file}`, 2);
					if (!md) continue;
					const frontmatter = parseFrontmatter(md);
					if (!frontmatter) continue;
					const fallbackSlug =
						file.split("/").pop()?.replace(/\.md$/, "") ?? "";
					frontmatterBySlug.set(frontmatter.slug ?? fallbackSlug, frontmatter);
				}
				logger.info(
					`从 CDN 读到 ${frontmatterBySlug.size} 篇 frontmatter（共 ${files.length} 个文件）`,
				);
			} else {
				logger.warn("未能获取仓库文件树，封面 / 标签 / 分类将缺失");
			}

			store.clear();

			let loaded = 0;
			let degraded = 0;

			for (const item of items) {
				const slug = slugFromLink(item.link);
				if (!slug) continue;

				const frontmatter = frontmatterBySlug.get(slug);
				const sourceUrl = `${BLOG}/p/${slug}`;

				const page = await getWithRetry(sourceUrl, 3);
				const article = page ? extractArticle(page) : null;

				let body: string;
				let truncated = false;

				if (article) {
					body = absolutize(article);
				} else {
					body = item.description ?? "";
					truncated = true;
					degraded++;
					logger.warn(`${slug}: 正文提取失败，降级为 RSS 摘要`);
				}

				const date =
					frontmatter?.date ?? item.pubDate ?? new Date().toISOString();

				const data = await parseData({
					id: slug,
					data: {
						title: frontmatter?.title ?? item.title,
						description: frontmatter?.description ?? "",
						date,
						updated: frontmatter?.lastmod,
						cover: frontmatter?.cover
							? absoluteUrl(frontmatter.cover)
							: undefined,
						categories: asArray(frontmatter?.categories),
						tags: asArray(frontmatter?.tags),
						series: asArray(frontmatter?.series),
						aiSummary: frontmatter?.ai_summary,
						sourceUrl,
						dateFormatted: formatDate(date),
						truncated,
					},
				});

				store.set({
					id: slug,
					data,
					body,
					digest: generateDigest(`${body}${date}${truncated}`),
				});

				loaded++;
			}

			meta.set("lastFetched", String(Date.now()));
			logger.info(
				`posts: 载入 ${loaded} 篇${degraded ? `（其中 ${degraded} 篇降级为摘要）` : ""}`,
			);
		},
	};
}
