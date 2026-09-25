import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	// canonical / og / sitemap / robots 都依赖它，换域名时记得同步改 public/robots.txt
	site: "https://home.518339.xyz",
	// Astro 7 的默认值改成了 "jsx"，会像 React 一样剥离标签之间的空白，
	// 导致模板里跨行的文本被拼在一起。这里保持旧行为。
	compressHTML: true,
	integrations: [sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
