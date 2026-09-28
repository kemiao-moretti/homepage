import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addFrontmatterToIndex,
	parseFeed,
	resolveBody,
	selectFrontmatter,
} from "./blog-posts.ts";

const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>测试文章</title><link href="https://blog.example/p/test.html" rel="alternate"/><link href="https://cdn.example/cover.webp" rel="enclosure" type="image/webp"/><id>https://blog.example/p/test.html</id><published>2026-09-22T18:30:00+08:00</published><updated>2026-09-23T18:30:00+08:00</updated><summary type="text">摘要</summary><content type="html"><![CDATA[<p>正文</p>]]></content><category term="分类" scheme="category"/><category term="标签" scheme="tag"/><category term="系列" scheme="https://example.test/series/"/></entry></feed>`;

const rss = `<?xml version="1.0"?><rss><channel><item><title>RSS 文章</title><link>https://blog.example/p/rss.html</link><pubDate>Tue, 22 Sep 2026 18:30:00 +0800</pubDate><description><![CDATA[<p>摘要正文</p>]]></description><category>旧分类</category></item></channel></rss>`;

describe("blog feed parsing", () => {
	it("parses Atom links, dates, content, enclosure, and category schemes", () => {
		assert.deepEqual(parseFeed(atom), [
			{
				title: "测试文章",
				link: "https://blog.example/p/test.html",
				pubDate: "2026-09-22T18:30:00+08:00",
				updated: "2026-09-23T18:30:00+08:00",
				description: "摘要",
				content: "<p>正文</p>",
				cover: "https://cdn.example/cover.webp",
				categories: ["分类"],
				tags: ["标签"],
				series: ["系列"],
			},
		]);
	});

	it("keeps RSS as a compatible fallback format", () => {
		assert.deepEqual(parseFeed(rss), [
			{
				title: "RSS 文章",
				link: "https://blog.example/p/rss.html",
				pubDate: "Tue, 22 Sep 2026 18:30:00 +0800",
				description: "<p>摘要正文</p>",
				categories: ["旧分类"],
			},
		]);
	});

	it("matches frontmatter by explicit slug, filename slug, or title", () => {
		const entries = new Map();
		const frontmatter = {
			slug: "shortcode-showcase",
			title: "Solitude Hugo Shortcode 使用指南",
		};
		addFrontmatterToIndex(entries, frontmatter, "shortcodes");
		assert.deepEqual(
			selectFrontmatter(
				entries,
				"shortcode-showcase",
				"Solitude Hugo Shortcode 使用指南",
			),
			frontmatter,
		);
		assert.deepEqual(
			selectFrontmatter(
				entries,
				"shortcodes",
				"Solitude Hugo Shortcode 使用指南",
			),
			frontmatter,
		);
	});

	it("does not treat an Atom enclosure image as the article link", () => {
		const feed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>只有封面</title><link href="https://cdn.example/cover.webp" rel="enclosure" type="image/webp"/></entry></feed>`;
		assert.deepEqual(parseFeed(feed), []);
	});

	it("uses Atom content before falling back to summary", () => {
		assert.deepEqual(
			resolveBody(null, { content: "<p>正文</p>", description: "摘要" }),
			{
				body: "<p>正文</p>",
				truncated: false,
			},
		);
		assert.deepEqual(resolveBody(null, { description: "摘要" }), {
			body: "摘要",
			truncated: true,
		});
	});
});
