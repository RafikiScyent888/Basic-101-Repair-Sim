// Shared simulator engine. Scenario configs are declarative data; this file
// is the only place that knows how to render each step type and how to
// drive the 3D scene module through its small, scene-agnostic API.

const state = {
  scenario: null,
  sceneApi: null,
  stepIndex: 0,
  stepResults: [], // one entry per step: { ok: bool, notes: [] }
  diagnosisLog: [], // running list for the final report
};

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function beep(freq = 440, duration = 0.08, type = "sine", gain = 0.06) {
  try {
    const ctx = beep._ctx || (beep._ctx = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch (e) { /* audio not available, fail silently */ }
}

const SOUND = {
  screwOut: () => beep(300, 0.06, "square", 0.05),
  click: () => beep(700, 0.05, "square", 0.07),
  toggle: () => beep(520, 0.04, "sine", 0.05),
  success: () => { beep(660, 0.1, "sine", 0.07); setTimeout(() => beep(880, 0.16, "sine", 0.07), 110); },
  fail: () => { beep(220, 0.18, "sawtooth", 0.06); },
};

export async function startSimulator({ scenarioPath, viewportEl, panelEl, hudTitleEl }) {
  const mod = await import(scenarioPath);
  const scenario = mod.default;
  state.scenario = scenario;
  state.stepIndex = 0;
  state.stepResults = scenario.steps.map(() => ({ ok: false, notes: [] }));
  state.diagnosisLog = [];

  hudTitleEl.innerHTML = `<b>${scenario.title}</b><br>${scenario.ticketSummary}`;

  const sceneMod = await import(scenario.sceneModule);
  state.sceneApi = await sceneMod.buildScene(viewportEl);

  renderProgress(panelEl.parentElement.querySelector("#step-progress"));
  renderStep(panelEl);
}

function renderProgress(container) {
  if (!container) return;
  container.innerHTML = "";
  state.scenario.steps.forEach((_, i) => {
    const dot = el("div", "dot");
    if (i < state.stepIndex) dot.classList.add("done");
    else if (i === state.stepIndex) dot.classList.add("current");
    container.appendChild(dot);
  });
}

function advance(panelEl) {
  if (state.stepIndex < state.scenario.steps.length - 1) {
    state.stepIndex += 1;
    renderProgress(document.querySelector("#step-progress"));
    renderStep(panelEl);
  }
}

function markDone(panelEl, ok, notes = []) {
  state.stepResults[state.stepIndex] = { ok, notes };
}

function renderStep(panelEl) {
  const step = state.scenario.steps[state.stepIndex];
  panelEl.innerHTML = "";

  const card = el("div", "step-card");
  const kicker = el("div", "step-kicker", stepKicker(step.type));
  const h2 = el("h2", null, step.title);
  const body = el("p", "step-body", step.body);
  card.append(kicker, h2, body);

  const renderer = STEP_RENDERERS[step.type];
  const continueBtn = el("button", "primary", "Continue");
  continueBtn.disabled = true;
  continueBtn.addEventListener("click", () => advance(panelEl));

  const ctx = {
    step,
    card,
    setContinueEnabled: (v) => { continueBtn.disabled = !v; },
    complete: (ok, notes) => markDone(panelEl, ok, notes),
    sceneApi: state.sceneApi,
    diagnosisLog: state.diagnosisLog,
    goToStep: (i) => { state.stepIndex = i; renderProgress(document.querySelector("#step-progress")); renderStep(panelEl); },
    isLastStep: state.stepIndex === state.scenario.steps.length - 1,
    scenario: state.scenario,
    stepResults: state.stepResults,
  };

  if (renderer) renderer(ctx);

  panelEl.appendChild(card);
  if (step.type !== "signoff") panelEl.appendChild(continueBtn);
}

function stepKicker(type) {
  return {
    intro: "Ticket",
    "esd-gate": "Safety Check",
    "screw-panel": "Physical Access",
    "diagnose-select": "Diagnosis",
    "part-swap": "Repair",
    "connector-check": "Repair",
    "test-run": "Testing",
    signoff: "Close Ticket",
  }[type] || "Step";
}

/* ---------------------------------------------------------------------
   Step renderers. Each receives ctx and populates ctx.card, wiring up
   ctx.setContinueEnabled(true) once the step's condition is satisfied.
--------------------------------------------------------------------- */

const STEP_RENDERERS = {
  intro(ctx) {
    ctx.setContinueEnabled(true);
    ctx.complete(true);
  },

  "esd-gate"(ctx) {
    const items = [
      { id: "unplug", label: "Unplug the unit from the wall outlet." },
      { id: "discharge", label: "Press and hold the power button for 3 seconds to discharge any residual power in the capacitors.", holdOnly: true },
      { id: "strap", label: "Put on your ESD wrist strap and clip it to a grounded point." },
      { id: "mat", label: "Place the unit / any removed parts on an anti-static mat." },
    ];
    const doneSet = new Set();

    const list = el("div", "checklist");

    items.forEach((item) => {
      if (item.holdOnly) {
        const btn = el("button", "hold-btn");
        btn.innerHTML = `<div class="fill"></div><span>Press and hold: ${item.label}</span>`;
        let holding = false;
        let pct = 0;
        let raf = null;
        const DURATION = 3000; // ms — actually hold for the real 3 seconds we tell them to
        let startTime = 0;

        const step = (ts) => {
          if (!holding) return;
          if (!startTime) startTime = ts;
          pct = Math.min(100, ((ts - startTime) / DURATION) * 100);
          btn.querySelector(".fill").style.width = pct + "%";
          ctx.sceneApi.setPowerButtonPress?.(pct / 100);
          if (pct >= 100) {
            holding = false;
            btn.classList.add("complete");
            btn.innerHTML = `<div class="fill"></div><span>✓ Discharged — held for 3 seconds</span>`;
            doneSet.add(item.id);
            SOUND.toggle();
            setTimeout(() => ctx.sceneApi.setPowerButtonPress?.(0), 250);
            checkAll();
            return;
          }
          raf = requestAnimationFrame(step);
        };

        const start = () => {
          if (doneSet.has(item.id)) return;
          holding = true; startTime = 0;
          raf = requestAnimationFrame(step);
        };
        const stop = () => {
          holding = false;
          if (raf) cancelAnimationFrame(raf);
          if (!doneSet.has(item.id)) {
            pct = 0;
            btn.querySelector(".fill").style.width = "0%";
            ctx.sceneApi.setPowerButtonPress?.(0);
          }
        };

        btn.addEventListener("mousedown", start);
        btn.addEventListener("touchstart", (e) => { e.preventDefault(); start(); }, { passive: false });
        ["mouseup", "mouseleave"].forEach((ev) => btn.addEventListener(ev, stop));
        ["touchend", "touchcancel"].forEach((ev) => btn.addEventListener(ev, stop));

        list.appendChild(btn);
      } else {
        const row = el("div", "check-item");
        row.innerHTML = `<div class="box"></div><div>${item.label}</div>`;
        row.addEventListener("click", () => {
          if (doneSet.has(item.id)) return;
          doneSet.add(item.id);
          row.classList.add("checked");
          row.querySelector(".box").textContent = "✓";
          SOUND.toggle();
          if (item.id === "mat") ctx.sceneApi.showMat?.();
          if (item.id === "strap") ctx.sceneApi.showWristStrap?.();
          checkAll();
        });
        list.appendChild(row);
      }
    });

    function checkAll() {
      const allDone = items.every((i) => doneSet.has(i.id));
      ctx.setContinueEnabled(allDone);
      if (allDone) {
        ctx.complete(true);
        ctx.sceneApi.orientForRepair?.();
      }
    }

    ctx.card.appendChild(list);
  },

  "screw-panel"(ctx) {
    const { step } = ctx;
    const removed = new Set();
    const list = el("div", "hotspot-list");

    step.screws.forEach((screw) => {
      const row = el("div", "hotspot-item");
      row.innerHTML = `<span>${screw.label}</span><span class="tag">Click on model</span>`;
      row.addEventListener("click", () => tryRemove(screw.id, row));
      list.appendChild(row);
      ctx.sceneApi.onHotspotClick(screw.id, () => tryRemove(screw.id, row));
    });
    ctx.card.appendChild(list);

    function tryRemove(id, row) {
      if (removed.has(id)) return;
      removed.add(id);
      row.classList.add("done");
      row.querySelector(".tag").textContent = "Removed";
      ctx.sceneApi.removeScrew(id);
      SOUND.screwOut();
      if (removed.size === step.screws.length) {
        showPlacementQuestion();
      }
    }

    let placementAnswered = false;
    function showPlacementQuestion() {
      ctx.sceneApi.openPanel(step.panelId);
      const q = el("div", null);
      q.innerHTML = `<p class="step-body" style="margin-top:14px;"><b>Where do you put the screws?</b></p>`;
      const grid = el("div", "option-grid");
      step.placementOptions.forEach((opt) => {
        const card = el("div", "option-card", opt.label);
        card.addEventListener("click", () => {
          if (placementAnswered) return;
          placementAnswered = true;
          [...grid.children].forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");
          if (opt.id === step.correctPlacement) {
            card.classList.add("correct");
            ctx.complete(true);
            ctx.setContinueEnabled(true);
          } else {
            card.classList.add("incorrect");
            const warn = el("div", "feedback-banner warn", "Loose screws get lost or scratch components. Use a labeled tray or magnetic parts dish instead.");
            q.appendChild(warn);
            ctx.complete(true, ["Did not store screws safely on first try"]);
            setTimeout(() => { placementAnswered = false; card.classList.remove("incorrect", "selected"); warn.remove(); }, 1600);
          }
        });
        grid.appendChild(card);
      });
      q.appendChild(grid);
      ctx.card.appendChild(q);
    }
  },

  "diagnose-select"(ctx) {
    const { step } = ctx;
    const symptom = el("div", "feedback-banner warn", step.symptomText);
    ctx.card.appendChild(symptom);

    const chosen = new Set();
    let submitted = false;
    const grid = el("div", "option-grid");
    step.options.forEach((opt) => {
      const card = el("div", "option-card", opt.label);
      card.addEventListener("click", () => {
        if (submitted) return;
        if (chosen.has(opt.id)) { chosen.delete(opt.id); card.classList.remove("selected"); }
        else { chosen.add(opt.id); card.classList.add("selected"); }
      });
      grid.appendChild(card);
    });
    ctx.card.appendChild(grid);

    const submitBtn = el("button", "secondary", "Check my diagnosis");
    submitBtn.addEventListener("click", () => {
      submitted = true;
      const correctSet = new Set(step.correctIds);
      let allRight = chosen.size === correctSet.size;
      [...grid.children].forEach((card, i) => {
        const opt = step.options[i];
        if (correctSet.has(opt.id)) card.classList.add("correct");
        else if (chosen.has(opt.id)) { card.classList.add("incorrect"); allRight = false; }
        if (opt.explain) {
          const ex = el("div", "spec-line", opt.explain);
          ex.style.marginTop = "6px";
          card.appendChild(ex);
        }
      });
      ctx.diagnosisLog.push({ label: step.title, correct: allRight });
      const fb = el("div", `feedback-banner ${allRight ? "good" : "bad"}`,
        allRight
          ? "Correct — those are the likely causes. Move on to fix each one."
          : "Not quite every cause was correctly identified — the correct ones are highlighted in green, with why each option is or isn't a cause explained below it.");
      ctx.card.appendChild(fb);
      ctx.complete(allRight, allRight ? [] : ["Diagnosis was incomplete or included a wrong cause"]);
      ctx.setContinueEnabled(true);
    });
    ctx.card.appendChild(submitBtn);
  },

  "part-swap"(ctx) {
    const { step } = ctx;
    let selectedCandidate = null;
    let seated = false;

    if (step.specSheet) {
      const sheet = el("div", "spec-sheet");
      sheet.innerHTML = `<div class="spec-sheet-title">📋 ${step.specSheet.title}</div>`;
      const table = el("table", "spec-table");
      step.specSheet.rows.forEach(([label, value]) => {
        const tr = el("tr");
        tr.innerHTML = `<td>${label}</td><td>${value}</td>`;
        table.appendChild(tr);
      });
      sheet.appendChild(table);
      ctx.card.appendChild(sheet);
    }

    const grid = el("div", "option-grid");
    step.candidates.forEach((cand) => {
      const card = el("div", "option-card");
      card.innerHTML = `${cand.label}<div class="spec-line">${cand.specLine}</div>`;
      card.addEventListener("click", () => {
        if (seated) return;
        [...grid.children].forEach((c) => c.classList.remove("selected", "correct", "incorrect"));
        card.classList.add("selected");
        selectedCandidate = cand;
        seatBtn.disabled = false;
      });
      grid.appendChild(card);
    });
    ctx.card.appendChild(grid);

    const seatBtn = el("button", "secondary", `Insert into ${step.slotLabel}`);
    seatBtn.disabled = true;
    ctx.card.appendChild(seatBtn);

    const clickBtn = el("button", "hold-btn");
    clickBtn.style.display = "none";
    clickBtn.innerHTML = `<div class="fill"></div><span>Push down evenly until you hear it click into place</span>`;
    ctx.card.appendChild(clickBtn);

    seatBtn.addEventListener("click", () => {
      if (!selectedCandidate || seated) return;
      const correct = selectedCandidate.id === step.correctCandidateId;
      const cards = [...grid.children];
      cards.forEach((c, i) => {
        const cand = step.candidates[i];
        if (cand.id === step.correctCandidateId) c.classList.add("correct");
      });
      if (!correct) {
        const chosenIdx = step.candidates.findIndex((c) => c === selectedCandidate);
        cards[chosenIdx].classList.add("incorrect");
        const fb = el("div", "feedback-banner bad", `That part doesn't match the requirement: ${step.mismatchHint}`);
        ctx.card.insertBefore(fb, seatBtn);
        setTimeout(() => fb.remove(), 2200);
        return;
      }
      ctx.sceneApi.insertPart(step.slotId, selectedCandidate);
      seatBtn.style.display = "none";
      clickBtn.style.display = "block";
    });

    clickBtn.addEventListener("click", () => {
      if (seated) return;
      seated = true;
      clickBtn.classList.add("complete");
      clickBtn.innerHTML = `<div class="fill"></div><span>✓ Clicked into place</span>`;
      SOUND.click();
      ctx.sceneApi.confirmSeated(step.slotId);
      ctx.complete(true);
      ctx.setContinueEnabled(true);
    });
  },

  "connector-check"(ctx) {
    const { step } = ctx;
    let fixed = false;
    const row = el("div", "hotspot-item");
    row.innerHTML = `<span>${step.actionLabel}</span><span class="tag">Click on model</span>`;
    const doFix = () => {
      if (fixed) return;
      fixed = true;
      row.classList.add("done");
      row.querySelector(".tag").textContent = "Fixed";
      ctx.sceneApi.fixConnector(step.connectorId);
      SOUND.click();
      ctx.complete(true);
      ctx.setContinueEnabled(true);
    };
    row.addEventListener("click", doFix);
    ctx.sceneApi.onHotspotClick(step.connectorId, doFix);
    ctx.card.appendChild(el("div", "hotspot-list")).appendChild(row);
  },

  "test-run"(ctx) {
    const { step } = ctx;
    const btn = el("button", "secondary", step.testLabel);
    let ran = false;
    btn.addEventListener("click", () => {
      if (ran) return;
      ran = true;
      const allFixed = ctx.stepResults.slice(0, ctx.scenario.steps.indexOf(step)).every((r) => r.ok);
      btn.disabled = true;
      btn.textContent = "Testing…";
      setTimeout(() => {
        if (allFixed) {
          SOUND.success();
          ctx.sceneApi.runTestAnimation(true);
          ctx.card.appendChild(el("div", "feedback-banner good", "Success — the unit passed testing. Ready to document and return to the department."));
          ctx.complete(true);
        } else {
          SOUND.fail();
          ctx.sceneApi.runTestAnimation(false);
          ctx.card.appendChild(el("div", "feedback-banner bad", "Still failing. Go back to the earlier repair steps — something wasn't actually fixed."));
          ctx.complete(false, ["Failed test — an earlier repair step was not completed correctly"]);
        }
        ctx.setContinueEnabled(true);
        btn.textContent = "Test complete";
      }, 1200);
    });
    ctx.card.appendChild(btn);
  },

  signoff(ctx) {
    // Exclude this closing step itself from scoring/report — it isn't a
    // pass/fail repair step, it's just the paperwork screen being shown.
    const scoredSteps = ctx.scenario.steps.slice(0, -1);
    const results = ctx.stepResults.slice(0, -1);
    const totalSteps = results.length;
    const okSteps = results.filter((r) => r.ok).length;
    const pct = Math.round((okSteps / totalSteps) * 100);

    const hero = el("div", "score-hero");
    hero.innerHTML = `<div class="big">${pct}%</div><div>steps completed correctly on first try</div>`;
    ctx.card.appendChild(hero);

    const ul = el("ul", "report-list");
    scoredSteps.forEach((s, i) => {
      const r = results[i];
      const li = el("li", r.ok ? "ok" : "bad", `${s.title}${r.notes.length ? " — " + r.notes.join("; ") : ""}`);
      ul.appendChild(li);
    });
    ctx.card.appendChild(ul);

    const returnRow = el("div", "check-item");
    returnRow.innerHTML = `<div class="box"></div><div>Attach repair notes to the ticket and return the unit to the department.</div>`;
    let done = false;
    returnRow.addEventListener("click", () => {
      if (done) return;
      done = true;
      returnRow.classList.add("checked");
      returnRow.querySelector(".box").textContent = "✓";
      SOUND.success();
      const done2 = el("div", "feedback-banner good", "Ticket closed. Nice work.");
      ctx.card.appendChild(done2);
    });
    ctx.card.appendChild(el("div", "checklist")).appendChild(returnRow);
  },
};
