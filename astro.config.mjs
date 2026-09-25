import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	// Astro 7 的默认值改成了 "jsx"，会像 React 一样剥离标签之间的空白，
	// 导致模板里跨行的文本被拼在一起。这里保持旧行为。
	compressHTML: true,
	vite: {
		plugins: [tailwindcss()],
	},
});
