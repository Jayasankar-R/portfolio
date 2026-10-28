/* =========================================================
   Live project diagrams. Each one runs only while it is on
   screen, and holds a finished state under reduced motion.
   No animation library needed: CSS transitions do the motion.
   ========================================================= */

const POWER_SOURCES = ["solar", "battery", "grid"];
const POWER_INTERVAL_MS = 2800;

const FLASH_STATUS = {
    receive: "Receiving image over UART",
    erase: "Erasing application pages",
    verify: "Checksum verified",
    jump: "Jumping to application",
};

export function initProjectVisuals({ reduceMotion }) {
    const chart = document.querySelector("[data-viz='chart']");
    const power = document.querySelector("[data-viz='power']");
    const flash = document.querySelector("[data-viz='flash']");

    if (chart) initChart(chart, reduceMotion);
    if (power) initPower(power, reduceMotion);
    if (flash) initFlash(flash, reduceMotion);
}

function onVisibility(element, callback, threshold = 0.35) {
    const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => callback(entry.isIntersecting, observer)),
        { threshold }
    );
    observer.observe(element);
}

/* Heat exchanger: sweep the three step responses in once, like a scope trace. */
function initChart(chart, reduceMotion) {
    if (reduceMotion) {
        chart.classList.add("is-drawn");
        return;
    }
    onVisibility(chart, (visible, observer) => {
        if (!visible) return;
        chart.classList.add("is-drawn");
        observer.disconnect();
    });
}

/* Hybrid inverter: automatic source switching between solar, battery and grid. */
function initPower(power, reduceMotion) {
    const label = power.querySelector("[data-power-label]");
    let index = 0;
    let timer = 0;

    const show = (next) => {
        index = next;
        power.dataset.source = POWER_SOURCES[index];
        if (label) label.textContent = `Running on ${POWER_SOURCES[index]}`;
    };

    show(0);
    if (reduceMotion) return;

    onVisibility(power, (visible) => {
        window.clearInterval(timer);
        if (visible) timer = window.setInterval(() => show((index + 1) % POWER_SOURCES.length), POWER_INTERVAL_MS);
    });
}

/* Bootloader: receive, erase, write page by page, verify, jump. Then repeat. */
function initFlash(flash, reduceMotion) {
    const pages = Array.from(flash.querySelectorAll(".flash-page"));
    const steps = Array.from(flash.querySelectorAll("[data-step]"));
    const status = flash.querySelector("[data-flash-status]");
    let timers = [];

    const setPhase = (phase, text = FLASH_STATUS[phase]) => {
        flash.dataset.phase = phase;
        steps.forEach((step) => step.classList.toggle("is-active", step.dataset.step === phase));
        if (status) status.textContent = text;
    };

    const at = (delay, action) => timers.push(window.setTimeout(action, delay));

    const stop = () => {
        timers.forEach((timer) => window.clearTimeout(timer));
        timers = [];
    };

    const run = () => {
        stop();
        let time = 0;

        at(time, () => {
            pages.forEach((page) => page.classList.remove("is-erased", "is-written"));
            setPhase("receive");
        });
        time += 1300;

        at(time, () => setPhase("erase"));
        pages.forEach((page, i) => at(time + 120 + i * 45, () => page.classList.add("is-erased")));
        time += 1300;

        pages.forEach((page, i) => at(time + i * 120, () => {
            page.classList.remove("is-erased");
            page.classList.add("is-written");
            setPhase("write", `Writing page ${i + 1} of ${pages.length}`);
        }));
        time += pages.length * 120 + 400;

        at(time, () => setPhase("verify"));
        time += 1100;

        at(time, () => setPhase("jump"));
        time += 1800;

        at(time, run);
    };

    if (reduceMotion) {
        pages.forEach((page) => page.classList.add("is-written"));
        setPhase("jump");
        return;
    }

    onVisibility(flash, (visible) => (visible ? run() : stop()));
}
