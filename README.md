# Basic 101 Repair Sim

A first-person, browser-based IT hardware repair trainer built with [three.js](https://threejs.org/). Walk up to a broken machine, diagnose the fault from a work order, put on ESD protection, open the case, fix the real problem, and sign off — all with mouse-look, click-to-interact, and a running task checklist.

**Play it live:** https://rafikiscyent888.github.io/Basic-101-Repair-Sim/

## Controls

| Input | Action |
|---|---|
| `WASD` | Move |
| Mouse (locked) or click-drag | Look around |
| Scroll | Zoom / inspect |
| Click or `E` | Interact with the highlighted object |
| Hold `E` | Hold-and-press (e.g. the power button) |

Pointer lock is used when available; if the page is embedded somewhere that blocks it (an iframe, a sandboxed preview), click-and-drag look works as a fallback with no loss of functionality.

## Scenarios

Visiting the root URL above loads the **Tower No-Boot Repair** scenario. Every other scenario is a separate page — link directly to any of them:

### 🖥️ Tower
| Scenario | Link |
|---|---|
| New tower, no display / no beep | [`/`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/) |
| New GPU installed, no display | [`tower-gpu.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/tower-gpu.html) |
| Cable management redo, random shutdowns | [`tower-cables.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/tower-cables.html) |
| New M.2 drive, won't boot to Windows | [`tower-storage.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/tower-storage.html) |
| New case fans, overheating | [`tower-cooling.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/tower-cooling.html) |
| RAM upgrade (2→4 sticks), boot loop | [`tower-ram.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/tower-ram.html) |

### 💻 Laptop
| Scenario | Link |
|---|---|
| No display, never reaches the OS | [`laptop.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/laptop.html) |
| RAM upgrade (1→2 sticks), won't POST | [`laptop-ram.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/laptop-ram.html) |
| Battery swap, won't power on at all | [`laptop-battery.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/laptop-battery.html) |
| New SSD, POSTs but won't boot | [`laptop-storage.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/laptop-storage.html) |
| Screen/hinge repair, still black | [`laptop-screen.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/laptop-screen.html) |
| Keyboard swap, won't power on | [`laptop-keyboard.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/laptop-keyboard.html) |

### 🖨️ Printer
| Scenario | Link |
|---|---|
| Completely dead, won't power on | [`printer.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/printer.html) |
| Toner swap, prints completely blank pages | [`printer-toner.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/printer-toner.html) |
| Paper jam cleared, won't complete a print job | [`printer-jam.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/printer-jam.html) |
| Duplexer/second tray installed, jams constantly | [`printer-tray.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/printer-tray.html) |
| Internal cleaning, now completely dead | [`printer-cleaning.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/printer-cleaning.html) |
| Formatter board swap, won't power on | [`printer-formatter.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/printer-formatter.html) |

### 🖥️ Workstation (long-service, wear-and-tear)
| Scenario | Link |
|---|---|
| Suddenly won't POST | [`workstation.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/workstation.html) |
| CMOS battery finally dies | [`workstation-cmos.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/workstation-cmos.html) |
| Years of dust buildup, shuts off under load | [`workstation-dust.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/workstation-dust.html) |
| PSU/connector wear, intermittent power issues | [`workstation-psu.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/workstation-psu.html) |
| Cable degradation, drive errors | [`workstation-cable.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/workstation-cable.html) |
| Worn RAM slot, memory errors | [`workstation-ramslot.html`](https://rafikiscyent888.github.io/Basic-101-Repair-Sim/workstation-ramslot.html) |

Every scenario follows the same loop: read the work order, discharge and ground yourself (ESD gate), open the case, diagnose the fault(s) from a multiple-choice list, physically fix them, run a test boot, and sign off.

## Running locally

No build step — it's static ES modules loaded straight from the browser.

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

Any static file server works, since the pages import three.js via an import map (`assets/vendor/three.module.min.js`) and each scenario's own scene module (`assets/scene-*.js`).

## Structure

```
index.html                  Tower no-boot scenario (site root)
tower-*.html                5 tower variants
laptop.html, laptop-*.html  Laptop no-boot scenario + 5 variants
printer.html, printer-*.html  Printer no-boot scenario + 5 variants
workstation.html, workstation-*.html  Workstation no-boot scenario + 5 variants
assets/engine/              Shared first-person controller + UI styles
assets/scene*.js            Per-scenario three.js scene + game logic
assets/vendor/               Bundled three.js
```
