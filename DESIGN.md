# Design System: Jayasankar R Portfolio

Design read: a developer portfolio for recruiters and engineering leads hiring across software and embedded roles. The language is a clean, hairline-and-type interface around one cinematic 3D object, built with native HTML and CSS, Three.js, GSAP ScrollTrigger and Lenis.

Dials: Variance 7 (offset asymmetric), Motion 9 (cinematic choreography), Density 3 (airy, gallery spacing).

## 1. Visual Theme & Atmosphere

A quiet engineering drawing that comes alive under scroll. The page itself is restrained: cool graphite or paper-steel surfaces, generous negative space, hairline structure, confident condensed type. All of the drama is spent in one place, a machined "stack" of six graphite plates rendered in WebGL. Each plate is one layer of the work Jayasankar does, from interface down to hardware pins. In the hero the plates sit assembled and drift under the pointer. In the skills section the stack explodes on a pinned scroll, and each layer slides out like a server blade while signal pulses travel between plates.

The feeling is "lab bench at night": precise, calm, a little luminous. Nothing glows except the traces on the plates and the single accent.

The page follows the system theme and offers a manual switch. Both themes are fully designed. The light theme is cool paper steel, never warm cream.

## 2. Color Palette & Roles

Dark theme (default when the system is dark)

- **Graphite Canvas** (#0C1112) - page background
- **Raised Graphite** (#121819) - elevated shells, nav island glass base
- **Plate Surface** (#141B1C) - inner core of double-bezel cards
- **Signal White** (#E6EDEB) - primary text
- **Muted Steel** (#8E9C99) - secondary text, descriptions, metadata (6.4:1 on canvas)
- **Hairline** (rgba(230,237,235,0.09)) - structural 1px lines, card borders
- **Trace Mint** (#6FE3C1) - the single accent: primary button fill, focus rings, active indicators, 3D traces

Light theme

- **Paper Steel** (#EEF2F1) - page background
- **Raised Paper** (#F8FAFA) - elevated shells
- **Plate Surface** (#FBFCFC) - inner core of cards
- **Graphite Ink** (#101617) - primary text and primary button fill
- **Slate Muted** (#56625F) - secondary text (5.6:1 on paper)
- **Hairline** (rgba(16,22,23,0.10)) - structural lines
- **Deep Trace** (#0B7259) - text-level accent, focus rings (5.2:1 on paper). Same hue as Trace Mint, darkened for contrast

Rules

- One accent hue for the whole page. Trace Mint and Deep Trace are the same hue at two lightness values.
- The 3D plates stay graphite in both themes, like a dark component photographed on a light bench.
- No pure black (#000000) and no pure white (#FFFFFF).
- No purple, violet or blue glow. No gradient text. No neon outer shadows.

## 3. Typography Rules

- **Display and body:** Archivo, variable font with weight (100 to 900) and width (62% to 125%) axes. The width axis is an active design element: headlines are set semi-condensed (width 80% to 86%) and expand slightly as they reveal.
- **Display headlines:** weight 600 to 650, letter-spacing -0.03em to -0.035em, line-height 0.95 to 1.0, `text-wrap: balance`. Hierarchy comes from weight, width and color, not raw size.
- **Body:** weight 400, 1.0625rem, line-height 1.6, max 62 characters per line, `text-wrap: pretty`.
- **Mono:** JetBrains Mono 400/500, only for technical tokens: protocol and tool tags, dates, file-like strings. Never for generic labels.
- **Case:** sentence case everywhere. No all-caps tracked labels.
- **Banned:** Inter, Roboto, Arial, Open Sans, Helvetica, any generic serif.

## 4. Component Stylings

- **Buttons:** fully rounded pills, 3.25rem tall. The trailing icon sits in its own circular well flush with the right padding. Hover moves the well (down for downloads, diagonally for external links). Active state presses to scale 0.98. Primary: Trace Mint fill with Graphite Canvas text in dark, Graphite Ink fill with Paper Steel text in light. Ghost: transparent with a strong hairline.
- **Magnetic pull:** on fine pointers, primary buttons drift up to 30% toward the cursor and spring back on leave.
- **Cards (double bezel):** used only where elevation means something (the stacking role cards and the project panels). Outer shell: 1.75rem radius, faint tinted fill, hairline border, 0.375rem padding. Inner core: concentric 1.375rem radius, plate surface fill, inset 1px top highlight.
- **Tags:** pill, JetBrains Mono 0.75rem, hairline border, muted text.
- **Nav island:** floating glass pill detached from the top edge, blur 16px. A small Trace Mint bar slides under the active section link. The header hides while scrolling down and returns on scroll up.
- **Menu overlay (mobile):** full-screen glass. The hamburger bars rotate into an X. Links rise from masks with a 60ms stagger.
- **Loading:** shimmer skeleton rows that match the final repository row layout. No spinners.
- **Empty and error states:** a plain sentence that says what happened and what to do, plus a retry button or a direct link.
- **Radius system:** pill for every interactive control and tag, 1.75rem for cards, 0.75rem for small blocks inside diagrams.

## 5. Layout Principles

- Max content width 84rem, fluid gutter `clamp(1rem, 4vw, 3rem)`, section rhythm `clamp(6rem, 14vw, 11rem)`.
- Every section uses a different layout family:
  - Hero: asymmetric 7/5 split, copy left, live 3D stack right.
  - Profile: one large reading paragraph, then a four-column stat rule divided by hairlines.
  - Work: sticky depth stack of three role cards.
  - Skills: pinned split, layer index left, exploded 3D stack right.
  - Projects: pinned horizontal pan of four panels, each with a live diagram of what the project does.
  - Repositories: two-column list rows with top hairlines.
  - Contact: oversized headline and full-width link rows.
- Hero fits the first viewport: brand strip, two-line headline, one short lede, two resume buttons.
- No overlapping text and imagery. The 3D canvas lives inside its own stage element and never sits behind copy.
- Below 900px every split collapses to one column. The skills stage becomes a sticky viewer above the layer list. The project pan becomes a vertical list. Sticky role cards turn off below 768px wide or 700px tall.
- Full-height sections use `100svh`, never `100vh`.

## 6. Motion & Interaction

- **Engines:** GSAP 3.13 with ScrollTrigger and SplitText for scroll choreography, Lenis for inertial smooth scrolling (wheel only, touch stays native), Three.js for the stack, CSS scroll-driven animation for the reading progress bar, the View Transitions API for the theme switch.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, `cubic-bezier(0.34, 1.56, 0.64, 1)` for small spring feedback, `cubic-bezier(0.65, 0, 0.35, 1)` for state changes. Scroll-scrubbed motion is linear by definition.
- **Every animation has a job:**
  - Page load: headline lines rise from masks while the plates drop into place, bottom layer first.
  - Profile: words brighten at reading pace as the paragraph scrolls through.
  - Work: older roles recede and dim as newer ones stack on top, showing chronology.
  - Skills: the stack explodes and walks layer by layer, showing breadth from interface to pin.
  - Projects: panels pan sideways with a slight 3D turn. Each diagram runs its project's real behavior: a RAG pipeline orbit, controller step responses, automatic source switching, a bootloader erase-write-verify-jump cycle.
  - Theme switch: a circular reveal grows from the switch button.
- **Performance:** only `transform` and `opacity` animate. Blur only on fixed elements. Grain lives on a fixed pseudo-element. The WebGL loop stops when its stage is off screen or the tab is hidden. Pixel ratio is capped at 1.75.
- **Reduced motion:** no smooth scroll, no pins, no scrubbing, no loops. The 3D stack is replaced by a static CSS exploded view and all content renders in place.

## 7. Anti-Patterns (Banned)

- No emojis.
- No Inter, no generic serif fonts.
- No pure black or pure white.
- No purple or blue AI glow, no neon outer shadows, no gradient text.
- No custom cursors.
- No em-dashes or en-dashes anywhere on the page. Use a hyphen, comma, colon or period.
- No all-caps eyebrow labels above every section, no section numbering (01, 02), no middle-dot meta strings.
- No div-built fake dashboards or fake terminals. Diagrams show real project behavior and are labeled as illustrative where values are simulated.
- No progress bars with filled background tracks used as comparison visuals.
- No three equal cards in a row.
- No scroll cues ("Scroll to explore", bouncing chevrons).
- No filler copy ("Elevate", "Seamless", "Unleash", "Next-Gen").
- No invented metrics. Every number on the page comes from the resume.
- No `window.addEventListener("scroll")`. Scroll logic runs through ScrollTrigger, IntersectionObserver or CSS scroll timelines.
