/* =========================================================
   Jayasankar R portfolio: page behavior.

   Motion stack: GSAP 3.13 with ScrollTrigger and SplitText,
   plus Lenis for smooth scrolling, all loaded as deferred CDN
   scripts in index.html. scene.js pulls in Three.js on demand.
   If a library is missing or the visitor prefers reduced
   motion, the page renders complete and static.
   ========================================================= */

import { initProjectVisuals } from "./visuals.js?v=20261028b";

const root = document.documentElement;
const { gsap, ScrollTrigger, SplitText, Lenis } = window;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const canAnimate = Boolean(gsap && ScrollTrigger) && !reduceMotion;
const canSplit = canAnimate && Boolean(SplitText);

const DESKTOP = "(min-width: 900px) and (min-height: 600px)";
const COMPACT = "(max-width: 899px), (max-height: 599px)";
const STACKED_CARDS = "(min-width: 768px) and (min-height: 700px)";

const GITHUB_USER = "Jayasankar-R";
const GITHUB_CACHE_KEY = "github-repos:v2";
const GITHUB_CACHE_MS = 15 * 60 * 1000;
const GITHUB_TIMEOUT_MS = 8000;
const SVG_NS = "http://www.w3.org/2000/svg";

root.classList.add(canAnimate ? "motion-ready" : "no-motion");
if (canAnimate) gsap.registerPlugin(...[ScrollTrigger, SplitText].filter(Boolean));

/* ---------- bridge between scroll state and the 3D stack ---------- */
const stack = {
    scene: null,
    state: { heroProgress: 0, skillsProgress: 0, active: -1 },
    set(partial) {
        Object.assign(this.state, partial);
        this.scene?.update(this.state);
    },
};

const layerList = document.querySelector("[data-layers]");
const layerItems = Array.from(document.querySelectorAll("[data-layer]"));
const fallbackPlates = Array.from(document.querySelectorAll('[data-stage="skills"] .sf-plate'));
let activeLayer = -2;

function setActiveLayer(index) {
    if (index === activeLayer) return;
    activeLayer = index;
    layerList?.classList.toggle("has-active", index >= 0);
    layerItems.forEach((item, i) => item.classList.toggle("is-active", i === index));
    fallbackPlates.forEach((plate, i) => plate.classList.toggle("is-active", i === index));
    stack.set({ active: index });
}

/* ---------- boot ---------- */
const lenis = initSmoothScroll();

initYear();
initTheme();
initMenu();
initAnchors();
initActiveNav();
initGithubFeed();
initProjectVisuals({ reduceMotion });
initPointerEffects();
initStackScene();

if (canAnimate) {
    initHeader();
    initProgressFallback();
    whenFontsReady().then(() => {
        playIntro();
        initScrollScenes();
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
} else {
    stack.set({ skillsProgress: 1 });
    observeLayers();
}

function whenFontsReady(timeout = 1500) {
    const fonts = document.fonts?.ready ?? Promise.resolve();
    return Promise.race([fonts, new Promise((resolve) => window.setTimeout(resolve, timeout))]);
}

function initYear() {
    document.querySelectorAll("[data-year]").forEach((node) => {
        node.textContent = String(new Date().getFullYear());
    });
}

/* ---------- theme: system default, manual switch, circular View Transition ---------- */
function readStoredTheme() {
    try {
        return localStorage.getItem("theme");
    } catch {
        return null;
    }
}

function initTheme() {
    const button = document.querySelector("[data-theme-toggle]");
    const systemLight = window.matchMedia("(prefers-color-scheme: light)");

    const label = () => {
        button?.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    };

    const apply = (theme, persist) => {
        root.dataset.theme = theme;
        if (persist) {
            try {
                localStorage.setItem("theme", theme);
            } catch {
                /* storage blocked: the switch still works for this visit */
            }
        }
        label();
        stack.scene?.setTheme(theme);
    };

    label();

    systemLight.addEventListener("change", (event) => {
        if (!readStoredTheme()) apply(event.matches ? "light" : "dark", false);
    });

    button?.addEventListener("click", () => {
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        if (!document.startViewTransition || reduceMotion) {
            apply(next, true);
            return;
        }

        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        const transition = document.startViewTransition(() => apply(next, true));

        transition.ready
            .then(() => {
                root.animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                    { duration: 720, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" }
                );
            })
            .catch(() => {});
    });
}

/* ---------- smooth scroll ---------- */
function initSmoothScroll() {
    if (!canAnimate || !Lenis) return null;
    const instance = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    instance.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => instance.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return instance;
}

function initAnchors() {
    document.addEventListener("click", (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;

        const id = link.getAttribute("href").slice(1);
        const target = id ? document.getElementById(id) : null;
        if (!target) return;

        event.preventDefault();
        if (lenis) {
            lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
        } else {
            target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
        target.focus({ preventScroll: true });
        history.replaceState(null, "", `#${id}`);
    });
}

/* ---------- header: active section, hide on scroll down ---------- */
function initActiveNav() {
    const links = Array.from(document.querySelectorAll("[data-nav-link]"));
    const indicator = document.querySelector(".nav-indicator");
    const sections = links.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);
    if (!sections.length) return;

    const visible = new Set();

    const paint = () => {
        const current = sections.find((section) => visible.has(section));
        links.forEach((link) => {
            const isCurrent = Boolean(current) && link.hash === `#${current.id}`;
            if (isCurrent) {
                link.setAttribute("aria-current", "true");
                indicator?.style.setProperty("--x", `${link.offsetLeft + link.offsetWidth / 2 - indicator.offsetWidth / 2}px`);
            } else {
                link.removeAttribute("aria-current");
            }
        });
        indicator?.style.setProperty("--o", current ? "1" : "0");
    };

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
            paint();
        },
        { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
}

function initHeader() {
    const header = document.querySelector("[data-header]");
    if (!header) return;
    const compact = window.matchMedia("(max-width: 899px)");

    ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate(self) {
            const hide = !compact.matches
                && self.direction === 1
                && self.scroll() > window.innerHeight * 0.6
                && !root.classList.contains("menu-open");
            header.classList.toggle("is-hidden", hide);
        },
    });

    header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
}

function initProgressFallback() {
    if (window.CSS?.supports("animation-timeline: scroll()")) return;
    gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
}

/* ---------- mobile menu ---------- */
function initMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-menu]");
    if (!toggle || !menu) return;

    let open = false;
    let closeTimer = 0;

    const focusables = () => [toggle, ...menu.querySelectorAll("a")];

    const openMenu = () => {
        open = true;
        window.clearTimeout(closeTimer);
        menu.hidden = false;
        root.classList.add("menu-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
        lenis?.stop();
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => menu.classList.add("is-open")));
        menu.querySelector("a")?.focus({ preventScroll: true });
    };

    const closeMenu = ({ restoreFocus = true } = {}) => {
        if (!open) return;
        open = false;
        menu.classList.remove("is-open");
        root.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        lenis?.start();
        if (restoreFocus) toggle.focus({ preventScroll: true });
        closeTimer = window.setTimeout(() => {
            if (!open) menu.hidden = true;
        }, reduceMotion ? 0 : 600);
    };

    toggle.addEventListener("click", () => (open ? closeMenu() : openMenu()));

    menu.addEventListener("click", (event) => {
        if (event.target.closest("a")) closeMenu({ restoreFocus: false });
    });

    document.addEventListener("keydown", (event) => {
        if (!open) return;
        if (event.key === "Escape") {
            closeMenu();
            return;
        }
        if (event.key !== "Tab") return;
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    window.matchMedia("(min-width: 900px)").addEventListener("change", (event) => {
        if (event.matches) closeMenu({ restoreFocus: false });
    });
}

/* ---------- pointer: spotlight borders and magnetic buttons ---------- */
function initPointerEffects() {
    if (!finePointer) return;

    document.querySelectorAll("[data-spotlight]").forEach((card) => {
        card.addEventListener("pointermove", (event) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
            card.style.setProperty("--my", `${event.clientY - rect.top}px`);
        });
    });

    if (!canAnimate) return;

    document.querySelectorAll("[data-magnetic]").forEach((element) => {
        const xTo = gsap.quickTo(element, "x", { duration: 0.6, ease: "power3.out" });
        const yTo = gsap.quickTo(element, "y", { duration: 0.6, ease: "power3.out" });
        element.addEventListener("pointermove", (event) => {
            const rect = element.getBoundingClientRect();
            xTo((event.clientX - (rect.left + rect.width / 2)) * 0.3);
            yTo((event.clientY - (rect.top + rect.height / 2)) * 0.4);
        });
        element.addEventListener("pointerleave", () => {
            xTo(0);
            yTo(0);
        });
    });
}

/* ---------- hero intro: one orchestrated load moment ---------- */
function playIntro() {
    const title = document.querySelector("[data-intro-title]");
    const items = gsap.utils.toArray("[data-intro]");
    const timeline = gsap.timeline({ defaults: { ease: "expo.out" } });

    gsap.set(items, { y: 28 });

    if (title && canSplit) {
        SplitText.create(title, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
            autoSplit: true,
            onSplit(self) {
                gsap.set(title, { autoAlpha: 1 });
                return gsap.from(self.lines, { yPercent: 118, duration: 1.4, stagger: 0.1, ease: "expo.out", delay: 0.05 });
            },
        });
    } else if (title) {
        timeline.to(title, { autoAlpha: 1, duration: 1 }, 0);
    }

    timeline.to(items, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.35);
}

/* ---------- scroll choreography ---------- */
function initScrollScenes() {
    const mm = gsap.matchMedia();

    // hero: the copy drifts off while the stack begins to open
    gsap.to(".hero-copy", {
        yPercent: -12,
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 12%", scrub: true },
    });
    ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => stack.set({ heroProgress: self.progress }),
    });

    // profile: words brighten at reading pace
    const statement = document.querySelector("[data-words]");
    if (statement && canSplit) {
        SplitText.create(statement, {
            type: "words",
            wordsClass: "split-word",
            autoSplit: true,
            onSplit: (self) => gsap.fromTo(self.words, { opacity: 0.14 }, {
                opacity: 1,
                ease: "none",
                stagger: 0.12,
                scrollTrigger: { trigger: statement, start: "top 80%", end: "bottom 45%", scrub: true },
            }),
        });
    }

    // stats: numbers count up while the width axis settles
    const stats = document.querySelector(".stats");
    if (stats) {
        const statsTrigger = { trigger: stats, start: "top 85%", once: true };
        gsap.utils.toArray("[data-count]").forEach((node) => {
            const counter = { value: 0 };
            node.textContent = "0";
            gsap.to(counter, {
                value: Number(node.dataset.count),
                duration: 1.6,
                ease: "power2.out",
                onUpdate: () => {
                    node.textContent = String(Math.round(counter.value));
                },
                scrollTrigger: statsTrigger,
            });
        });
        gsap.fromTo(".stat dd", { "--wdth": 62, autoAlpha: 0 }, {
            "--wdth": 84,
            autoAlpha: 1,
            duration: 1.6,
            stagger: 0.08,
            ease: "expo.out",
            scrollTrigger: statsTrigger,
        });
    }

    // section titles rise line by line from masks
    if (canSplit) {
        gsap.utils.toArray("[data-title]").forEach((title) => {
            SplitText.create(title, {
                type: "lines",
                mask: "lines",
                linesClass: "split-line",
                autoSplit: true,
                onSplit: (self) => gsap.from(self.lines, {
                    yPercent: 115,
                    duration: 1.2,
                    stagger: 0.08,
                    ease: "expo.out",
                    scrollTrigger: { trigger: title, start: "top 86%", once: true },
                }),
            });
        });
    }

    // work: older roles recede as newer ones stack on top
    mm.add(STACKED_CARDS, () => {
        const roles = gsap.utils.toArray("[data-role]");
        const header = document.querySelector("[data-header]");
        const offset = (index) => (header?.offsetHeight ?? 76) + 20 + index * 18;
        const last = roles[roles.length - 1];

        roles.forEach((role, index) => {
            if (role === last) return;
            ScrollTrigger.create({
                trigger: role,
                start: () => `top ${offset(index)}px`,
                endTrigger: last,
                end: () => `top ${offset(roles.length - 1)}px`,
                pin: true,
                pinSpacing: false,
            });
            gsap.to(role.querySelector(".role-card"), {
                scale: 0.93,
                "--dim": 0.6,
                ease: "none",
                scrollTrigger: {
                    trigger: roles[index + 1],
                    start: "top bottom",
                    end: () => `top ${offset(index + 1)}px`,
                    scrub: true,
                },
            });
        });
    });

    // skills: pin the section while the stack explodes and walks each layer
    mm.add(DESKTOP, () => {
        const pin = document.querySelector("[data-skills-pin]");
        if (!pin) return undefined;
        const trigger = ScrollTrigger.create({
            trigger: pin,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * 3.4)}`,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => updateSkills(self.progress),
        });
        updateSkills(trigger.progress);
        return () => setActiveLayer(-1);
    });

    mm.add(COMPACT, () => {
        stack.set({ skillsProgress: 1 });
        return observeLayers();
    });

    // projects: vertical scroll pans the panels sideways with a slight 3D turn
    mm.add(DESKTOP, () => {
        const pin = document.querySelector("[data-projects-pin]");
        const track = document.querySelector("[data-projects-track]");
        const bar = document.querySelector(".projects-progress span");
        if (!pin || !track) return;

        const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth);
        const pan = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
                trigger: pin,
                start: "top top",
                end: () => `+=${distance()}`,
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    if (bar) gsap.set(bar, { scaleX: self.progress });
                },
            },
        });

        gsap.utils.toArray(".project").forEach((panel) => {
            const card = panel.querySelector(".project-card");
            gsap.timeline({
                scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left right", end: "right left", scrub: true },
            })
                .fromTo(card, { rotateY: -18, scale: 0.9, autoAlpha: 0.4 }, { rotateY: 0, scale: 1, autoAlpha: 1, ease: "none" })
                .to(card, { rotateY: 18, scale: 0.9, autoAlpha: 0.4, ease: "none" });
        });
    });

    // contact: rows settle in as the closing moment
    gsap.from(".contact-row", {
        autoAlpha: 0,
        y: 32,
        duration: 1,
        stagger: 0.08,
        ease: "expo.out",
        scrollTrigger: { trigger: ".contact-list", start: "top 88%", once: true },
    });
}

function updateSkills(progress) {
    stack.set({ skillsProgress: progress });
    const walk = (progress - 0.12) / 0.84;
    setActiveLayer(walk < 0 ? -1 : Math.min(layerItems.length - 1, Math.floor(walk * layerItems.length)));
}

function observeLayers() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActiveLayer(Number(entry.target.dataset.layer));
            });
        },
        { rootMargin: "-55% 0px -40% 0px" }
    );
    layerItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
}

/* ---------- 3D stack: lazy Three.js, shared canvas moved between stages ---------- */
async function initStackScene() {
    const stages = Array.from(document.querySelectorAll("[data-stage]"));
    if (!stages.length || reduceMotion || navigator.connection?.saveData) return;

    let createStackScene;
    try {
        ({ createStackScene } = await import("./scene.js?v=20261028b"));
    } catch (error) {
        console.warn("The 3D stack could not load, so the static version stays in place.", error);
        return;
    }

    let scene;
    try {
        scene = createStackScene({
            theme: root.dataset.theme,
            onContextLost: () => stages.forEach((stage) => stage.classList.remove("has-webgl")),
        });
    } catch (error) {
        console.warn("WebGL is unavailable, so the static version stays in place.", error);
        return;
    }

    stack.scene = scene;
    scene.update(stack.state);

    const visible = new Set();
    let mounted = false;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
            const stage = stages.find((item) => visible.has(item));
            if (stage) {
                scene.mount(stage, stage.dataset.stage);
                if (!mounted) {
                    mounted = true;
                    if (stage.dataset.stage === "hero" && window.scrollY < window.innerHeight * 0.5) scene.playIntro();
                    window.requestAnimationFrame(() => stages.forEach((item) => item.classList.add("has-webgl")));
                }
            }
            scene.setRunning(Boolean(stage));
        },
        { rootMargin: "15% 0px" }
    );
    stages.forEach((stage) => observer.observe(stage));
}

/* ---------- live GitHub repositories ---------- */
function initGithubFeed() {
    const list = document.getElementById("github-projects");
    const status = document.getElementById("github-status");
    if (!list || !status) return;

    const skeleton = Array.from(list.children).map((node) => node.cloneNode(true));

    const load = async () => {
        list.setAttribute("aria-busy", "true");
        list.replaceChildren(...skeleton.map((node) => node.cloneNode(true)));
        status.textContent = "Loading repositories from GitHub.";
        try {
            renderRepos(list, status, await fetchRepos());
        } catch (error) {
            renderRepoError(list, status, error, load);
        } finally {
            list.setAttribute("aria-busy", "false");
            if (canAnimate) ScrollTrigger.refresh();
        }
    };

    load();
}

function githubError(code, detail) {
    return Object.assign(new Error(detail || code), { code });
}

// The API response is untrusted input: keep only well-formed public repositories.
function isRepo(value) {
    return Boolean(value)
        && typeof value.name === "string"
        && typeof value.html_url === "string"
        && value.html_url.startsWith("https://github.com/");
}

function toRepo(value) {
    return {
        name: value.name,
        url: value.html_url,
        description: typeof value.description === "string" ? value.description : "",
        language: typeof value.language === "string" ? value.language : "",
        stars: Number.isFinite(value.stargazers_count) ? value.stargazers_count : 0,
        pushedAt: value.pushed_at || value.updated_at || null,
    };
}

function readRepoCache() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(GITHUB_CACHE_KEY) || "null");
        if (cached && Date.now() - cached.savedAt < GITHUB_CACHE_MS && Array.isArray(cached.repos)) return cached.repos;
    } catch {
        /* unreadable cache: fetch again */
    }
    return null;
}

function writeRepoCache(repos) {
    try {
        sessionStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), repos }));
    } catch {
        /* storage blocked: skip caching */
    }
}

async function fetchRepos() {
    const cached = readRepoCache();
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);

    try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=12`, {
            headers: { Accept: "application/vnd.github+json" },
            signal: controller.signal,
        });
        if (response.status === 403 || response.status === 429) throw githubError("rate-limit");
        if (!response.ok) throw githubError("http", `GitHub responded with ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data)) throw githubError("shape");

        const repos = data
            .filter(isRepo)
            .filter((repo) => !repo.fork && !repo.archived && repo.name.toLowerCase() !== GITHUB_USER.toLowerCase())
            .slice(0, 6)
            .map(toRepo);
        writeRepoCache(repos);
        return repos;
    } catch (error) {
        if (error.name === "AbortError") throw githubError("timeout");
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}

function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function icon(id) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `#${id}`);
    svg.append(use);
    return svg;
}

function formatMonth(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

function renderRepos(list, status, repos) {
    if (!repos.length) {
        status.textContent = "No public repositories yet. New work appears here once it is pushed to GitHub.";
        list.replaceChildren();
        return;
    }

    status.textContent = `${repos.length} repositories, most recently pushed first.`;

    const items = repos.map((repo) => {
        const item = node("li", "repo");
        const link = node("a", "repo-link");
        link.href = repo.url;
        link.target = "_blank";
        link.rel = "noreferrer";

        const arrow = node("span", "repo-arrow");
        arrow.append(icon("i-arrow-up-right"));

        const meta = node("span", "repo-meta");
        if (repo.language) meta.append(node("span", "", repo.language));
        const stars = node("span", "", String(repo.stars));
        stars.prepend(icon("i-star"));
        stars.setAttribute("aria-label", `${repo.stars} stars`);
        meta.append(stars);
        const month = formatMonth(repo.pushedAt);
        if (month) meta.append(node("span", "", `Updated ${month}`));

        link.append(
            node("span", "repo-name", repo.name),
            arrow,
            node("span", "repo-desc", repo.description || "Public GitHub repository by Jayasankar R."),
            meta
        );
        item.append(link);
        return item;
    });

    list.replaceChildren(...items);

    if (canAnimate) {
        gsap.from(items, {
            autoAlpha: 0,
            y: 24,
            duration: 0.9,
            stagger: 0.06,
            ease: "expo.out",
            scrollTrigger: { trigger: list, start: "top 90%", once: true },
        });
    }
}

function renderRepoError(list, status, error, retry) {
    const messages = {
        "rate-limit": "GitHub's hourly API limit for this network is used up. Try again later, or open the profile on GitHub.",
        timeout: "GitHub took too long to respond. Check your connection and try again.",
    };
    status.textContent = messages[error.code] || "Repositories could not load. Try again, or open the profile on GitHub.";

    const item = node("li", "repo-message");
    const button = node("button", "btn btn-ghost");
    button.type = "button";
    const well = node("span", "btn-well");
    well.append(icon("i-retry"));
    button.append(node("span", "", "Try again"), well);
    button.addEventListener("click", retry, { once: true });
    item.append(button);
    list.replaceChildren(item);
}
