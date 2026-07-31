import * as THREE from "three";
import { createFPController } from "./engine/fp-controller.js";

const COLORS = {
  floor: 0x8a7256,
  wall: 0xd9d2c4,
  wallTrim: 0x9c9384,
  bench: 0x6b4a2f,
  benchLeg: 0x3d2c1c,
  screw: 0xc9cdd4,
  mat: 0x1c1f24,
  tray: 0xc7ccd4,
  trayInset: 0xaab0bb,
  screwdriverShaft: 0xb8bec7,
  highlight: 0x60a5fa,
  toolTable: 0x5b432c,
  outletPlate: 0xe8e6df,
  plug: 0x2b3038,
  strapBand: 0x2b3038,
  strapCable: 0x9aa0a8,
  manual: 0x3b5a8a,
  clipboard: 0x8a5a2b,
  powerBtn: 0x4b5261,
  powerBtnPressed: 0x2e3340,
  ramSlotEmpty: 0x14202b,
  connectorOff: 0xd9a233,
  connectorOn: 0x3fae5c,
  standoff: 0x9aa0a8,
  ledOff: 0x334155,
  ledGood: 0x22c55e,
  ledBad: 0xef4444,
};

const RIBBON_SPEC_SHEET = {
  title: "Razer Blade 18 — Keyboard-Area Ribbon Cables",
  rows: [
    ["Model", "Razer Blade 18 (2026), keyboard deck removed for a customer keyboard swap"],
    ["Connector type", "ZIF (zero-insertion-force) FPC sockets — lift the locking flap, insert the ribbon contacts-down, press the flap closed to latch"],
    ["Orientation / keying", "All three ribbons are directional. Seated backwards, a ribbon can look fully inserted and latched but won't carry signal correctly"],
    ["Power-button signal path", "Power button → power-button ribbon → board. On this model that ribbon is routed through the keyboard controller, so a disconnected keyboard ribbon can also kill the power-button signal"],
    ["Diagnosis tip", "After any keyboard-area repair, re-check every ribbon disturbed during the job before suspecting the battery or the AC adapter"],
  ],
};

const DIAGNOSE_OPTIONS = [
  {
    id: "pwrRibbon", correct: true,
    label: "Power-button ribbon cable isn't seated",
    explain: "Correct — the power button signal runs through this ribbon to the board; disconnected, pressing the button does nothing at all.",
  },
  {
    id: "trackpadRibbon", correct: true,
    label: "Trackpad ribbon cable is connected backwards",
    explain: "Correct — these connectors are directional; seated backwards, the trackpad (and on this model, some shared signal lines) won't function correctly.",
  },
  {
    id: "kbRibbon", correct: true,
    label: "Keyboard ribbon cable isn't seated",
    explain: "Correct — a disconnected keyboard ribbon can also break the power-button signal path on models where it's routed through the keyboard controller.",
  },
  {
    id: "battery", correct: false,
    label: "Battery is dead or disconnected",
    explain: "Not the cause here — always check this on a real job, but this ticket already confirms the battery connector is fine; the issue traces to the ribbons disturbed during the keyboard swap.",
  },
  {
    id: "adapter", correct: false,
    label: "AC adapter is bad",
    explain: "Not the cause here — the timing (right after a keyboard swap, with several ribbons disturbed) points to a connection issue inside, not the external adapter.",
  },
];

const TASKS = [
  { id: "unplug", label: "Unplug the AC adapter from the wall outlet." },
  { id: "discharge", label: "Hold the power button 3 seconds to discharge residual power." },
  { id: "strap", label: "Put on your ESD wrist strap." },
  { id: "mat", label: "Confirm the unit is on an anti-static mat." },
  { id: "flip", label: "Flip the laptop over to access the bottom panel." },
  { id: "screws", label: "Remove all 4 bottom panel screws and store them in the tray." },
  { id: "diagnose", label: "Check the ticket and diagnose the fault." },
  { id: "pwrRibbon", label: "Reseat the power-button ribbon cable." },
  { id: "trackpadRibbon", label: "Flip the trackpad ribbon cable to the correct orientation." },
  { id: "kbRibbon", label: "Reconnect the keyboard ribbon cable." },
  { id: "test", label: "Power on and test." },
  { id: "signoff", label: "Document and return to department." },
];

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function makeWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#8a6a45";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(60,40,20,${0.08 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + (Math.random() - 0.5) * 20, 180, y + (Math.random() - 0.5) * 20, 256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

// Darker, plank-grained workbench top — distinct from the floor's wood
// so the two don't read as the same tiled material at different scales.
function makeBenchTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#5a3f28";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const plankW = canvas.width / 6;
  for (let p = 0; p < 6; p++) {
    const x = p * plankW;
    const shade = 0.9 + Math.random() * 0.16;
    ctx.fillStyle = `rgba(0,0,0,${1 - shade})`;
    ctx.fillRect(x, 0, plankW, canvas.height);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 0, plankW, canvas.height);
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`;
      ctx.lineWidth = 1;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + plankW - 2, y + (Math.random() - 0.5) * 8);
      ctx.stroke();
    }
  }
  // A few worn/stain patches near the middle, where tools actually rest.
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(20,12,5,${0.05 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(
      canvas.width * (0.3 + Math.random() * 0.4),
      canvas.height * (0.3 + Math.random() * 0.4),
      10 + Math.random() * 26, 6 + Math.random() * 14, Math.random() * Math.PI, 0, Math.PI * 2
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

// Rubberized ESD mat — subtle woven diamond texture instead of flat matte
// black, which reads as a flat rectangle under real lighting.
function makeEsdMatTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1c1f24";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1.5;
  const step = 16;
  for (let x = -canvas.height; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvas.height, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + canvas.height, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 300; i++) {
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 8;
  return tex;
}

// Faint linear brushing + panel-gap shading so flat case panels don't read
// as a single flat-shaded color under the new directional key light.
function makeBrushedMetalTexture(baseHex) {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.035})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  });
}

function canvasTex(w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

// Small flat-flex (FPC) ribbon cable — the reusable shape for the three
// ribbons disturbed by a keyboard-deck swap (power-button, trackpad,
// keyboard). Real FPC cables are a thin flexible strip with gold contact
// pads on one face only, which is why orientation matters when reseating one.
function makeRibbonContactTex(width) {
  const w = Math.max(32, Math.round(width * 1400));
  return canvasTex(w, 16, (ctx, ww, hh) => {
    const grad = ctx.createLinearGradient(0, 0, ww, 0);
    grad.addColorStop(0, "#f4d35e");
    grad.addColorStop(1, "#b8892f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ww, hh);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    for (let x = 2; x < ww; x += 3) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, hh); ctx.stroke(); }
  });
}

function buildRibbonCable(width, lengthZ) {
  const contactTex = makeRibbonContactTex(width);
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.7 });
  const contactMat = new THREE.MeshStandardMaterial({ map: contactTex, metalness: 0.6, roughness: 0.35 });
  // Box face order is [+x, -x, +y, -y, +z, -z] — contact pads face -y
  // (down, into the socket) when seated correctly.
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.0015, lengthZ),
    [jacketMat, jacketMat, jacketMat, contactMat, jacketMat, jacketMat]
  );
}

// JAKEMY JM-8192 precision driver — same real-product pick used in the
// tower scenario's tool table, reused here for consistency across scenes.
function buildScrewdriverMesh() {
  const gripTex = canvasTex(64, 256, (ctx, w, h) => {
    ctx.fillStyle = "#33363b";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,11,12,0.55)";
    for (let y = 8; y < h - 34; y += 11) ctx.fillRect(0, y, w, 4);
    ctx.save();
    ctx.translate(w / 2, h * 0.86);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#c9cdd4";
    ctx.textAlign = "center";
    ctx.font = "bold 15px Arial";
    ctx.fillText("JAKEMY", 0, 0);
    ctx.restore();
  });
  const metalTipMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.15 });
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.1, 14),
    new THREE.MeshStandardMaterial({ color: COLORS.screwdriverShaft, metalness: 0.85, roughness: 0.2 })
  );
  shaft.position.y = 0.055;
  g.add(shaft);

  const tipBase = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.008, 8), metalTipMat);
  tipBase.position.y = 0.008;
  tipBase.rotation.x = Math.PI;
  g.add(tipBase);
  const finGeo = new THREE.BoxGeometry(0.008, 0.006, 0.0012);
  const fin1 = new THREE.Mesh(finGeo, metalTipMat);
  fin1.position.y = 0.005;
  g.add(fin1);
  const fin2 = new THREE.Mesh(finGeo, metalTipMat);
  fin2.rotation.y = Math.PI / 2;
  fin2.position.y = 0.005;
  g.add(fin2);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.02, 0.08, 16),
    new THREE.MeshStandardMaterial({ map: gripTex, roughness: 0.6 })
  );
  handle.position.y = 0.14;
  g.add(handle);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0165, 0.0165, 0.008, 16),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 })
  );
  band.position.y = 0.104;
  g.add(band);
  const clip = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.06, 0.006),
    new THREE.MeshStandardMaterial({ color: 0xb8bec7, metalness: 0.7, roughness: 0.3 })
  );
  clip.position.set(0.019, 0.15, 0);
  g.add(clip);

  const groove = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0155, 0.0155, 0.003, 16),
    new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.5 })
  );
  groove.position.y = 0.177;
  g.add(groove);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5 })
  );
  cap.position.y = 0.18;
  g.add(cap);
  return g;
}

export async function buildFPScene(container, { hintEl, toastEl, crosshairEl, taskListEl, wornItemsEl, modalOverlayEl, modalCardEl }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfd8e6);
  scene.fog = new THREE.Fog(0xcfd8e6, 6, 16);

  const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.05, 50);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // -------- Room shell --------
  const ROOM_W = 6, ROOM_D = 5, ROOM_H = 2.8;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.9, side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D), wallMat);
  room.position.y = ROOM_H / 2;
  scene.add(room);
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D),
    new THREE.MeshStandardMaterial({ color: COLORS.wallTrim, roughness: 0.8 })
  );
  trim.position.y = 0.05;
  scene.add(trim);

  // Soft sky/ground hemisphere instead of flat ambient — gives surfaces a
  // believable bounce-light gradient (cooler from above, warmer off the
  // wood floor) rather than uniform flat fill.
  scene.add(new THREE.HemisphereLight(0xdbe6f5, 0x6b5638, 0.55));

  const key = new THREE.DirectionalLight(0xfff4e0, 1.35);
  key.position.set(2, 4, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 10;
  key.shadow.camera.left = -2.5;
  key.shadow.camera.right = 2.5;
  key.shadow.camera.top = 2.5;
  key.shadow.camera.bottom = -2.5;
  key.shadow.bias = -0.0015;
  key.shadow.radius = 2.5;
  // Aim at the bench, not the room origin, so the shadow frustum is
  // actually centered on the thing the player looks at.
  key.target.position.set(0, 0.9, -ROOM_D / 2 + 0.5);
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.PointLight(0xfff2d9, 0.45, 10);
  fill.position.set(-1.5, 2.2, -1);
  scene.add(fill);

  // Cool rim light behind/above the bench to separate the case's dark
  // edges from the wall instead of letting them merge into one silhouette.
  // Kept well clear of the wall itself — a point light this close to a
  // surface blows it out no matter how low the intensity goes.
  const rim = new THREE.PointLight(0x9fc4ff, 0.35, 5, 2);
  rim.position.set(0.6, 1.7, -ROOM_D / 2 + 1.1);
  scene.add(rim);

  // -------- Wall outlet + AC adapter plug (unplug task) --------
  const BENCH_Z = -ROOM_D / 2 + 0.5;
  const outletPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.01),
    new THREE.MeshStandardMaterial({ color: COLORS.outletPlate, roughness: 0.6 })
  );
  outletPlate.position.set(0.95, 1.05, -ROOM_D / 2 + 0.005);
  scene.add(outletPlate);
  const plugGroup = new THREE.Group();
  plugGroup.position.set(0.95, 1.05, -ROOM_D / 2 + 0.02);
  scene.add(plugGroup);
  const plugMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.03),
    new THREE.MeshStandardMaterial({ color: COLORS.plug, roughness: 0.5 })
  );
  plugGroup.add(plugMesh);
  plugGroup.userData = { interactable: true, kind: "plug", id: "plug" };

  // -------- Workbench along the back wall, holding the laptop --------
  const benchGroup = new THREE.Group();
  benchGroup.position.set(0, 0, BENCH_Z);
  scene.add(benchGroup);
  const benchTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.05, 0.8),
    new THREE.MeshStandardMaterial({ map: makeBenchTexture(), roughness: 0.65 })
  );
  benchTop.position.y = 0.9;
  benchGroup.add(benchTop);
  [[-1, -0.9], [1, -0.9], [-1, 0.9], [1, 0.9]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), new THREE.MeshStandardMaterial({ color: COLORS.benchLeg }));
    leg.position.set(x * 0.45, 0.45, z * 0.35);
    benchGroup.add(leg);
  });

  // AC adapter cord from the wall to the laptop's side port (decorative)
  const acCableMat = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.75 });
  const acCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.95, 0.95, -ROOM_D / 2 + 0.1),
    new THREE.Vector3(0.2, 0.93, BENCH_Z + 0.3),
    new THREE.Vector3(-0.35, 0.93, BENCH_Z),
  ]);
  benchGroup.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(acCurve.points.map((p) => p.clone().sub(new THREE.Vector3(0, 0, BENCH_Z)))), 20, 0.005, 6, false),
    acCableMat
  ));

  // Anti-static mat + screw tray on the bench
  const matGroup = new THREE.Group();
  matGroup.position.set(0.55, 0.926, 0.15);
  benchGroup.add(matGroup);
  const matPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.004, 0.5),
    new THREE.MeshStandardMaterial({ map: makeEsdMatTexture(), roughness: 0.8 })
  );
  matPad.userData = { interactable: true, kind: "mat", id: "mat" };
  matGroup.add(matPad);

  const trayGroup = new THREE.Group();
  trayGroup.position.set(0, 0.008, 0.12);
  matGroup.add(trayGroup);
  const trayFloor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.13), new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.6 }));
  trayFloor.position.y = 0.006;
  trayGroup.add(trayFloor);
  const trayInset = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.004, 0.1), new THREE.MeshStandardMaterial({ color: COLORS.trayInset }));
  trayInset.position.y = 0.013;
  trayGroup.add(trayInset);
  [[0, 0.065, 0.2, 0.012, 0.01], [0, -0.065, 0.2, 0.012, 0.01], [0.1, 0, 0.01, 0.012, 0.13], [-0.1, 0, 0.01, 0.012, 0.13]].forEach(([x, z, w, h, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: COLORS.tray }));
    wall.position.set(x, 0.012, z);
    trayGroup.add(wall);
  });
  trayGroup.userData = { interactable: true, kind: "dropzone", id: "tray" };
  const traySlots = [[-0.05, -0.03], [0.05, -0.03], [-0.05, 0.03], [0.05, 0.03]];
  let nextTraySlot = 0;

  // Ticket clipboard — a real printed work order, not a blank board, so the
  // symptom is legible on the physical prop and matches the diagnose modal.
  const ticketTex = canvasTex(280, 360, (ctx, w, h) => {
    ctx.fillStyle = "#f4f2ea";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c9c4b4";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = "#111318";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "left";
    ctx.fillText("WORK ORDER  #2026-0512", 16, 28);
    ctx.strokeStyle = "#8a8578";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(16, 38); ctx.lineTo(w - 16, 38); ctx.stroke();

    ctx.font = "bold 10px Arial";
    ctx.fillText("DEVICE", 16, 56);
    ctx.font = "10px Arial";
    ctx.fillText("Razer Blade 18 (2026)", 16, 70);
    ctx.font = "italic 9px Arial";
    ctx.fillStyle = "#55617a";
    ctx.fillText("Keyboard replaced by customer", 16, 82);
    ctx.fillStyle = "#111318";

    ctx.font = "bold 10px Arial";
    ctx.fillText("REPORTED SYMPTOM", 16, 100);
    ctx.font = "10px Arial";
    const lines = [
      "No response at all to the power",
      "button since a customer keyboard",
      "replacement — no fan, no LED.",
    ];
    lines.forEach((line, i) => ctx.fillText(line, 16, 116 + i * 15));

    ctx.font = "bold 10px Arial";
    ctx.fillText("CHECK EVERY CAUSE YOU FIND:", 16, 200);
    const checks = [
      "Power-button ribbon seated", "Trackpad ribbon orientation",
      "Keyboard ribbon seated", "Battery connector", "AC adapter",
    ];
    checks.forEach((c, i) => {
      const y = 216 + i * 20;
      ctx.strokeStyle = "#33404f";
      ctx.strokeRect(16, y - 9, 12, 12);
      ctx.font = "10px Arial";
      ctx.fillStyle = "#111318";
      ctx.fillText(c, 34, y + 1);
    });

    ctx.font = "italic 9px Arial";
    ctx.fillStyle = "#55617a";
    ctx.fillText("Tech: sign off once repaired & tested", 16, h - 16);
  });
  const clipboardMat = new THREE.MeshStandardMaterial({ color: COLORS.clipboard, roughness: 0.6 });
  const ticketMat = new THREE.MeshStandardMaterial({ map: ticketTex, roughness: 0.8 });
  const clipboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.01, 0.18),
    [clipboardMat, clipboardMat, ticketMat, clipboardMat, clipboardMat, clipboardMat]
  );
  clipboard.position.set(0.55, 0.931, -0.32);
  clipboard.userData = { interactable: true, kind: "clipboard", id: "diagnose" };
  benchGroup.add(clipboard);

  // -------- Laptop on the bench --------
  // Razer Blade 18, the #5 pick from a 2026 "best laptops" roundup: CNC-milled
  // black aluminum, illuminated green triple-snake logo on the lid.
  // BASE_H is the thin structural frame directly under the lid; CAVITY_H is
  // the actual open well between that frame and the bottom panel, where the
  // motherboard/RAM/battery live — without a real gap here the solid frame
  // would sit right where the internals do and hide them once the panel
  // comes off.
  const LW = 0.4, LD = 0.28, BASE_H = 0.006, CAVITY_H = 0.014, LID_H = 0.01, PANEL_H = 0.01;
  const HALF = (BASE_H + CAVITY_H + LID_H + PANEL_H) / 2;

  const laptopGroup = new THREE.Group();
  laptopGroup.position.set(-0.35, 0.926 + HALF, 0);
  benchGroup.add(laptopGroup);

  const brushedAlumTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#1b1c1f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
      const y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (Math.random() - 0.5) * 3); ctx.stroke();
    }
  });
  const alumMat = new THREE.MeshStandardMaterial({ map: brushedAlumTex, metalness: 0.6, roughness: 0.4 });

  // Lid — top face carries the brushed finish + illuminated logo badge.
  const lidLogoTex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1b1c1f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
      const y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (Math.random() - 0.5) * 3); ctx.stroke();
    }
    const cx = w / 2, cy = h / 2, r = w * 0.16;
    ctx.strokeStyle = "#3fae5c";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.35, -r * 1.55);
      ctx.lineTo(-r * 0.35, -r * 1.55);
      ctx.closePath();
      ctx.fillStyle = "#3fae5c";
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#7fe39a";
    ctx.textAlign = "center";
    ctx.font = "bold 13px Arial";
    ctx.fillText("RAZER", cx, cy + r * 2.3);
  });
  const lidTop = new THREE.Mesh(
    new THREE.BoxGeometry(LW, LID_H, LD),
    [alumMat, alumMat, new THREE.MeshStandardMaterial({ map: lidLogoTex, metalness: 0.5, roughness: 0.45 }), alumMat, alumMat, alumMat]
  );
  lidTop.position.y = HALF - LID_H / 2;
  lidTop.userData = { interactable: true, kind: "flip-laptop", id: "flip" };
  laptopGroup.add(lidTop);

  const baseBody = new THREE.Mesh(new THREE.BoxGeometry(LW * 0.99, BASE_H, LD * 0.99), alumMat);
  baseBody.position.y = HALF - LID_H - BASE_H / 2;
  laptopGroup.add(baseBody);

  // Power button + AC port on the +X side edge — accessible whether the
  // laptop is lid-up or flipped for bottom-panel access.
  const powerBtnGroup = new THREE.Group();
  powerBtnGroup.position.set(LW / 2 - 0.002, HALF - LID_H - BASE_H / 2, LD * 0.3);
  laptopGroup.add(powerBtnGroup);
  const powerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.006, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.powerBtn, metalness: 0.6, roughness: 0.35 })
  );
  powerBtn.rotation.z = Math.PI / 2;
  powerBtnGroup.add(powerBtn);
  powerBtnGroup.userData = { interactable: true, kind: "power-button", id: "powerButton" };

  const led = new THREE.Mesh(new THREE.CircleGeometry(0.005, 12), new THREE.MeshBasicMaterial({ color: COLORS.ledOff }));
  led.rotation.y = Math.PI / 2;
  led.position.set(LW / 2 - 0.0015, HALF - LID_H - BASE_H / 2, LD * 0.22);
  laptopGroup.add(led);

  // Cheap stand-in for a real bloom pass: an additive radial-gradient
  // sprite sitting just in front of the LED disc, tinted to match. No
  // postprocessing pipeline needed for one small glowing point.
  const glowTex = canvasTex(64, 64, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  const ledGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: COLORS.ledOff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  ledGlow.scale.set(0.05, 0.05, 1);
  ledGlow.position.copy(led.position);
  ledGlow.rotation.copy(led.rotation);
  laptopGroup.add(ledGlow);

  const acPortMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.01, 12),
    new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.6 })
  );
  acPortMesh.rotation.z = Math.PI / 2;
  acPortMesh.position.set(LW / 2 - 0.001, HALF - LID_H - BASE_H / 2, -LD * 0.3);
  laptopGroup.add(acPortMesh);

  // -------- Removable bottom panel + screws --------
  const panelVentTex = canvasTex(128, 96, (ctx, w, h) => {
    ctx.fillStyle = "#202225";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#101113";
    for (let y = h * 0.08; y < h * 0.9; y += 6) {
      ctx.fillRect(w * 0.08, y, w * 0.36, 3);
    }
    ctx.fillStyle = "#8a9098";
    ctx.font = "8px Arial";
    ctx.textAlign = "left";
    ctx.fillText("RAZER BLADE 18", w * 0.5, h * 0.3);
    ctx.font = "6px Arial";
    ctx.fillText("MODEL RZ09-0484  S/N 2026-0417-A", w * 0.5, h * 0.42);
    ctx.fillText("Made in China", w * 0.5, h * 0.52);
  });
  const bottomPanelGroup = new THREE.Group();
  bottomPanelGroup.position.y = -HALF + PANEL_H / 2;
  laptopGroup.add(bottomPanelGroup);
  const bottomPanelPlate = new THREE.Mesh(
    new THREE.BoxGeometry(LW * 0.97, PANEL_H, LD * 0.97),
    [alumMat, alumMat, new THREE.MeshStandardMaterial({ map: panelVentTex, roughness: 0.75 }), alumMat, alumMat, alumMat]
  );
  bottomPanelGroup.add(bottomPanelPlate);

  [[-0.16, -0.1], [0.16, -0.1], [-0.16, 0.1], [0.16, 0.1]].forEach(([x, z]) => {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.003, 12),
      new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.9 })
    );
    foot.position.set(x, -PANEL_H / 2 - 0.0016, z);
    bottomPanelGroup.add(foot);
  });

  const screwHeadTex = canvasTex(32, 32, (ctx, w, h) => {
    ctx.fillStyle = "#c9cdd4";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#6b7178";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.15); ctx.lineTo(w * 0.5, h * 0.85);
    ctx.moveTo(w * 0.15, h * 0.5); ctx.lineTo(w * 0.85, h * 0.5);
    ctx.stroke();
  });
  const screwLocal = [[-0.14, -0.09], [0.14, -0.09], [-0.14, 0.09], [0.14, 0.09]];
  const screwMeshes = {};
  screwLocal.forEach(([x, z], i) => {
    const id = "screw" + (i + 1);
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.012, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.screw, metalness: 0.85, roughness: 0.22 })
    );
    const head = new THREE.Mesh(
      new THREE.CircleGeometry(0.007, 16),
      new THREE.MeshStandardMaterial({ map: screwHeadTex, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })
    );
    head.rotation.x = Math.PI / 2;
    head.position.y = -0.0061;
    screw.add(head);
    screw.position.set(x, 0, z);
    screw.userData = { interactable: true, kind: "screw", id, requiresTool: "screwdriver" };
    bottomPanelGroup.add(screw);
    screwMeshes[id] = screw;
  });

  // -------- Internals, revealed once the bottom panel is removed --------
  const internals = new THREE.Group();
  internals.visible = false;
  internals.position.y = -HALF + PANEL_H + CAVITY_H / 2;
  laptopGroup.add(internals);

  const pcbTex = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#15181c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(140,150,160,0.25)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = "rgba(200,210,220,0.12)";
      ctx.fillRect(Math.random() * w, Math.random() * h, 5 + Math.random() * 10, 5 + Math.random() * 10);
    }
    ctx.fillStyle = "#3a3f46";
    ctx.font = "9px Arial";
    ctx.fillText("RZ09-0484  MAINBOARD REV C1", w * 0.06, h * 0.96);
  });
  const motherboard = new THREE.Mesh(
    new THREE.BoxGeometry(LW * 0.6, 0.003, LD * 0.9),
    new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.75 })
  );
  // Positioned toward the LID side of the cavity (not the panel side): once
  // the laptop is flipped to expose the bottom, the panel side faces the
  // camera, so anything meant to be visible has to sit CLOSER to the panel
  // than this board — otherwise this large, full-footprint plane hides it.
  motherboard.position.set(-LW * 0.15, 0.003, 0);
  internals.add(motherboard);

  // CPU (Intel Core Ultra 9 290HX) + GPU (RTX 5090 Laptop GPU) dies, per the
  // 2026 Blade 18's real spec sheet, shared under one vapor-chamber cooler
  // with twin fans — the "tri-fan" thermal design Razer ships on this model.
  const cpuDieTex = canvasTex(96, 96, (ctx, w, h) => {
    ctx.fillStyle = "#8a8f96";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#33363b";
    ctx.textAlign = "center";
    ctx.font = "bold 10px Arial";
    ctx.fillText("intel", w / 2, h * 0.42);
    ctx.font = "7px Arial";
    ctx.fillText("CORE ULTRA 9", w / 2, h * 0.58);
    ctx.fillText("290HX", w / 2, h * 0.7);
  });
  const cpuDie = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.004, 0.028),
    new THREE.MeshStandardMaterial({ map: cpuDieTex, metalness: 0.4, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
  );
  cpuDie.position.set(-0.1, -0.004, -0.05);
  internals.add(cpuDie);

  const gpuDieTex = canvasTex(96, 96, (ctx, w, h) => {
    ctx.fillStyle = "#4a4d52";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8fe07a";
    ctx.textAlign = "center";
    ctx.font = "bold 9px Arial";
    ctx.fillText("NVIDIA", w / 2, h * 0.42);
    ctx.fillStyle = "#c9cdd4";
    ctx.font = "7px Arial";
    ctx.fillText("RTX 5090", w / 2, h * 0.6);
    ctx.fillText("Laptop GPU", w / 2, h * 0.72);
  });
  const gpuDie = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.004, 0.036),
    new THREE.MeshStandardMaterial({ map: gpuDieTex, metalness: 0.4, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
  );
  gpuDie.position.set(-0.06, -0.004, 0.03);
  internals.add(gpuDie);

  const vaporTex = canvasTex(160, 160, (ctx, w, h) => {
    ctx.fillStyle = "#c98a4b";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let y = 6; y < h; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("VAPOR CHAMBER", w / 2, h * 0.5);
  });
  const vaporChamber = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.003, 0.15),
    new THREE.MeshStandardMaterial({ map: vaporTex, metalness: 0.75, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
  );
  vaporChamber.position.set(-0.08, -0.0065, -0.01);
  internals.add(vaporChamber);

  const heatpipeMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.85, roughness: 0.25 });
  const heatpipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, LW * 0.32, 8), heatpipeMat);
  heatpipe1.rotation.z = Math.PI / 2;
  heatpipe1.position.set(-LW * 0.19, -0.0065, -0.04);
  internals.add(heatpipe1);
  const heatpipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, LW * 0.28, 8), heatpipeMat);
  heatpipe2.rotation.z = Math.PI / 2;
  heatpipe2.position.set(-LW * 0.2, -0.0065, 0.045);
  internals.add(heatpipe2);

  // Battery pack — decorative, occupies the other half of the footprint
  const batteryLabelTex = canvasTex(160, 96, (ctx, w, h) => {
    ctx.fillStyle = "#e8e6df";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#111318";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Li-ion BATTERY", w / 2, h * 0.35);
    ctx.font = "9px Arial";
    ctx.fillText("99.8 Wh  •  15.4V", w / 2, h * 0.55);
    ctx.fillStyle = "#b91c1c";
    ctx.font = "8px Arial";
    ctx.fillText("Do not puncture or incinerate", w / 2, h * 0.78);
  });
  const battery = new THREE.Mesh(
    new THREE.BoxGeometry(LW * 0.32, 0.008, LD * 0.8),
    [
      new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: batteryLabelTex, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.6 }),
    ]
  );
  battery.position.set(LW * 0.28, -0.003, 0);
  internals.add(battery);

  // Twin blower fans (CPU side + GPU side), fed by the vapor chamber's
  // two heatpipes — matching the Blade 18's dual-fan half of its tri-fan
  // thermal design (the third fan lives under the keyboard deck, unseen
  // from this bottom-panel view).
  const fanTex = canvasTex(96, 96, (ctx, w, h) => {
    ctx.fillStyle = "#111214";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2b2f34";
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(w * 0.24, 0, w * 0.2, w * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });
  const fanMat = new THREE.MeshStandardMaterial({ map: fanTex, roughness: 0.6, side: THREE.DoubleSide });
  const cpuFan = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), fanMat);
  cpuFan.rotation.x = -Math.PI / 2;
  cpuFan.position.set(-LW * 0.34, -0.0065, -0.04);
  internals.add(cpuFan);
  const gpuFan = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), fanMat);
  gpuFan.rotation.x = -Math.PI / 2;
  gpuFan.position.set(-LW * 0.34, -0.0065, 0.045);
  internals.add(gpuFan);

  // A single, already-correctly-seated RAM stick — decorative here (this
  // variant's faults are all ribbon cables, not memory), kept in frame so
  // the board doesn't look emptier than the no-boot variant's.
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.6 });
  const ramSlotPos = new THREE.Vector3(-LW * 0.02, -0.0025, -LD * 0.3);
  const ramSlot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.004, 0.006), slotMat);
  ramSlot.position.set(ramSlotPos.x, ramSlotPos.y - 0.004, ramSlotPos.z);
  internals.add(ramSlot);

  // -------- Ribbon-cable connectors: power-button, trackpad, keyboard --------
  // Small flat-flex (FPC) connectors near the board edge, close together —
  // three similar-looking small targets, exactly the case the cursor's
  // screen-space proximity fallback needs to disambiguate correctly.
  const connTex = canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#1c1e21";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0a0b0c";
    for (let x = 6; x < w - 6; x += 8) for (let y = 6; y < h - 6; y += 8) ctx.fillRect(x, y, 3, 3);
  });

  const ribbonPartsById = {};
  function makeRibbonFault({ id, x, width, seatedBackwards }) {
    const group = new THREE.Group();
    group.position.set(x, -0.003, LD * 0.4);
    internals.add(group);

    // Socket housing — fixed to the board, never moves.
    const socket = new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.15, 0.003, 0.012),
      new THREE.MeshStandardMaterial({ map: connTex, color: COLORS.connectorOff, roughness: 0.5, side: THREE.DoubleSide })
    );
    socket.position.y = -0.0025;
    group.add(socket);

    // The ribbon itself — this is the clickable part.
    const cable = buildRibbonCable(width, 0.02);
    cable.userData = { interactable: true, kind: "ribbon", id };
    group.add(cable);

    // Hinged locking flap, same mechanism as a real ZIF connector.
    const latch = new THREE.Group();
    latch.position.set(0, 0.003, -0.006);
    cable.add(latch);
    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.2, 0.0012, 0.006),
      new THREE.MeshStandardMaterial({ color: 0xc9cdd4, metalness: 0.5, roughness: 0.4 })
    );
    flap.position.z = 0.003;
    latch.add(flap);

    if (seatedBackwards) {
      // Already plugged in and latched, but rotated 180° around its own
      // length axis — the gold contact pads face the wrong way.
      cable.rotation.z = Math.PI;
      socket.material.color.setHex(COLORS.connectorOn);
    } else {
      // Disconnected: pulled back off the socket with the flap open.
      cable.position.y += 0.006;
      cable.position.z -= 0.012;
      latch.rotation.x = -1.1;
    }

    ribbonPartsById[id] = { group, socket, cable, latch };
  }

  // Spaced 6cm apart, center to center — close enough together that aiming
  // slightly off one still has to resolve to the right neighbor, not a
  // stale hover left over from whichever was under the cursor a moment ago.
  makeRibbonFault({ id: "kbRibbon", x: -0.09, width: 0.03 });
  makeRibbonFault({ id: "pwrRibbon", x: -0.03, width: 0.012 });
  makeRibbonFault({ id: "trackpadRibbon", x: 0.03, width: 0.022, seatedBackwards: true });

  // -------- Tool table: screwdriver, wrist strap, manual --------
  const toolTableGroup = new THREE.Group();
  toolTableGroup.position.set(1.3, 0, -0.7);
  scene.add(toolTableGroup);
  const toolTableTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.04, 0.4),
    new THREE.MeshStandardMaterial({ color: COLORS.toolTable, roughness: 0.7 })
  );
  toolTableTop.position.y = 0.75;
  toolTableGroup.add(toolTableTop);
  [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.04), new THREE.MeshStandardMaterial({ color: COLORS.benchLeg }));
    leg.position.set(x, 0.375, z);
    toolTableGroup.add(leg);
  });

  const screwdriverOnTable = buildScrewdriverMesh();
  screwdriverOnTable.rotation.z = Math.PI / 2;
  screwdriverOnTable.position.set(-0.15, 0.79, -0.1);
  screwdriverOnTable.userData = { interactable: true, kind: "grab-tool", id: "screwdriver" };
  toolTableGroup.add(screwdriverOnTable);

  // Wrist strap (wearable)
  const strapGroup = new THREE.Group();
  strapGroup.position.set(0.05, 0.79, -0.1);
  toolTableGroup.add(strapGroup);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.03, 0.006, 8, 20, Math.PI * 1.5),
    new THREE.MeshStandardMaterial({ color: COLORS.strapBand, roughness: 0.7 })
  );
  band.rotation.x = Math.PI / 2;
  strapGroup.add(band);
  const coilPoints = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const angle = t * 8 * Math.PI;
    coilPoints.push(new THREE.Vector3(0.03 + t * 0.08 + Math.cos(angle) * 0.01, 0.01, Math.sin(angle) * 0.01));
  }
  const coilTube = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints), 100, 0.0025, 6, false),
    new THREE.MeshStandardMaterial({ color: COLORS.strapCable, roughness: 0.5, metalness: 0.2 })
  );
  strapGroup.add(coilTube);
  strapGroup.userData = { interactable: true, kind: "wearable", id: "strap" };

  // Reference manual / spec sheet (read-only, always available)
  const manual = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.02, 0.18),
    new THREE.MeshStandardMaterial({ color: COLORS.manual, roughness: 0.5 })
  );
  manual.position.set(0.15, 0.77, 0.1);
  manual.userData = { interactable: true, kind: "manual", id: "manual" };
  toolTableGroup.add(manual);

  // -------- First-person controller --------
  const fp = createFPController({
    camera,
    domElement: renderer.domElement,
    bounds: { minX: -ROOM_W / 2 + 0.4, maxX: ROOM_W / 2 - 0.4, minZ: -ROOM_D / 2 + 0.4, maxZ: ROOM_D / 2 - 0.4 },
    obstacles: [
      { minX: -1.1, maxX: 1.1, minZ: BENCH_Z - 0.4, maxZ: BENCH_Z + 0.4 },
      { minX: 1.05, maxX: 1.55, minZ: -0.9, maxZ: -0.5 },
    ],
  });
  fp.yawObject.position.set(0.4, 1.65, 1.4);
  scene.add(fp.yawObject);

  const toolHandAnchor = new THREE.Object3D();
  toolHandAnchor.position.set(0.22, -0.22, -0.55);
  toolHandAnchor.rotation.set(0.5, 0.3, -1.2);
  toolHandAnchor.scale.setScalar(0.85);
  camera.add(toolHandAnchor);
  const partHandAnchor = new THREE.Object3D();
  partHandAnchor.position.set(-0.18, -0.22, -0.5);
  partHandAnchor.scale.setScalar(0.85);
  camera.add(partHandAnchor);

  // -------- Task state --------
  const taskState = {};
  TASKS.forEach((t) => { taskState[t.id] = { done: false, ok: false }; });
  let heldTool = null;
  let carriedPartMesh = null;
  let carriedPartKind = null;
  let removedScrews = new Set();
  let diagnoseSelections = new Set();
  let modalOpen = false;
  let hovered = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("visible"), 2200);
  }

  function renderTaskList() {
    const firstUndone = TASKS.find((t) => !taskState[t.id].done);
    const html = `<div class="tl-title">Keyboard Swap — Won't Power On</div><ul>${TASKS.map((t) => {
      const st = taskState[t.id];
      const cls = st.done ? "done" : (firstUndone && firstUndone.id === t.id ? "current" : "");
      return `<li class="${cls}"><span class="tl-box"></span><span>${t.label}</span></li>`;
    }).join("")}</ul>`;
    taskListEl.innerHTML = html;
  }
  renderTaskList();

  function markDone(id, ok = true) {
    taskState[id] = { done: true, ok };
    renderTaskList();
  }

  function renderWornItems() {
    const items = [];
    if (taskState.strap.done) items.push('<span class="badge">📌 ESD Strap: Worn</span>');
    if (heldTool) items.push(`<span class="badge">🔧 Holding: ${heldTool}</span>`);
    wornItemsEl.innerHTML = items.join("");
  }

  function clearHoverHighlight() {
    if (hovered && hovered.material && hovered.material.emissive) hovered.material.emissive.setHex(0x000000);
  }

  function isEffectivelyVisible(obj) {
    let o = obj;
    while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  }

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);

  // Interact with whatever's actually under the cursor, not a fixed
  // center-screen reticle — this only makes sense while the mouse is a
  // real visible pointer (unlocked / click-drag mode). Once pointer lock
  // actually engages there's no cursor to point with, so that mode falls
  // back to the classic FPS center-crosshair aim.
  const mouseNDC = new THREE.Vector2(0, 0);
  const mouseScreen = { x: 0, y: 0 };
  let mouseInside = false;
  renderer.domElement.addEventListener("mousemove", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseScreen.x = e.clientX - rect.left;
    mouseScreen.y = e.clientY - rect.top;
    mouseNDC.x = (mouseScreen.x / rect.width) * 2 - 1;
    mouseNDC.y = -(mouseScreen.y / rect.height) * 2 + 1;
    mouseInside = true;
  });
  renderer.domElement.addEventListener("mouseleave", () => { mouseInside = false; });
  const camPos = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();
  const REACH = 2.2;
  const HOVER_PX_TOLERANCE = 26;

  function findLookedAtInteractable() {
    const useCursor = !fp.isLocked() && mouseInside;
    raycaster.setFromCamera(useCursor ? mouseNDC : center, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    let direct = null;
    for (const hit of hits) {
      if (!isEffectivelyVisible(hit.object)) continue;
      let obj = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.interactable) {
          if (hit.distance <= REACH) direct = { obj, dist: hit.distance };
          break;
        }
        obj = obj.parent;
      }
      if (direct) break;
    }

    // Small/thin props (tubes, empty slot markers) are easy for a direct
    // ray to miss or to skip past on its way to something farther away —
    // fall back to the nearest interactable within a generous on-screen
    // radius, and prefer whichever candidate is actually physically closer.
    camera.getWorldPosition(camPos);
    const rect = renderer.domElement.getBoundingClientRect();
    const refX = useCursor ? mouseScreen.x : rect.width / 2;
    const refY = useCursor ? mouseScreen.y : rect.height / 2;
    let closest = null;
    let closestDist = HOVER_PX_TOLERANCE;
    let closestCamDist = Infinity;
    for (const obj of interactableRegistry) {
      if (!obj.userData.interactable || !isEffectivelyVisible(obj)) continue;
      obj.getWorldPosition(tmpVec);
      const camDist = tmpVec.distanceTo(camPos);
      if (camDist > REACH) continue;
      const proj = tmpVec.clone().project(camera);
      if (proj.z > 1) continue;
      const sx = (proj.x * 0.5 + 0.5) * rect.width;
      const sy = (-proj.y * 0.5 + 0.5) * rect.height;
      const dist = Math.hypot(sx - refX, sy - refY);
      if (dist < closestDist) { closestDist = dist; closest = obj; closestCamDist = camDist; }
    }

    if (direct && closest) return closestCamDist < direct.dist ? closest : direct.obj;
    return direct ? direct.obj : closest;
  }

  // -------- Hold tracker (only used for the 3s ESD discharge) --------
  let holding = false;
  let holdStart = 0;
  const HOLD_DURATION = 3000;

  function setPowerButtonPress(pct) {
    powerBtn.position.x = pct * -0.003;
    powerBtn.material.color.setHex(pct > 0 ? COLORS.powerBtnPressed : COLORS.powerBtn);
  }

  function updateHint() {
    if (modalOpen) return;
    const target = findLookedAtInteractable();
    if (target !== hovered) {
      clearHoverHighlight();
      hovered = target;
      if (hovered && hovered.material && hovered.material.emissive) hovered.material.emissive.setHex(COLORS.highlight);
    }
    crosshairEl.classList.toggle("active", !!target);
    // The crosshair marks the actual interaction point — follow the real
    // cursor in click-drag mode, snap back to dead-center once pointer
    // lock actually engages (no cursor to show at that point).
    if (!fp.isLocked() && mouseInside) {
      crosshairEl.style.left = `${mouseScreen.x}px`;
      crosshairEl.style.top = `${mouseScreen.y}px`;
    } else {
      crosshairEl.style.left = "";
      crosshairEl.style.top = "";
    }

    if (!target) { hintEl.classList.remove("visible"); return; }
    const { kind, id, requiresTool } = target.userData;
    let text = null;

    if (kind === "plug" && !taskState.unplug.done) text = `<kbd>E</kbd> Unplug AC adapter from wall outlet`;
    else if (kind === "power-button") {
      if (!taskState.discharge.done) {
        text = holding
          ? `Hold… ${Math.min(100, Math.round(((performance.now() - holdStart) / HOLD_DURATION) * 100))}%`
          : `<kbd>Hold Click</kbd> Discharge residual power (3s)`;
      } else if (repairsReady() && !taskState.test.done) {
        text = `<kbd>Click</kbd> Power on and test`;
      }
    } else if (kind === "wearable" && !taskState.strap.done) text = `<kbd>E</kbd> Put on ESD wrist strap`;
    else if (kind === "mat" && !taskState.mat.done) text = `<kbd>E</kbd> Confirm unit is on the mat`;
    else if (kind === "manual") text = `<kbd>E</kbd> Read ribbon-cable reference manual`;
    else if (kind === "flip-laptop" && !taskState.flip.done) {
      text = esdReady() ? `<kbd>E</kbd> Flip laptop to access bottom panel` : `Complete ESD safety steps first`;
    } else if (kind === "clipboard") {
      text = taskState.screws.done
        ? (taskState.diagnose.done ? `<kbd>E</kbd> Review diagnosis` : `<kbd>E</kbd> Diagnose the fault`)
        : `Open the bottom panel first`;
    } else if (kind === "grab-tool" && heldTool !== id) text = `<kbd>E</kbd> Pick up Screwdriver`;
    else if (kind === "screw" && !removedScrews.has(id)) {
      if (!taskState.flip.done) text = `Flip the laptop first`;
      else if (requiresTool && heldTool !== requiresTool) text = `Need the screwdriver equipped first`;
      else if (carriedPartMesh) text = `Hands full — place what you're carrying first`;
      else text = `<kbd>Click</kbd> Unscrew`;
    } else if (kind === "dropzone" && carriedPartKind === "screw") text = `<kbd>E</kbd> Place screw in tray`;
    else if (kind === "ribbon" && taskState.diagnose.done && !taskState[id]?.done) {
      if (id === "pwrRibbon") text = `<kbd>Click</kbd> Reseat power-button ribbon`;
      else if (id === "kbRibbon") text = `<kbd>Click</kbd> Reconnect keyboard ribbon`;
      else if (id === "trackpadRibbon") text = `<kbd>Click</kbd> Flip trackpad ribbon to correct orientation`;
    }

    if (text) { hintEl.innerHTML = text; hintEl.classList.add("visible"); }
    else hintEl.classList.remove("visible");
  }

  function esdReady() {
    return taskState.unplug.done && taskState.discharge.done && taskState.strap.done && taskState.mat.done;
  }
  function repairsReady() {
    return taskState.pwrRibbon.done && taskState.trackpadRibbon.done && taskState.kbRibbon.done;
  }

  // -------- Actions --------
  function pickUpTool(target) {
    heldTool = target.userData.id;
    target.visible = false;
    const heldMesh = buildScrewdriverMesh();
    heldMesh.rotation.set(0, 0, 0);
    toolHandAnchor.add(heldMesh);
    toast("Picked up the screwdriver");
    renderWornItems();
  }

  function flipLaptop() {
    let t = 0;
    const startRot = laptopGroup.rotation.x;
    const anim = () => {
      t += 0.03;
      laptopGroup.rotation.x = startRot + Math.min(1, t) * Math.PI;
      if (t < 1) requestAnimationFrame(anim);
      else {
        laptopGroup.rotation.x = startRot + Math.PI;
        // Once flipped, the lid faces away and is no longer reachable —
        // stop it from catching raycasts through the open cavity behind it.
        lidTop.userData.interactable = false;
        markDone("flip");
        toast("Laptop flipped — bottom panel accessible");
      }
    };
    anim();
  }

  function unscrew(target) {
    const id = target.userData.id;
    removedScrews.add(id);
    target.visible = false;
    toast(`Removed ${id.replace("screw", "Screw ")}`);

    const carried = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.012, 12),
      new THREE.MeshStandardMaterial({ color: COLORS.screw, metalness: 0.85, roughness: 0.22 })
    );
    carried.rotation.z = Math.PI / 2;
    partHandAnchor.add(carried);
    carriedPartMesh = carried;
    carriedPartKind = "screw";

    if (removedScrews.size === 4) {
      markDone("screws");
      openPanel();
    }
  }

  function openPanel() {
    let t = 0;
    const anim = () => {
      t += 0.03;
      bottomPanelGroup.position.x = Math.min(1, t) * 0.35;
      if (t < 1) requestAnimationFrame(anim);
      else { bottomPanelGroup.visible = false; internals.visible = true; toast("Bottom panel off"); }
    };
    anim();
  }

  function placeScrewInTray() {
    const mesh = carriedPartMesh;
    partHandAnchor.remove(mesh);
    scene.add(mesh);
    const worldStart = new THREE.Vector3();
    partHandAnchor.getWorldPosition(worldStart);
    mesh.position.copy(worldStart);

    const slot = traySlots[nextTraySlot % traySlots.length];
    nextTraySlot++;
    const slotWorld = trayGroup.localToWorld(new THREE.Vector3(slot[0], 0.02, slot[1]));

    let t = 0;
    const anim = () => {
      t += 0.05;
      const tt = Math.min(1, t);
      mesh.position.lerpVectors(worldStart, slotWorld, tt);
      mesh.position.y += Math.sin(tt * Math.PI) * 0.06;
      mesh.rotation.x += 0.3;
      if (t < 1) requestAnimationFrame(anim);
      else mesh.position.copy(slotWorld);
    };
    anim();
    carriedPartMesh = null;
    carriedPartKind = null;
    toast("Screw placed in tray");
  }

  function fixRibbon(id) {
    const parts = ribbonPartsById[id];
    if (id === "trackpadRibbon") {
      // Backwards-but-latched: flip it 180° around its own length axis
      // back to the correct orientation. No unseating/reseating involved.
      let t = 0;
      const startRot = parts.cable.rotation.z;
      const anim = () => {
        t += 0.12;
        parts.cable.rotation.z = startRot * (1 - Math.min(1, t));
        if (t < 1) requestAnimationFrame(anim);
        else parts.cable.rotation.z = 0;
      };
      anim();
      markDone(id);
      toast("Trackpad ribbon flipped to the correct orientation");
    } else {
      // Disconnected: slide it back into the socket and swing the flap shut.
      const startPos = parts.cable.position.clone();
      const startLatchRot = parts.latch.rotation.x;
      let t = 0;
      const anim = () => {
        t += 0.1;
        const tt = Math.min(1, t);
        parts.cable.position.set(
          startPos.x * (1 - tt),
          startPos.y * (1 - tt),
          startPos.z * (1 - tt)
        );
        parts.latch.rotation.x = startLatchRot * (1 - tt);
        if (t < 1) requestAnimationFrame(anim);
        else { parts.cable.position.set(0, 0, 0); parts.latch.rotation.x = 0; }
      };
      anim();
      parts.socket.material.color.setHex(COLORS.connectorOn);
      markDone(id);
      toast(id === "pwrRibbon" ? "Power-button ribbon reseated" : "Keyboard ribbon reconnected");
    }
  }

  function runTest() {
    const success = taskState.diagnose.ok && repairsReady();
    const ledHex = success ? COLORS.ledGood : COLORS.ledBad;
    led.material.color.setHex(ledHex);
    ledGlow.material.color.setHex(ledHex);
    let blinks = 0;
    const iv = setInterval(() => {
      led.visible = !led.visible;
      ledGlow.visible = led.visible;
      blinks++;
      if (blinks > 5) {
        clearInterval(iv);
        led.visible = true;
        ledGlow.visible = true;
        markDone("test", success);
        if (success) {
          toast("Power button responds — fan spins, LED lit, boots normally");
          setTimeout(openSignoffModal, 900);
        } else {
          toast("Still failing — something wasn't actually fixed");
        }
      }
    }, 220);
  }

  // -------- Modal system --------
  function openModal(html) {
    modalOpen = true;
    clearHoverHighlight();
    hintEl.classList.remove("visible");
    modalCardEl.innerHTML = "";
    modalCardEl.appendChild(html);
    modalOverlayEl.classList.remove("hidden");
    document.exitPointerLock();
  }
  function closeModal() {
    modalOpen = false;
    modalOverlayEl.classList.add("hidden");
    fp.requestLock();
  }

  function openManualModal() {
    const wrap = el("div");
    wrap.innerHTML = `<div class="mc-kicker">Reference</div><h2>${RIBBON_SPEC_SHEET.title}</h2>`;
    const table = el("table", "spec-table");
    RIBBON_SPEC_SHEET.rows.forEach(([label, value]) => {
      const tr = el("tr");
      tr.innerHTML = `<td>${label}</td><td>${value}</td>`;
      table.appendChild(tr);
    });
    wrap.appendChild(table);
    const closeBtn = el("button", "mc-btn secondary", "Close");
    closeBtn.addEventListener("click", closeModal);
    wrap.appendChild(closeBtn);
    openModal(wrap);
  }

  function openDiagnoseModal() {
    const wrap = el("div");
    wrap.innerHTML =
      `<div class="mc-kicker">Diagnosis</div><h2>Diagnose the Fault</h2>` +
      `<p class="mc-body">Symptom: no response at all to the power button since a customer keyboard replacement — no fan, no LED. Select every issue you can see.</p>`;
    const grid = el("div", "mc-options");
    const chosen = new Set(diagnoseSelections);
    let submitted = taskState.diagnose.done;
    DIAGNOSE_OPTIONS.forEach((opt) => {
      const card = el("div", "mc-option", `<div>${opt.label}</div><div class="mc-explain">${opt.explain}</div>`);
      if (chosen.has(opt.id)) card.classList.add("selected");
      if (submitted) {
        if (opt.correct) card.classList.add("correct");
        else if (chosen.has(opt.id)) card.classList.add("incorrect");
      }
      card.addEventListener("click", () => {
        if (submitted) return;
        if (chosen.has(opt.id)) { chosen.delete(opt.id); card.classList.remove("selected"); }
        else { chosen.add(opt.id); card.classList.add("selected"); }
      });
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    const submitBtn = el("button", "mc-btn", "Check my diagnosis");
    const closeBtn = el("button", "mc-btn secondary", "Close");
    closeBtn.style.display = submitted ? "block" : "none";
    submitBtn.style.display = submitted ? "none" : "block";

    submitBtn.addEventListener("click", () => {
      submitted = true;
      diagnoseSelections = new Set(chosen);
      const correctSet = new Set(DIAGNOSE_OPTIONS.filter((o) => o.correct).map((o) => o.id));
      let allRight = chosen.size === correctSet.size && [...chosen].every((id) => correctSet.has(id));
      [...grid.children].forEach((card, i) => {
        const opt = DIAGNOSE_OPTIONS[i];
        if (opt.correct) card.classList.add("correct");
        else if (chosen.has(opt.id)) card.classList.add("incorrect");
      });
      const fb = el("div", `mc-feedback ${allRight ? "good" : "bad"}`,
        allRight ? "Correct — those are the likely causes." : "Not quite every cause was correctly identified — correct ones are highlighted in green.");
      wrap.insertBefore(fb, submitBtn);
      markDone("diagnose", allRight);
      submitBtn.style.display = "none";
      closeBtn.style.display = "block";
    });
    closeBtn.addEventListener("click", closeModal);
    wrap.appendChild(submitBtn);
    wrap.appendChild(closeBtn);
    openModal(wrap);
  }

  function openSignoffModal() {
    const scoreTasks = TASKS.filter((t) => t.id !== "signoff");
    const okCount = scoreTasks.filter((t) => taskState[t.id].ok).length;
    const pct = Math.round((okCount / scoreTasks.length) * 100);
    const wrap = el("div");
    wrap.innerHTML =
      `<div class="mc-kicker">Close Ticket</div><h2>Return to Department</h2>` +
      `<div class="mc-score"><div class="big">${pct}%</div><div>steps completed correctly on first try</div></div>`;
    const list = el("ul", "mc-report");
    scoreTasks.forEach((t) => {
      const st = taskState[t.id];
      list.appendChild(el("li", st.ok ? "ok" : "bad", t.label));
    });
    wrap.appendChild(list);
    const doneBtn = el("button", "mc-btn", "Attach repair notes & return unit");
    doneBtn.addEventListener("click", () => {
      markDone("signoff");
      toast("Ticket closed. Nice work.");
      closeModal();
    });
    wrap.appendChild(doneBtn);
    openModal(wrap);
  }

  // -------- Input dispatch --------
  function tryPrimaryAction() {
    if (modalOpen || !hovered) return;
    const { kind, id, requiresTool } = hovered.userData;
    if (kind === "screw" && !removedScrews.has(id)) {
      if (!taskState.flip.done) return;
      if (requiresTool && heldTool !== requiresTool) return;
      if (carriedPartMesh) return;
      unscrew(hovered);
    } else if (kind === "ribbon" && taskState.diagnose.done && !taskState[id]?.done) {
      fixRibbon(id);
    } else if (kind === "power-button" && taskState.discharge.done && repairsReady() && !taskState.test.done) {
      runTest();
    }
  }

  function trySecondaryAction() {
    if (modalOpen || !hovered) return;
    const { kind, id } = hovered.userData;
    if (kind === "grab-tool" && heldTool !== id) pickUpTool(hovered);
    else if (kind === "dropzone" && carriedPartKind === "screw") placeScrewInTray();
    else if (kind === "plug" && !taskState.unplug.done) {
      let t = 0;
      const anim = () => {
        t += 0.08;
        plugGroup.position.z = -ROOM_D / 2 + 0.02 + Math.min(1, t) * 0.08;
        if (t < 1) requestAnimationFrame(anim);
      };
      anim();
      markDone("unplug");
      toast("Unplugged from the wall");
    } else if (kind === "wearable" && !taskState.strap.done) {
      strapGroup.visible = false;
      markDone("strap");
      toast("Wrist strap on and clipped to ground");
      renderWornItems();
    } else if (kind === "mat" && !taskState.mat.done) {
      markDone("mat");
      toast("Confirmed — unit is on the anti-static mat");
    } else if (kind === "manual") {
      openManualModal();
    } else if (kind === "flip-laptop" && !taskState.flip.done && esdReady()) {
      flipLaptop();
    } else if (kind === "clipboard" && taskState.screws.done) {
      openDiagnoseModal();
    }
  }

  renderer.domElement.addEventListener("click", () => {
    if (modalOpen) return;
    // A click-and-drag look (the fallback for contexts where pointer lock
    // doesn't engage, e.g. an embedded/sandboxed frame) ends in a mouseup
    // too — don't let that also register as an interact on whatever the
    // crosshair ended up over.
    if (fp.consumeWasDragLook()) return;
    if (hovered && hovered.userData.kind === "power-button" && !taskState.discharge.done) return;
    tryPrimaryAction();
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyE") trySecondaryAction();
  });

  renderer.domElement.addEventListener("mousedown", () => {
    if (modalOpen) return;
    if (hovered && hovered.userData.kind === "power-button" && !taskState.discharge.done) {
      holding = true;
      holdStart = performance.now();
    }
  });
  function stopHold() {
    if (!holding) return;
    holding = false;
    if (!taskState.discharge.done) setPowerButtonPress(0);
  }
  renderer.domElement.addEventListener("mouseup", stopHold);
  renderer.domElement.addEventListener("mouseleave", stopHold);

  const interactableRegistry = [];
  scene.traverse((obj) => { if (obj.userData && obj.userData.interactable) interactableRegistry.push(obj); });

  // Cast/receive shadows everywhere by default — cheaper than hand-picking
  // which meshes in this scene should ground themselves, and nothing here
  // is large/flat enough for a wrongly-shadowed mesh to be a visible
  // problem. Floor/bench/mat surfaces mainly receive; small parts mainly
  // cast onto them.
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  // Room shell is a single BackSide box — casting from inside-facing faces
  // makes no sense and can shadow-acne the walls themselves.
  room.castShadow = false;
  floor.receiveShadow = true;

  // -------- Main loop --------
  function animate() {
    if (!container.isConnected) return;
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    if (!modalOpen) fp.update(dt);
    updateHint();

    if (holding && !taskState.discharge.done) {
      const pct = Math.min(1, (performance.now() - holdStart) / HOLD_DURATION);
      setPowerButtonPress(pct);
      if (pct >= 1) {
        holding = false;
        markDone("discharge");
        setTimeout(() => setPowerButtonPress(0), 250);
        toast("Discharged — held for 3 seconds");
      }
    }

    renderer.render(scene, camera);
  }
  const clock = new THREE.Clock();
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return {
    requestLock: fp.requestLock,
    isLocked: fp.isLocked,
    isModalOpen: () => modalOpen,
  };
}
