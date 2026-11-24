<div align="center">

<img src="public/icon.svg" width="96" alt="Exakto Logo">

# Exakto

**Exact mathematics. Anywhere.**

Scientific · Offline · Open Source

**[▶ Try the live demo](https://morenobueno.github.io/exakto/)**

<img src="https://img.shields.io/badge/HTML5-1c2333?style=flat-square&logo=html5&logoColor=e34f26" alt="HTML5"> <img src="https://img.shields.io/badge/JavaScript-1c2333?style=flat-square&logo=javascript&logoColor=f7df1e" alt="JavaScript"> <img src="https://img.shields.io/badge/CSS3-1c2333?style=flat-square&logo=css3&logoColor=1572b6" alt="CSS3"> <img src="https://img.shields.io/badge/BigInt-1c2333?style=flat-square&logoColor=white" alt="BigInt">

Fractions, roots and π stay exact – textbook-style display, works offline, zero dependencies.

[Deutsch](README.md) · [English](README.en.md)

<img src="docs/screenshot-dark.png" width="260" alt="Exakto dark"> &nbsp; <img src="docs/screenshot-light.png" width="260" alt="Exakto light"> &nbsp; <img src="docs/screenshot-menu.png" width="260" alt="Function menu">

</div>

## Why Exakto?

Many school and university calculators work exactly (`2/3 + 1/4 = 11/12`, `√12 = 2√3`), but there is hardly anything comparable for the browser. Exakto brings that way of working to your PC: usable with mouse, keyboard and numpad, installable as an app and fully offline.

## Features

- **Exact arithmetic:** fractions, mixed numbers, simplified roots, multiples of π, exact angle values (30°/45°). Toggle exact/decimal with `◀▶≈`. Exact results and approximations are clearly separated.
- **Textbook input:** fractions, roots, powers, absolute value, Σ, Π, ∫ and d/dx are shown as in a book and edited with the arrow keys. Undo/redo with `Ctrl+Z` / `Ctrl+Y`.
- **Functions:** trigonometric and hyperbolic functions, ln/log, nCr/nPr, gcd/lcm, angle units, polar/rectangular, 23 constants, unit conversion, number bases (bin/oct/dec/hex).
- **Graphs (`F2`):** up to three functions, zoom, pan, trace; poles (`1/x`, `tan x`) are not connected.
- **Engineering (`F3`):** electrical tools with SI prefixes (`4.7k`, `100n`, `47µ`) and unit checking: Ohm, voltage divider, series RLC with impedance, resonance and power.
- **Calculus & statistics:** numeric integration and derivative, sums/products, 1-var/2-var, regressions, normal, binomial, Poisson and geometric distributions.
- **Second functions:** complex numbers (`2nd π`), matrices A–C up to 4×4 (`2nd math`), 2D/3D vectors (`2nd EE`), number operations `op` (Pol/Rec, prime factors, divisors, division with remainder) and set operations `set op` on L1–L3.
- **Solvers:** equations (numeric, shown with ≈; uncertain candidates marked “unconfirmed”), polynomials of degree 2/3 (exact, incl. complex roots), 2×2/3×3 systems, value table.
- **Comfort:** history, variables and lists are kept locally. **Share a calculation as a link**, **export history as CSV**.
- **For everyone:** light/dark, three sizes, German/English, fully keyboard-operable, labelled keys and announced results for screen readers, touch targets ≥ 44 px, reduced motion.
- **Offline and installable (PWA)** – no server, no tracking, no dependencies. Also available as **one single HTML file** (`exakto.html`).

<div align="center">
<img src="docs/screenshot-graph.png" width="240" alt="Graph mode"> &nbsp; <img src="docs/screenshot-menu-algebra.png" width="240" alt="Algebra menu"> &nbsp; <img src="docs/screenshot-phone2.png" width="200" alt="Phone view with subfolder"><br><img src="docs/screenshot-tools.png" width="520" alt="Electrical tools">
</div>

## Known limits

- Complex numbers, matrices and vectors run in their own menus (they cannot be typed directly into the main expression).
- Decimal input (`0.1`) is an approximation; integer and fraction input stays exact. Not a full computer algebra system.
- Numeric root finding, integral and derivative are approximations. No finite grid is guaranteed to find all roots.
- Units exist only in the engineering panel (checked per field), not in the main calculator.
- Calculations run on the main thread; limits on expression length and number size protect against hangs.

Details: [docs/MATH.md](docs/MATH.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (German)

## Use it

**Online (GitHub Pages):** [https://morenobueno.github.io/exakto/](https://morenobueno.github.io/exakto/) – free, no sign-up, and it keeps working offline afterwards.

**Locally:** open `exakto.html` (from the releases, or `npm run build:standalone` → `release/`) in a browser. It is a single self-contained file and works offline.

**As an app:** on the Pages address choose “Install” / “Add to Home Screen”.

**Function menu:** the grid icon at the top opens every function as **folders with icons** (Calculate, Solve, Algebra, Statistics, Numbers, Tools, Settings, plus “Recently used”) – no 2nd needed. Folders can contain subfolders (e.g. Calculate › Calculus); `←` goes up one level, `⌂` to the top, the path bar jumps to any level (keyboard: arrows, `Enter`, `clear`/`Esc` = back). The **blue second-function labels** above the keys are tappable too. Switch to graph/engineering via TOOLS (or `F2`/`F3`). Settings and help are behind the **?** button (or the `?` / `F1` key).

## Development

Requires Node.js ≥ 20, nothing else.

```bash
npm ci                    # install (currently no dependencies) per lockfile
npm test                  # builds dist/ and runs all tests
npm run test:e2e          # browser tests (needs Chrome/Chromium; set CHROME_PATH)
npm run build             # website -> dist/
npm run build:standalone  # single file -> release/exakto.html
npm run serve             # http://localhost:8080 (for PWA / service worker)
```

### Publish your own copy (fork)

1. Fork the repository, or push this folder to your own public repository `exakto` (branch `main`).
2. **Settings → Pages → Source: GitHub Actions**.
3. `pages.yml` tests, builds and publishes on every push to `main`; `ci.yml` also checks pull requests without write permissions.
4. For a download release push a tag such as `v1.2.0`; `release.yml` attaches `exakto.html`.

Your copy will be served at `https://USER.github.io/exakto/`. All paths are relative, so the project works in a sub-path. GitHub Pages and Actions are free for public repositories.

## Roadmap

- [x] Calculation core with acceptance tests, limits on expression length
- [x] Responsive UI, keyboard, README, MIT, Pages demo, HTML download
- [x] PWA, versioned cache, local data
- [x] Graph analysis: zeros, minimum/maximum, intersections, y-intercept; touch support
- [x] Time limit for long calculations, ⚠ warning when integrals do not converge
- [x] End-to-end browser tests in CI
- [x] Function menu as folders with icons and sublevels, tappable second-function labels
- [ ] More engineering modules
- [ ] Abortable calculations via web worker (today: time limit of about 6 seconds), tests on real phones and screen readers

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

Exakto is an independent open-source project and is not affiliated with any calculator manufacturer. All trademarks belong to their owners. Results are carefully tested but do not replace verification for critical calculations.

## License

[MIT](LICENSE)
