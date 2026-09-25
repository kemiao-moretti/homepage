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

function darkToggleFunctionality() {
	document.getElementById("darkToggle")?.addEventListener("click", () => {
		document.documentElement.classList.add("duration-300");

		if (document.documentElement.classList.contains("dark")) {
			localStorage.removeItem("dark_mode");
			showDay(true);
		} else {
			localStorage.setItem("dark_mode", true);
			showNight(true);
		}
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
