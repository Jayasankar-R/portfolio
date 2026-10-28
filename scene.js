/* =========================================================
   The stack: six graphite plates, one per layer of the work,
   from interface (top) down to hardware (bottom).

   One renderer and one canvas. script.js moves the canvas
   between the hero stage and the skills stage and feeds in
   scroll state through update().
   ========================================================= */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const LAYERS = ["interface", "services", "data", "platform", "firmware", "hardware"];
const ACCENT = new THREE.Color("#6FE3C1");
const PLATE_SIZE = 3.2;
const PLATE_THICKNESS = 0.1;
const GAP_ASSEMBLED = 0.075;
const GAP_EXPLODED = 0.74;
const VIA_INSET = 1.18;
const PULSE_COUNT = 24;
const CAMERA_AZIMUTH = 0.72;
const SLIDE_DISTANCE = 0.85;

const THEMES = {
    dark: { plate: "#182123", env: 0.55, edge: 0.34, shadow: ACCENT.clone(), shadowOpacity: 0.16, additive: true },
    light: { plate: "#1C2527", env: 0.95, edge: 0.42, shadow: new THREE.Color("#0C1112"), shadowOpacity: 0.3, additive: false },
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (from, to, t) => from + (to - from) * t;
const damp = (from, to, rate, dt) => lerp(from, to, 1 - Math.exp(-rate * dt));
const smoothstep = (edge0, edge1, value) => {
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * @param {{ theme?: "dark" | "light", onContextLost?: () => void }} options
 * @returns {{
 *   canvas: HTMLCanvasElement,
 *   mount: (stage: HTMLElement, mode: "hero" | "skills") => void,
 *   update: (state: { heroProgress?: number, skillsProgress?: number, active?: number }) => void,
 *   setRunning: (running: boolean) => void,
 *   setTheme: (theme: "dark" | "light") => void,
 *   playIntro: () => void,
 *   destroy: () => void,
 * }}
 */
export function createStackScene({ theme = "dark", onContextLost } = {}) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");

    const disposables = [];
    const track = (item) => {
        disposables.push(item);
        return item;
    };

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = track(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const stack = new THREE.Group();
    scene.add(stack);

    /* ---------- plates ---------- */
    const plateGeometry = track(new THREE.BoxGeometry(PLATE_SIZE, PLATE_THICKNESS, PLATE_SIZE));
    const edgeGeometry = track(new THREE.EdgesGeometry(plateGeometry));
    const faceGeometry = track(new THREE.PlaneGeometry(PLATE_SIZE * 0.94, PLATE_SIZE * 0.94));
    const bodyMaterial = track(new THREE.MeshStandardMaterial({ metalness: 0.62, roughness: 0.36 }));
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const plates = LAYERS.map((key, index) => {
        const group = new THREE.Group();
        const body = new THREE.Mesh(plateGeometry, bodyMaterial);

        const faceMaterial = track(new THREE.MeshBasicMaterial({
            map: track(createPatternTexture(key, index, anisotropy)),
            color: ACCENT,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        }));
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.rotation.x = -Math.PI / 2;
        face.position.y = PLATE_THICKNESS / 2 + 0.003;

        const edgeMaterial = track(new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.3, toneMapped: false }));
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);

        group.add(body, face, edges);
        stack.add(group);
        return { group, faceMaterial, edgeMaterial, slide: 0, face: 0.5, edge: 0.3, drop: 0 };
    });

    /* ---------- vias and signal pulses between plates ---------- */
    const viaCorners = [
        [-VIA_INSET, -VIA_INSET],
        [VIA_INSET, -VIA_INSET],
        [VIA_INSET, VIA_INSET],
        [-VIA_INSET, VIA_INSET],
    ];
    const viaPositions = new Float32Array(viaCorners.length * 6);
    const viaGeometry = track(new THREE.BufferGeometry());
    viaGeometry.setAttribute("position", new THREE.BufferAttribute(viaPositions, 3));
    const viaMaterial = track(new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, toneMapped: false }));
    const vias = new THREE.LineSegments(viaGeometry, viaMaterial);
    vias.frustumCulled = false;
    stack.add(vias);

    const pulsePositions = new Float32Array(PULSE_COUNT * 3);
    const pulseGeometry = track(new THREE.BufferGeometry());
    pulseGeometry.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));
    const pulseMaterial = track(new THREE.PointsMaterial({
        color: ACCENT,
        size: 0.15,
        map: track(createGlowTexture(64, [[0, 1], [0.35, 0.85], [1, 0]])),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
        toneMapped: false,
    }));
    const pulses = new THREE.Points(pulseGeometry, pulseMaterial);
    pulses.frustumCulled = false;
    stack.add(pulses);

    const pulseSeeds = Array.from({ length: PULSE_COUNT }, (_, i) => ({
        corner: i % viaCorners.length,
        phase: (i * 0.618034) % 1,
        speed: 0.16 + (i % 5) * 0.035,
        upward: i % 2 === 0,
    }));

    /* ---------- soft shadow (light) or glow (dark) under the stack ----------
       Kept smaller than the camera frame and faded to zero well inside its
       radius, so the canvas edge never clips it into a visible rectangle. */
    const shadowMaterial = track(new THREE.MeshBasicMaterial({
        map: track(createGlowTexture(256, [[0, 1], [0.5, 0.35], [0.85, 0.04], [1, 0]])),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
    }));
    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(5.6, 5.6)), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    stack.add(shadow);

    /* ---------- state ---------- */
    const target = { mode: "hero", heroProgress: 0, skillsProgress: 0, active: -1 };
    const view = { explode: 0, yaw: 0, tiltX: 0, tiltY: 0, pulses: 0 };
    const pointer = { x: 0, y: 0 };
    let themeSettings = THEMES.dark;
    let idleYaw = 0;
    let elapsed = 0;
    let intro = null;

    const onPointerMove = (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    function goals() {
        if (target.mode === "skills") {
            const progress = target.skillsProgress;
            return {
                explode: smoothstep(0, 0.14, progress),
                yaw: -0.62 + progress * 0.5 + Math.sin(elapsed * 0.35) * 0.06,
                tiltX: 0,
                tiltY: 0,
                pulses: smoothstep(0.08, 0.2, progress),
            };
        }
        const progress = target.heroProgress;
        return {
            explode: progress * 0.35,
            yaw: idleYaw + progress * 1.4,
            tiltX: pointer.y * 0.12,
            tiltY: pointer.x * 0.22,
            pulses: 0,
        };
    }

    function faceGoal(index, isActive, hasActive) {
        if (target.mode === "skills") return isActive ? 1 : hasActive ? 0.16 : 0.5;
        return index === 0 ? 0.62 : 0.4;
    }

    function updateIntro() {
        const time = elapsed - intro.start;
        let done = true;
        plates.forEach((plate, index) => {
            const order = LAYERS.length - 1 - index;
            const local = clamp01((time - order * 0.11) / 0.9);
            plate.drop = (1 - easeOutCubic(local)) * 6;
            if (local < 1) done = false;
        });
        if (done) intro = null;
    }

    function step(dt) {
        elapsed += dt;
        if (target.mode === "hero") idleYaw += dt * 0.16;
        if (intro) updateIntro();

        const goal = goals();
        view.explode = damp(view.explode, goal.explode, 6, dt);
        view.yaw = damp(view.yaw, view.yaw + wrapAngle(goal.yaw - view.yaw), 5, dt);
        view.tiltX = damp(view.tiltX, goal.tiltX, 3, dt);
        view.tiltY = damp(view.tiltY, goal.tiltY, 3, dt);
        view.pulses = damp(view.pulses, goal.pulses, 4, dt);

        const gap = lerp(GAP_ASSEMBLED, GAP_EXPLODED, view.explode);
        const pitch = PLATE_THICKNESS + gap;
        const half = (pitch * (LAYERS.length - 1)) / 2;
        const hasActive = target.mode === "skills" && target.active >= 0;

        // the active plate slides toward screen-right, so convert that direction into the stack's local space
        const azimuth = CAMERA_AZIMUTH + view.tiltY;
        const rightX = Math.cos(azimuth);
        const rightZ = -Math.sin(azimuth);
        const cos = Math.cos(-view.yaw);
        const sin = Math.sin(-view.yaw);
        const slideX = rightX * cos + rightZ * sin;
        const slideZ = -rightX * sin + rightZ * cos;

        plates.forEach((plate, index) => {
            const isActive = hasActive && index === target.active;
            plate.slide = damp(plate.slide, isActive ? 1 : 0, 7, dt);
            plate.face = damp(plate.face, faceGoal(index, isActive, hasActive), 6, dt);
            plate.edge = damp(plate.edge, isActive ? 0.95 : hasActive ? 0.2 : themeSettings.edge, 6, dt);

            const offset = plate.slide * SLIDE_DISTANCE;
            plate.group.position.set(slideX * offset, half - index * pitch + plate.drop, slideZ * offset);
            plate.faceMaterial.opacity = plate.face;
            plate.edgeMaterial.opacity = plate.edge;
        });

        stack.rotation.y = view.yaw;
        shadow.position.y = -half - 0.45;
        shadowMaterial.opacity = themeSettings.shadowOpacity * (1 - view.explode * 0.4);

        const top = half + PLATE_THICKNESS / 2;
        const bottom = -top;
        viaCorners.forEach(([x, z], i) => viaPositions.set([x, bottom, z, x, top, z], i * 6));
        viaGeometry.attributes.position.needsUpdate = true;
        viaMaterial.opacity = view.pulses * 0.28;

        pulseSeeds.forEach((seed, i) => {
            seed.phase = (seed.phase + dt * seed.speed) % 1;
            const t = seed.upward ? seed.phase : 1 - seed.phase;
            const [x, z] = viaCorners[seed.corner];
            pulsePositions[i * 3] = x;
            pulsePositions[i * 3 + 1] = bottom + t * (top - bottom);
            pulsePositions[i * 3 + 2] = z;
        });
        pulseGeometry.attributes.position.needsUpdate = true;
        pulseMaterial.opacity = view.pulses;

        // fit the projected width and height of the stack to whichever stage holds the canvas
        const elevation = lerp(0.52, 0.3, view.explode) + view.tiltX;
        const spread = PLATE_SIZE * 0.7071 + (target.mode === "skills" ? SLIDE_DISTANCE * 0.6 : 0);
        const halfHeight = spread * Math.sin(elevation) + (half + PLATE_THICKNESS) * Math.cos(elevation);
        const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        const tanH = tanV * camera.aspect;
        const distance = Math.max(spread / tanH, halfHeight / tanV) * 1.08 + spread * Math.cos(elevation) * 0.5;
        camera.position.set(
            Math.sin(azimuth) * Math.cos(elevation) * distance,
            Math.sin(elevation) * distance,
            Math.cos(azimuth) * Math.cos(elevation) * distance,
        );
        camera.lookAt(0, 0, 0);
    }

    function snapToGoals() {
        const goal = goals();
        Object.assign(view, goal);
        plates.forEach((plate) => {
            plate.slide = 0;
        });
    }

    /* ---------- loop ---------- */
    let running = false;
    let lost = false;
    let frameId = 0;
    let last = 0;

    function frame(now) {
        frameId = requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        step(dt);
        renderer.render(scene, camera);
    }

    function sync() {
        const shouldRun = running && !lost && !document.hidden;
        if (shouldRun && !frameId) {
            last = performance.now();
            frameId = requestAnimationFrame(frame);
        } else if (!shouldRun && frameId) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }
    }

    document.addEventListener("visibilitychange", sync);

    canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        lost = true;
        sync();
        onContextLost?.();
    });

    canvas.addEventListener("webglcontextrestored", () => {
        lost = false;
        sync();
    });

    /* ---------- stage mounting ---------- */
    let stageElement = null;

    function resize() {
        if (!stageElement) return;
        const width = stageElement.clientWidth;
        const height = stageElement.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);

    function setTheme(name) {
        themeSettings = THEMES[name] || THEMES.dark;
        bodyMaterial.color.set(themeSettings.plate);
        bodyMaterial.envMapIntensity = themeSettings.env;
        shadowMaterial.color.copy(themeSettings.shadow);
        const blending = themeSettings.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
        [shadowMaterial, pulseMaterial].forEach((material) => {
            material.blending = blending;
            material.needsUpdate = true;
        });
    }

    setTheme(theme);

    return {
        canvas,

        mount(stage, mode) {
            if (stage !== stageElement) {
                if (stageElement) resizeObserver.unobserve(stageElement);
                stage.append(canvas);
                stageElement = stage;
                resizeObserver.observe(stage);
                resize();
            }
            if (mode !== target.mode) {
                target.mode = mode;
                snapToGoals();
            }
        },

        update(state) {
            if (typeof state.heroProgress === "number") target.heroProgress = state.heroProgress;
            if (typeof state.skillsProgress === "number") target.skillsProgress = state.skillsProgress;
            if (typeof state.active === "number") target.active = state.active;
        },

        setRunning(value) {
            running = value;
            sync();
        },

        setTheme,

        playIntro() {
            intro = { start: elapsed };
            plates.forEach((plate) => {
                plate.drop = 6;
            });
        },

        destroy() {
            running = false;
            sync();
            resizeObserver.disconnect();
            window.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("visibilitychange", sync);
            disposables.forEach((item) => item.dispose?.());
            renderer.dispose();
            canvas.remove();
        },
    };
}

/* =========================================================
   Procedural plate patterns, drawn once into canvas textures.
   White on transparent; the material tints them with the accent.
   ========================================================= */

const MARGIN = 40;

const PATTERNS = {
    // app window: title bar, sidebar, content cards
    interface(ctx, size) {
        const w = size - MARGIN * 2;
        strokeRound(ctx, MARGIN, MARGIN, w, w, 22);
        line(ctx, MARGIN, MARGIN + 52, MARGIN + w, MARGIN + 52);
        for (let i = 0; i < 3; i++) dot(ctx, MARGIN + 28 + i * 22, MARGIN + 26, 5);
        line(ctx, MARGIN + 120, MARGIN + 52, MARGIN + 120, MARGIN + w);
        for (let i = 0; i < 6; i++) {
            const y = MARGIN + 92 + i * 40;
            line(ctx, MARGIN + 26, y, MARGIN + 72 + (i % 3) * 14, y);
        }
        const gx = MARGIN + 146;
        const gy = MARGIN + 80;
        const cw = (w - 146 - 26 - 20) / 2;
        const ch = 128;
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 2; c++) {
                const x = gx + c * (cw + 20);
                const y = gy + r * (ch + 20);
                strokeRound(ctx, x, y, cw, ch, 14);
                line(ctx, x + 18, y + 26, x + 18 + cw * 0.45, y + 26);
                withAlpha(ctx, 0.45, () => ctx.fillRect(x + 18, y + ch - 46, (cw - 36) * (0.45 + 0.2 * ((r * 2 + c) % 3)), 22));
            }
        }
        const textTop = gy + 2 * (ch + 20) + 6;
        line(ctx, gx, textTop, gx + (w - 172) * 0.85, textTop);
        line(ctx, gx, textTop + 26, gx + (w - 172) * 0.55, textTop + 26);
    },

    // service graph with orthogonal connectors
    services(ctx, size) {
        const span = size - MARGIN * 2;
        const nodes = [[0.16, 0.2], [0.5, 0.12], [0.84, 0.22], [0.28, 0.5], [0.66, 0.46], [0.14, 0.84], [0.48, 0.82], [0.86, 0.74]]
            .map(([x, y]) => [MARGIN + x * span, MARGIN + y * span]);
        const links = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [3, 6], [4, 6], [4, 7], [6, 7]];
        withAlpha(ctx, 0.7, () => {
            links.forEach(([a, b]) => {
                const [x1, y1] = nodes[a];
                const [x2, y2] = nodes[b];
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
        });
        nodes.forEach(([x, y], i) => {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            dot(ctx, x, y, 19);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, Math.PI * 2);
            ctx.stroke();
            dot(ctx, x, y, i % 3 === 0 ? 7 : 4);
        });
    },

    // table: header, rows, columns, values
    data(ctx, size, rand) {
        const w = size - MARGIN * 2;
        strokeRound(ctx, MARGIN, MARGIN, w, w, 18);
        withLineWidth(ctx, 4, () => line(ctx, MARGIN, MARGIN + 58, MARGIN + w, MARGIN + 58));
        const cols = [MARGIN + 120, MARGIN + 240, MARGIN + 340];
        withAlpha(ctx, 0.5, () => cols.forEach((x) => line(ctx, x, MARGIN, x, MARGIN + w)));
        const rowH = (w - 58) / 8;
        withAlpha(ctx, 0.35, () => {
            for (let r = 1; r < 8; r++) line(ctx, MARGIN, MARGIN + 58 + r * rowH, MARGIN + w, MARGIN + 58 + r * rowH);
        });
        const starts = [MARGIN, ...cols];
        starts.forEach((x, i) => withLineWidth(ctx, 5, () => line(ctx, x + 18, MARGIN + 29, x + 58 + (i % 2) * 18, MARGIN + 29)));
        for (let r = 0; r < 8; r++) {
            const y = MARGIN + 58 + r * rowH + rowH / 2;
            starts.forEach((x, c) => {
                const next = c < cols.length ? cols[c] : MARGIN + w;
                const cellW = next - x - 36;
                withAlpha(ctx, 0.4 + rand() * 0.5, () => withLineWidth(ctx, 3, () => line(ctx, x + 18, y, x + 18 + cellW * (0.3 + rand() * 0.6), y)));
            });
        }
    },

    // cluster of container slots, some running
    platform(ctx, size, rand) {
        const n = 5;
        const gap = 16;
        const area = size - MARGIN * 2 - 24;
        const cell = (area - gap * (n - 1)) / n;
        const start = MARGIN + 12;
        ctx.save();
        ctx.setLineDash([10, 9]);
        ctx.globalAlpha = 0.6;
        strokeRound(ctx, MARGIN - 4, MARGIN - 4, size - MARGIN * 2 + 8, size - MARGIN * 2 + 8, 26);
        ctx.restore();
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const x = start + c * (cell + gap);
                const y = start + r * (cell + gap);
                strokeRound(ctx, x, y, cell, cell, 12);
                if (rand() < 0.45) {
                    withAlpha(ctx, 0.32, () => {
                        ctx.beginPath();
                        roundRectPath(ctx, x + 8, y + 8, cell - 16, cell - 16, 7);
                        ctx.fill();
                    });
                } else {
                    dot(ctx, x + cell / 2, y + cell / 2, 4);
                }
            }
        }
    },

    // memory dump: addresses and bytes, one row highlighted
    firmware(ctx, size, rand) {
        const rows = 13;
        const rowH = (size - MARGIN * 2) / rows;
        for (let r = 0; r < rows; r++) {
            const y = MARGIN + r * rowH + rowH / 2;
            withAlpha(ctx, 0.5, () => withLineWidth(ctx, 3, () => line(ctx, MARGIN + 6, y, MARGIN + 52, y)));
            for (let b = 0; b < 8; b++) {
                const x = MARGIN + 84 + b * 44;
                withAlpha(ctx, 0.25 + rand() * 0.75, () => ctx.fillRect(x, y - 6, 30, 12));
            }
        }
        strokeRound(ctx, MARGIN - 6, MARGIN + 5 * rowH, size - MARGIN * 2 + 12, rowH, 8);
    },

    // chip with pins, traces fanning out to vias at the edge
    hardware(ctx, size) {
        const c = size / 2;
        const chip = 150;
        const half = chip / 2;
        strokeRound(ctx, c - half, c - half, chip, chip, 14);
        withAlpha(ctx, 0.6, () => strokeRound(ctx, c - 42, c - 42, 84, 84, 8));
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) dot(ctx, c - 27 + i * 18, c - 27 + j * 18, 2.5);
        }
        const pins = 7;
        const pitch = chip / (pins + 1);
        const reach = c - MARGIN;
        for (let side = 0; side < 4; side++) {
            ctx.save();
            ctx.translate(c, c);
            ctx.rotate((side * Math.PI) / 2);
            for (let p = 1; p <= pins; p++) {
                const offset = -half + p * pitch;
                const bend = -half - 40 - Math.abs(p - (pins + 1) / 2) * 10;
                const spread = offset * 1.7;
                withLineWidth(ctx, 4, () => line(ctx, offset, -half, offset, -half - 16));
                withAlpha(ctx, 0.7, () => {
                    ctx.beginPath();
                    ctx.moveTo(offset, -half - 16);
                    ctx.lineTo(offset, bend);
                    ctx.lineTo(spread, bend - Math.abs(spread - offset));
                    ctx.lineTo(spread, -reach + 14);
                    ctx.stroke();
                });
                ctx.beginPath();
                ctx.arc(spread, -reach + 8, 6, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    },
};

function createPatternTexture(key, seed, anisotropy) {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    PATTERNS[key](ctx, size, mulberry32(seed + 11));

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
}

function createGlowTexture(size, stops) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([offset, alpha]) => gradient.addColorStop(offset, `rgba(255, 255, 255, ${alpha})`));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function roundRectPath(ctx, x, y, w, h, r) {
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
}

function strokeRound(ctx, x, y, w, h, r) {
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function dot(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function withAlpha(ctx, alpha, draw) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    draw();
    ctx.restore();
}

function withLineWidth(ctx, width, draw) {
    ctx.save();
    ctx.lineWidth = width;
    draw();
    ctx.restore();
}

function mulberry32(seed) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
