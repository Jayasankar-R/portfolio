# Jayasankar R Portfolio

A portfolio for Jayasankar R covering full-stack software, cloud-native delivery, and embedded systems work. The page is a quiet, hairline-and-type interface around one 3D object: a machined stack of six graphite plates, one for each layer of the work, from the interface down to the hardware pins.

The full design system (palette, type, components, layout, motion rules and banned patterns) lives in [DESIGN.md](DESIGN.md).

## What happens on the page

- **Hero:** the headline rises line by line while the six plates drop into place, bottom layer first. The assembled stack follows the pointer.
- **Profile:** the statement brightens word by word at reading pace, and the stats count up.
- **Work:** the three roles stack on top of each other as you scroll, with older roles receding.
- **Skills:** the section pins while the stack explodes. Each layer slides out in turn (Interface, Services, Data, Platform, Firmware, Hardware) and signal pulses travel between plates.
- **Projects:** vertical scroll pans four panels sideways with a slight 3D turn. Each panel runs a diagram of what the project does: the GoFarm RAG orbit, controller step responses for the heat exchanger, automatic source switching for the hybrid inverter, and the bootloader's erase, write, verify and jump cycle.
- **Repositories:** a live list from the public GitHub API, with skeleton loading, an empty state, and error states with a retry button.
- **Theme:** follows the system setting. The switch in the header grows the new theme in as a circle.

## Technology

- HTML, CSS and vanilla JavaScript ES modules. No build step.
- [Three.js](https://threejs.org/) 0.169 for the stack (`scene.js`), loaded on demand through an import map. Plate patterns are drawn procedurally into canvas textures.
- [GSAP](https://gsap.com/) 3.13 with ScrollTrigger (pinning, scrubbing, horizontal pan) and SplitText (line and word reveals).
- [Lenis](https://lenis.darkroom.engineering/) 1.1 for inertial wheel scrolling. Touch scrolling stays native.
- Native CSS: `light-dark()` theme tokens, cascade layers, container queries, `@property`, scroll-driven animation for the reading progress bar, and the View Transitions API for the theme switch.
- Fonts: Archivo (variable weight and width) and JetBrains Mono from Google Fonts. Icons: Phosphor Light, inlined as an SVG sprite.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Content and structure |
| `styles.css` | Tokens and all styling, organised in cascade layers |
| `script.js` | Theme, menu, smooth scroll, scroll choreography, GitHub feed, and the bridge to the 3D scene |
| `scene.js` | The Three.js stack |
| `visuals.js` | The live project diagrams |
| `favicon.svg` | Stack mark |
| `DESIGN.md` | Design system |

## Run locally

Serve the folder with any static server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` directly from disk will not work, because ES modules need to be served over HTTP.

## Editing content

- Personal details, experience, skills layers, projects and contact links are in `index.html`.
- The GitHub username for the live feed is `GITHUB_USER` in `script.js`.
- Resume PDFs are in `assets/resumes/`.
- Colour, type and motion tokens are at the top of `styles.css`.

After changing `styles.css`, `script.js`, `scene.js` or `visuals.js`, bump the `?v=` value where each file is referenced (in `index.html` and in the imports in `script.js`) so browsers pick up the new version.

## Accessibility and performance

- Respects `prefers-reduced-motion`. Smooth scrolling, pins, scrubbing and loops turn off, and a static CSS exploded view replaces the WebGL stack.
- The page stays complete without JavaScript or WebGL. The CSS stack is the fallback for both.
- Skip link, visible focus rings, a focus-trapped mobile menu that closes on Escape, and labelled controls.
- Only `transform` and `opacity` animate. Blur is limited to fixed elements, and grain sits on a fixed layer.
- The WebGL loop runs only while its stage is on screen and the tab is visible. Pixel ratio is capped at 1.75.

## Previous versions

Earlier versions are kept in `.backup/`. The glass bento version that this redesign replaces is in `.backup/v2-ethereal-glass/`.
