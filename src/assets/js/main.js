// Add your javascript here

window.darkMode = false;

let headerElement = null;
let headerShell = null;
let headerSurface = null;
let isPill = false;
let ticking = false;

document.addEventListener("DOMContentLoaded", () => {
	headerElement = document.getElementById("header");
	headerShell = headerElement?.firstElementChild ?? null;
	headerSurface = headerShell?.firstElementChild ?? null;

	if (
		localStorage.getItem("dark_mode") &&
		localStorage.getItem("dark_mode") === "true"
	) {
		window.darkMode = true;
		showNight();
	} else {
		showDay();
	}

	evaluateHeaderPosition();
	applyMenuItemClasses();
	mobileMenuFunctionality();
	darkToggleFunctionality();
	feedCopyFunctionality();
	codeCopyDelegate();
	contextMenuFunctionality();

	window.addEventListener("scroll", onScroll, { passive: true });
});

function onScroll() {
	if (ticking) return;
	ticking = true;
	window.requestAnimationFrame(() => {
		ticking = false;
		evaluateHeaderPosition();
	});
}

// 悬浮胶囊变形：滚动超过 12px 时给 shell / surface 同时挂 .is-pill。
// 用语义类而不是原子类，避免依赖 Tailwind 对 JS 字符串里类名的扫描。
window.evaluateHeaderPosition = () => {
	if (!headerShell || !headerSurface) return;

	const pill = window.scrollY > 12;
	if (pill === isPill) return;

	isPill = pill;
	headerShell.classList.toggle("is-pill", pill);
	headerSurface.classList.toggle("is-pill", pill);
};

window.stickyHeaderFuncionality = onScroll;

// 主题切换的唯一入口：header 的日 / 月按钮与右键菜单里的切换按钮都走这里。
// 两处各写一遍「改 html.dark + 写 localStorage + 同步日 / 月图标」，早晚会漂移成
// 「主题变了但 header 还写着日间」。
// animate = false 给右键菜单用 —— 面板要立刻换肤，等不了那 500ms 的日落动画。
function setColorScheme(dark, animate = true) {
	document.documentElement.classList.add("duration-300");

	if (dark) {
		localStorage.setItem("dark_mode", true);
		showNight(animate);
	} else {
		localStorage.removeItem("dark_mode");
		showDay(animate);
	}

	// showDay / showNight 只在 animate 那条路径里改 class，非动画路径得自己翻
	if (!animate) document.documentElement.classList.toggle("dark", dark);
}

function darkToggleFunctionality() {
	document.getElementById("darkToggle")?.addEventListener("click", () => {
		setColorScheme(!document.documentElement.classList.contains("dark"));
	});
}

function showDay(animate) {
	document.getElementById("sun").classList.remove("setting");
	document.getElementById("moon").classList.remove("rising");

	let timeout = 0;

	if (animate) {
		timeout = 500;

		document.getElementById("moon").classList.add("setting");
	}

	setTimeout(() => {
		document.getElementById("dayText").classList.remove("hidden");
		document.getElementById("nightText").classList.add("hidden");

		document.getElementById("moon").classList.add("hidden");
		document.getElementById("sun").classList.remove("hidden");

		if (animate) {
			document.documentElement.classList.remove("dark");
			document.getElementById("sun").classList.add("rising");
		}
	}, timeout);
}

function showNight(animate) {
	document.getElementById("moon").classList.remove("setting");
	document.getElementById("sun").classList.remove("rising");

	let timeout = 0;

	if (animate) {
		timeout = 500;

		document.getElementById("sun").classList.add("setting");
	}

	setTimeout(() => {
		document.getElementById("nightText").classList.remove("hidden");
		document.getElementById("dayText").classList.add("hidden");

		document.getElementById("sun").classList.add("hidden");
		document.getElementById("moon").classList.remove("hidden");

		if (animate) {
			document.documentElement.classList.add("dark");
			document.getElementById("moon").classList.add("rising");
		}
	}, timeout);
}

// 导航当前项高亮已在 header.astro 里由服务端判定；
// 这里保留运行时兜底，供客户端路由或锚点跳转后补正。
window.applyMenuItemClasses = () => {
	const menuItems = document.querySelectorAll("#menu a");
	for (let i = 0; i < menuItems.length; i++) {
		if (menuItems[i].pathname === window.location.pathname) {
			menuItems[i].classList.add(
				"text-black",
				"underline",
				"decoration-dashed",
				"decoration-1",
				"underline-offset-4",
				"dark:text-white",
			);
		}
	}
};

function mobileMenuFunctionality() {
	document.getElementById("openMenu").addEventListener("click", () => {
		openMobileMenu();
	});

	document.getElementById("closeMenu").addEventListener("click", () => {
		closeMobileMenu();
	});
}

window.openMobileMenu = () => {
	document.getElementById("openMenu").classList.add("hidden");
	document.getElementById("closeMenu").classList.remove("hidden");
	document.getElementById("menu").classList.remove("hidden");
	document.getElementById("mobileMenuBackground").classList.add("opacity-0");
	document.getElementById("mobileMenuBackground").classList.remove("hidden");

	setTimeout(() => {
		document
			.getElementById("mobileMenuBackground")
			.classList.remove("opacity-0");
	}, 1);
};

window.closeMobileMenu = () => {
	document.getElementById("closeMenu").classList.add("hidden");
	document.getElementById("openMenu").classList.remove("hidden");
	document.getElementById("menu").classList.add("hidden");
	document.getElementById("mobileMenuBackground").classList.add("hidden");
};

// 订阅卡：复制 RSS 地址
function feedCopyFunctionality() {
	const button = document.getElementById("copyFeedUrl");
	if (!button) return;

	button.addEventListener("click", async () => {
		const value = document.getElementById("feedUrl")?.value ?? "";
		if (!value) return;

		try {
			await navigator.clipboard.writeText(value);
		} catch {
			// 剪贴板 API 不可用时退化为「选中让用户手动复制」
			document.getElementById("feedUrl")?.select();
			return;
		}

		const original = button.textContent;
		button.textContent = "已复制";
		setTimeout(() => {
			button.textContent = original;
		}, 1500);
	});
}

// 远程文章正文里的代码复制按钮（博客主题的 data-code-copy）
function codeCopyDelegate() {
	document.addEventListener("click", async (event) => {
		const trigger = event.target?.closest?.("[data-code-copy]");
		if (!trigger) return;

		const container = trigger.closest("figure") ?? trigger.parentElement;
		const code = container?.querySelector("code")?.textContent ?? "";
		if (!code) return;

		try {
			await navigator.clipboard.writeText(code);
		} catch {
			/* 剪贴板不可用时静默降级 */
		}
	});
}

// --- 自定义右键菜单 ---------------------------------------------------------
// 豁免清单只剩「原生菜单确实更好用」的地方：可编辑控件与媒体元素。
// 链接 / 图片 / 选中文字都已被接管，对应的能力（复制链接地址、在新标签页打开、复制文字）
// 由菜单自己提供；Ctrl(⌘) + 右键与 [data-context-menu='off'] 是随时退回原生菜单的逃生口。
const CONTEXT_MENU_EXEMPT =
	"input, textarea, select, [contenteditable]:not([contenteditable='false']), video, audio, [data-context-menu='off']";

const CM_INDEX_KEY = "__cmIndex";
const CM_INDEX_MAX = "__cmIndexMax";

function readSessionNumber(key) {
	try {
		const raw = sessionStorage.getItem(key);
		return raw === null ? null : Number(raw);
	} catch {
		return null;
	}
}

function writeSessionNumber(key, value) {
	try {
		sessionStorage.setItem(key, String(value));
	} catch {
		/* 禁用存储时静默降级 */
	}
}

// 浏览器没有「能否前进」的 API。给每条历史记录打一个自增序号：
// history.state 随条目一起被保存/恢复（含 bfcache 与刷新），sessionStorage 记本标签页见过的最大序号，
// 于是 idx > 0 即能后退、idx < max 即能前进。没有序号的条目一律当作新条目。
function stampHistoryEntry() {
	let index = history.state?.[CM_INDEX_KEY];
	let max = readSessionNumber(CM_INDEX_MAX);

	if (typeof index !== "number") index = (max ?? -1) + 1;
	if (max === null || index > max) max = index;
	writeSessionNumber(CM_INDEX_MAX, max);

	if (history.state?.[CM_INDEX_KEY] !== index) {
		history.replaceState(
			{ ...(history.state ?? {}), [CM_INDEX_KEY]: index },
			"",
		);
	}
}

function historyAvailability() {
	const index = history.state?.[CM_INDEX_KEY];
	const current = typeof index === "number" ? index : 0;
	const max = readSessionNumber(CM_INDEX_MAX) ?? current;
	return { canBack: current > 0, canForward: current < max };
}

function contextMenuFunctionality() {
	const menu = document.getElementById("contextMenu");
	if (!menu) return;
	// 触屏设备不接管：长按的默认行为是选字/存图，抢过来只会添乱
	if (window.matchMedia("(hover: none)").matches) return;

	stampHistoryEntry();

	const items = [...menu.querySelectorAll("[data-cm-action]")];
	const themeButton = menu.querySelector('[data-cm-action="theme"]');
	const targetSep = menu.querySelector('[data-cm-sep="target"]');
	const titles = {
		page: menu.dataset.cmTitlePage ?? "",
		link: menu.dataset.cmTitleLink ?? "",
		image: menu.dataset.cmTitleImage ?? "",
		text: menu.dataset.cmTitleText ?? "",
	};

	// 文案全部来自组件上的 data-*（源头是 pages.json），JS 里不出现可见中文。
	// 先把原始文案抄一份，复制反馈（已复制 / 复制失败）用完要能复原。
	const labelOf = (item) => item.querySelector("[data-cm-label]");
	const defaultLabels = new Map(
		items
			.map((item) => [item, labelOf(item)?.textContent ?? ""])
			.filter(([, text]) => text !== ""),
	);

	const isOpen = () => menu.classList.contains("is-open");
	const isDisabled = (item) => item.classList.contains("is-disabled");
	const isUsable = (item) => !item.hidden && !isDisabled(item);

	// 右键按下会连选区一起清掉，所以「按下的那一刻」要先把选中的文字连同它在屏幕上的
	// 矩形一起存下来，之后靠落点判断这次右键是不是落在选中内容里。
	// 不用 range.intersectsNode：点到 <body>、<main> 这类祖先元素时它会返回 true，
	// 页面上留下一处旧选区就会到处冒出「复制文字」。
	let pendingText = null;
	// 菜单打开时锁定的目标与文本，供点击动作取用
	let activeTarget = null;
	let activeText = "";
	// 每次打开自增。复制成功后的延迟关闭要认这个号，
	// 否则「复制完立刻重新右键」会被上一个定时器顺手把新菜单关掉。
	let openToken = 0;

	const hitSelection = (x, y) =>
		!!pendingText &&
		pendingText.rects.some(
			(r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
		);

	// 链接优先：卡片缩略图这类「图包在链里」的结构，访客要的是链接而不是图片地址
	const resolveTarget = (node) => {
		const anchor = node?.closest?.("a[href]");
		if (anchor?.href) return { type: "link", url: anchor.href };

		const image = node?.closest?.("img");
		const url = image?.currentSrc || image?.src;
		return url ? { type: "image", url } : null;
	};

	const setDisabled = (action, disabled) => {
		for (const item of items) {
			if (item.dataset.cmAction !== action) continue;
			item.classList.toggle("is-disabled", disabled);
			item.setAttribute("aria-disabled", disabled ? "true" : "false");
		}
	};

	// 目标组只显示命中的那几条，靠 hidden 属性切（CSS 里有 .context-menu__item[hidden] 兜底），
	// hidden 同时把条目移出无障碍树，键盘导航也就不用再单独过滤
	const setTargetContext = (target, text) => {
		const kinds = new Set();
		if (target) kinds.add(target.type);
		if (text) kinds.add("text");

		for (const item of items) {
			const when = item.dataset.cmWhen;
			if (!when) continue;
			item.hidden = !when.split(/\s+/).some((kind) => kinds.has(kind));
		}
		if (targetSep) targetSep.hidden = kinds.size === 0;

		const heading = target
			? titles[target.type]
			: text
				? titles.text
				: titles.page;
		// 顶排图标行取消了可见的 eyebrow 标题，「这次右键命中了什么」改由 aria-label 承担
		menu.setAttribute("aria-label", heading || titles.page);

		activeTarget = target;
		activeText = text;
	};

	const syncThemeButton = () => {
		if (!themeButton) return;
		const next = document.documentElement.classList.contains("dark")
			? themeButton.dataset.cmThemeDay
			: themeButton.dataset.cmThemeNight;
		if (!next) return;
		themeButton.setAttribute("aria-label", next);
		themeButton.setAttribute("title", next);
	};

	// 「回到主页」已经在主页时就该是灰的。构建产物里首页是 /index.html，
	// 经静态服务按目录访问时是 /，两种都算主页。
	const isHome = () => /^\/(index\.html)?$/.test(window.location.pathname);

	const syncState = () => {
		const { canBack, canForward } = historyAvailability();
		const page = document.documentElement;
		setDisabled("back", !canBack);
		setDisabled("forward", !canForward);
		setDisabled("home", isHome());
		setDisabled("top", window.scrollY <= 1);
		setDisabled(
			"bottom",
			window.scrollY + window.innerHeight >= page.scrollHeight - 1,
		);
	};

	const resetLabels = () => {
		for (const [item, text] of defaultLabels) {
			const label = labelOf(item);
			if (label) label.textContent = text;
		}
	};

	const close = () => menu.classList.remove("is-open", "is-ready");

	const open = (x, y, target, text) => {
		menu.classList.remove("is-ready", "is-open");
		openToken += 1;
		resetLabels();
		// 先按目标把该显示的条目摆好，再量尺寸 —— 否则会在「上一种目标」的
		// 高度上算夹取，面板会贴着视口边沿弹开一截
		setTargetContext(target, text);
		syncThemeButton();
		syncState();
		menu.classList.add("is-open");

		const { width, height } = menu.getBoundingClientRect();
		const margin = 8;
		const left = Math.max(
			margin,
			Math.min(x, window.innerWidth - width - margin),
		);
		const top = Math.max(
			margin,
			Math.min(y, window.innerHeight - height - margin),
		);

		menu.style.setProperty("--cm-x", `${Math.round(left)}px`);
		menu.style.setProperty("--cm-y", `${Math.round(top)}px`);
		// 缩放原点落在光标相对面板的位置，动画就是从鼠标点「长出来」的
		menu.style.setProperty("--cm-origin-x", `${Math.round(x - left)}px`);
		menu.style.setProperty("--cm-origin-y", `${Math.round(y - top)}px`);
		menu.classList.add("is-ready");
	};

	const scrollToEdge = (top) => {
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
	};

	const openInNewTab = (url) => {
		if (url) window.open(url, "_blank", "noopener,noreferrer");
	};

	// 复制：成功 → 条目当场变成「已复制」，留 900ms 给访客看到再收起菜单；
	// 失败 → 保持打开，让访客改走 Ctrl + 右键去用原生菜单
	const copyWithFeedback = async (item, value) => {
		const token = openToken;
		let copied = false;

		if (value) {
			try {
				await navigator.clipboard.writeText(value);
				copied = true;
			} catch {
				copied = false;
			}
		}

		const label = labelOf(item);
		if (label) {
			label.textContent = copied
				? menu.dataset.cmCopied
				: menu.dataset.cmCopyFailed;
		}
		if (!copied) return;

		window.setTimeout(() => {
			if (token === openToken) close();
		}, 900);
	};

	document.addEventListener("contextmenu", (event) => {
		// Ctrl / ⌘ + 右键交还浏览器，保留「另存为 / 检查元素」这类入口
		if (event.ctrlKey || event.metaKey) return;
		if (menu.contains(event.target)) {
			event.preventDefault();
			return;
		}
		if (event.target?.closest?.(CONTEXT_MENU_EXEMPT)) return;

		// 键盘唤出（菜单键 / Shift + F10）时 clientX 与 clientY 都是 0，
		// 照用坐标会把面板丢到视口左上角，所以改成贴着目标元素的矩形定位。
		const byKeyboard = event.clientX === 0 && event.clientY === 0;
		const rect = byKeyboard ? event.target?.getBoundingClientRect?.() : null;
		const x = rect ? rect.left + Math.min(24, rect.width / 2) : event.clientX;
		const y = rect ? rect.top + Math.min(24, rect.height / 2) : event.clientY;
		// 键盘唤出时没有 pointerdown 快照，但此刻选区还在，直接读活的
		const text = byKeyboard
			? (window.getSelection()?.toString().trim() ?? "")
			: hitSelection(event.clientX, event.clientY)
				? (pendingText?.text ?? "")
				: "";

		event.preventDefault();
		open(x, y, resolveTarget(event.target), text);
	});

	menu.addEventListener("click", async (event) => {
		const item = event.target?.closest?.("[data-cm-action]");
		if (!item || item.hidden || isDisabled(item)) return;
		const action = item.dataset.cmAction;

		// 切换按钮不关菜单：连着点就能对比两套配色
		if (action === "theme") {
			setColorScheme(
				!document.documentElement.classList.contains("dark"),
				false,
			);
			syncThemeButton();
			return;
		}
		if (action === "copyText") {
			await copyWithFeedback(item, activeText);
			return;
		}
		if (action === "copyLink" || action === "copyImage") {
			await copyWithFeedback(item, activeTarget?.url ?? "");
			return;
		}
		if (action === "openLink" || action === "openImage") {
			close();
			openInNewTab(activeTarget?.url);
			return;
		}

		close();
		switch (action) {
			case "back":
				history.back();
				break;
			case "forward":
				history.forward();
				break;
			case "refresh":
				window.location.reload();
				break;
			case "home":
				window.location.assign("/");
				break;
			case "top":
				scrollToEdge(0);
				break;
			case "bottom":
				scrollToEdge(document.documentElement.scrollHeight);
				break;
			default:
				break;
		}
	});

	document.addEventListener(
		"pointerdown",
		(event) => {
			if (event.button === 2) {
				const selection = window.getSelection();
				const text = selection?.toString().trim() ?? "";
				pendingText =
					text && selection.rangeCount
						? {
								text,
								rects: Array.from(selection.getRangeAt(0).getClientRects()),
							}
						: null;
			}
			if (isOpen() && !menu.contains(event.target)) close();
		},
		true,
	);

	window.addEventListener("scroll", close, { passive: true, capture: true });
	window.addEventListener("resize", close);
	window.addEventListener("pagehide", close);

	document.addEventListener("keydown", (event) => {
		if (!isOpen()) return;

		if (event.key === "Escape" || event.key === "Tab") {
			close();
			return;
		}
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

		event.preventDefault();
		const enabled = items.filter(isUsable);
		if (!enabled.length) return;

		const step = event.key === "ArrowDown" ? 1 : -1;
		const current = enabled.indexOf(document.activeElement);
		const next =
			current === -1
				? step > 0
					? 0
					: enabled.length - 1
				: (current + step + enabled.length) % enabled.length;
		enabled[next].focus();
	});
}
