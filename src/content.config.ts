import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { blogPostsLoader } from "./loaders/blog-posts";

const postCollection = defineCollection({
	loader: blogPostsLoader(),
	schema: z.object({
		title: z.string(),
		description: z.string().default(""),
		date: z.coerce.date(),
		updated: z.coerce.date().optional(),
		cover: z.string().optional(),
		categories: z.array(z.string()).default([]),
		tags: z.array(z.string()).default([]),
		series: z.array(z.string()).default([]),
		aiSummary: z.string().optional(),
		sourceUrl: z.string(),
		dateFormatted: z.string(),
		/** true 表示正文提取失败、已降级为 RSS 摘要 */
		truncated: z.boolean().default(false),
	}),
});

export const collections = {
	post: postCollection,
};
