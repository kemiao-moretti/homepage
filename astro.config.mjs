import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// 开发模式下 Astro 把图片挂在 /_image 上，URL 里只有路径和宽高，没有内容哈希，
// 但响应头是「public, max-age=31536000」。于是换掉图片文件后 URL 一字不差，
// 浏览器直接命中一年强缓存 —— 页面看着就像改动没生效。
// 生产构建的文件名自带哈希，没这个问题，所以只在 dev 下把这个头改掉。
function devImageNoStore() {
	return {
		name: "dev-image-no-store",
		apply: "serve",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith("/_image")) return next();
				const setHeader = res.setHeader.bind(res);
				res.setHeader = (name, value) =>
					setHeader(
						name,
						String(name).toLowerCase() === "cache-control" ? "no-store" : value,
					);
				const writeHead = res.writeHead.bind(res);
				res.writeHead = (status, ...rest) => {
					const headers = rest.find(
						(v) => v && typeof v === "object" && !Array.isArray(v),
					);
					if (headers) {
						for (const key of Object.keys(headers)) {
							if (key.toLowerCase() === "cache-control") delete headers[key];
						}
					}
					setHeader("cache-control", "no-store");
					return writeHead(status, ...rest);
				};
				next();
			});
		},
	};
}

// https://astro.build/config
export default defineConfig({
	// canonical / og / sitemap / robots 都依赖它，换域名时记得同步改 public/robots.txt
	site: "https://home.518339.xyz",
	// Astro 7 的默认值改成了 "jsx"，会像 React 一样剥离标签之间的空白，
	// 导致模板里跨行的文本被拼在一起。这里保持旧行为。
	compressHTML: true,
	integrations: [sitemap()],
	vite: {
		plugins: [devImageNoStore(), tailwindcss()],
	},
});
