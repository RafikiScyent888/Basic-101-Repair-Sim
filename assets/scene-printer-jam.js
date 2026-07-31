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
  clipboard: 0x8a5a2b,
  powerBtn: 0x4b5261,
  powerBtnPressed: 0x2e3340,
  connectorOff: 0xd9a233,
  connectorOn: 0x3fae5c,
  ledOff: 0x334155,
  ledGood: 0x22c55e,
  ledBad: 0xef4444,
  body: 0xe7e7e2,
  bodyTrim: 0x9a9d9e,
  toner: 0x1c1e21,
  manual: 0x3b5a8a,
  fuserMetal: 0x4a4d52,
  gearMetal: 0x9aa0a8,
};

const JAM_SPEC_SHEET = {
  title: "HP LaserJet Pro M404dn — Paper Path Reassembly Service Notes",
  rows: [
    ["Access door interlock", "The paper-path access door has a spring-loaded interlock switch. The control board treats an unconfirmed door as open and refuses to start or continue a print cycle, even with power, toner, and paper all normal."],
    ["Fuser roller alignment", "The fuser roller assembly seats against locating tabs on both ends of its cradle. Tolerance is tight — a roller reseated even slightly off-tab can't grip and advance paper through the fuser, stalling the job partway through."],
    ["Pickup roller drive gear", "The pickup roller is driven by a small gear pressed onto a knurled shaft. If it isn't pressed fully home during reassembly it free-spins on the shaft, and the roller underneath never turns to feed paper from the tray."],
    ["Reassembly order", "When clearing a jam, the access door, fuser cradle, and pickup gear are the three points most commonly disturbed and reinstalled wrong by hand, since none of them require tools to open."],
    ["Diagnosis tip", "After any customer-cleared jam, check the parts they had to touch to clear it first — door latch, fuser roller, and pickup gear — before assuming a deeper hardware fault."],
  ],
};

const DIAGNOSE_OPTIONS = [
  {
    id: "doorInterlock", correct: true,
    label: "Paper-path access door isn't fully latched",
    explain: "Correct — this printer's safety interlock stops the print cycle entirely if the door isn't confirmed closed, even though everything else is fine.",
  },
  {
    id: "fuserAligned", correct: true,
    label: "Fuser roller assembly is misaligned",
    explain: "Correct — a fuser knocked out of alignment during reassembly can't properly grip and feed paper through, stalling the job.",
  },
  {
    id: "rollerGear", correct: true,
    label: "Pickup roller drive gear popped off its shaft",
    explain: "Correct — without this gear engaged, the pickup roller can't turn, so paper never properly feeds from the tray.",
  },
  {
    id: "toner", correct: false,
    label: "Toner cartridge is bad",
    explain: "Not the cause here — a bad cartridge would produce faded or blank prints, not a stalled/incomplete job; this points to the paper path, not toner.",
  },
  {
    id: "tray", correct: false,
    label: "Paper tray is empty or misloaded",
    explain: "Not the cause here — the ticket doesn't indicate a tray issue, and this trail of disturbed parts all traces back to the jam-clearing reassembly.",
  },
];

const TASKS = [
  { id: "unplug", label: "Unplug the power cable from the power strip." },
  { id: "discharge", label: "Hold the power button 3 seconds to discharge residual power." },
  { id: "strap", label: "Put on your ESD wrist strap." },
  { id: "mat", label: "Confirm the unit is on an anti-static mat." },
  { id: "screws", label: "Remove the 2 back panel screws and store them in the tray." },
  { id: "diagnose", label: "Check the ticket and diagnose the fault." },
  { id: "doorInterlock", label: "Fully close and latch the paper-path access door." },
  { id: "fuserAligned", label: "Realign the fuser roller assembly." },
  { id: "rollerGear", label: "Reseat the pickup roller drive gear." },
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

  // -------- Workbench, holding the printer --------
  // The bench sits well clear of the back wall (unlike the laptop scenario)
  // so the player can walk around behind it to reach the printer's back panel.
  const BENCH_Z = -1.0;
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

  // -------- Power strip + plug (unplug task) --------
  // A desk-mounted power strip instead of a wall outlet — the actual wall
  // is 1.5m behind the desk (kept clear so the player can walk around to
  // the printer's back panel), which put a wall-mounted outlet just out of
  // interaction reach from the front. A power strip sitting right on the
  // desk is at least as realistic and keeps the plug directly reachable
  // without needing to route around the desk first.
  const stripGroup = new THREE.Group();
  // Kept clear of the anti-static mat (0.55, ..., 0.15) so the two never
  // sit close enough to compete for hover/click priority.
  stripGroup.position.set(1.0, 0.93, 0.35);
  benchGroup.add(stripGroup);
  const stripBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.03, 0.06),
    new THREE.MeshStandardMaterial({ color: COLORS.outletPlate, roughness: 0.6 })
  );
  stripGroup.add(stripBody);
  const socketTex = canvasTex(64, 32, (ctx, w, h) => {
    ctx.fillStyle = "#2a2d32";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#111214";
      ctx.fillRect(6 + i * 20, h * 0.3, 4, h * 0.4);
    }
  });
  const stripFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.025),
    new THREE.MeshStandardMaterial({ map: socketTex, roughness: 0.5 })
  );
  stripFace.rotation.x = -Math.PI / 2;
  stripFace.position.y = 0.016;
  stripGroup.add(stripFace);
  const plugGroup = new THREE.Group();
  plugGroup.position.set(0, 0.02, -0.02);
  stripGroup.add(plugGroup);
  const plugMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.03),
    new THREE.MeshStandardMaterial({ color: COLORS.plug, roughness: 0.5 })
  );
  plugGroup.add(plugMesh);
  plugGroup.userData = { interactable: true, kind: "plug", id: "plug" };

  // Power cord from the strip to the printer's rear inlet (decorative)
  const acCableMat = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.75 });
  const acCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.0, 0.93, 0.32),
    new THREE.Vector3(0.3, 0.93, -0.1),
    new THREE.Vector3(-0.35, 0.93, -0.15),
  ]);
  benchGroup.add(new THREE.Mesh(
    new THREE.TubeGeometry(acCurve, 20, 0.005, 6, false),
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

  // Ticket clipboard — a real printed work order matching the diagnose modal.
  const ticketTex = canvasTex(280, 360, (ctx, w, h) => {
    ctx.fillStyle = "#f4f2ea";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c9c4b4";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = "#111318";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "left";
    ctx.fillText("WORK ORDER  #2026-0748", 16, 28);
    ctx.strokeStyle = "#8a8578";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(16, 38); ctx.lineTo(w - 16, 38); ctx.stroke();

    ctx.font = "bold 10px Arial";
    ctx.fillText("DEVICE", 16, 56);
    ctx.font = "10px Arial";
    ctx.fillText("HP LaserJet Pro M404dn", 16, 70);
    ctx.fillText("Paper jam cleared by customer,", 16, 82);
    ctx.fillText("unit reassembled", 16, 93);

    ctx.font = "bold 10px Arial";
    ctx.fillText("REPORTED SYMPTOM", 16, 112);
    ctx.font = "10px Arial";
    const lines = [
      "Won't complete a print job since",
      "the customer cleared a paper jam",
      "and reassembled the unit.",
    ];
    lines.forEach((line, i) => ctx.fillText(line, 16, 128 + i * 15));

    ctx.font = "bold 10px Arial";
    ctx.fillText("CHECK EVERY CAUSE YOU FIND:", 16, 205);
    const checks = [
      "Access door interlock", "Fuser roller alignment", "Pickup roller gear",
      "Toner cartridge", "Paper tray",
    ];
    checks.forEach((c, i) => {
      const y = 221 + i * 20;
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

  // -------- Printer on the bench --------
  // HP LaserJet Pro M404dn: compact monochrome workgroup laser printer —
  // light gray/white plastic shell, front control panel with a small mono
  // LCD, front-loading paper tray, and a rear panel over the PSU/fuse.
  const PW = 0.34, PD = 0.3, PH = 0.26;
  const printerGroup = new THREE.Group();
  printerGroup.position.set(-0.35, 0.926 + PH / 2, 0);
  benchGroup.add(printerGroup);

  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.body, roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: COLORS.bodyTrim, roughness: 0.5 });

  // The case shell stops short of the full depth, leaving a real hollow
  // behind it (matched to the back panel) for the fuse/PSU/harness to sit
  // in — a solid full-depth shell would hide them once the panel comes off.
  const CAVITY_DEPTH = 0.06;
  const bodyDepth = PD - CAVITY_DEPTH;
  const body = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, bodyDepth), bodyMat);
  body.position.z = PD / 2 - bodyDepth / 2;
  printerGroup.add(body);

  // Recessed top output tray
  const outputTray = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 0.72, 0.015, PD * 0.6),
    trimMat
  );
  outputTray.position.set(0, PH / 2 + 0.006, -PD * 0.08);
  printerGroup.add(outputTray);

  // Control panel deck (top-front) with a small mono LCD + button dots
  const lcdTex = canvasTex(160, 64, (ctx, w, h) => {
    ctx.fillStyle = "#1c2b22";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8fe0a8";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Ready", 10, 26);
    ctx.font = "9px monospace";
    ctx.fillText("000 pages remaining", 10, 44);
  });
  const controlDeck = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 0.42, 0.018, PD * 0.22),
    trimMat
  );
  controlDeck.position.set(-PW * 0.12, PH / 2 + 0.009, PD / 2 - 0.06);
  printerGroup.add(controlDeck);
  const lcd = new THREE.Mesh(
    new THREE.PlaneGeometry(PW * 0.26, PD * 0.12),
    new THREE.MeshStandardMaterial({ map: lcdTex, roughness: 0.4 })
  );
  lcd.rotation.x = -Math.PI / 2;
  lcd.position.set(-PW * 0.14, PH / 2 + 0.019, PD / 2 - 0.06);
  printerGroup.add(lcd);
  [-0.03, 0, 0.03].forEach((dz) => {
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.006, 12),
      new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.5 })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(PW * 0.05, PH / 2 + 0.019, PD / 2 - 0.09 + dz);
    printerGroup.add(dot);
  });

  // Power button — on the control deck, pressed from above (discharge hold,
  // later the post-repair power-on test).
  const powerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.008, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.powerBtn, metalness: 0.6, roughness: 0.35 })
  );
  powerBtn.position.set(PW * 0.05, PH / 2 + 0.021, PD / 2 - 0.115);
  printerGroup.add(powerBtn);
  const powerBtnHit = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), new THREE.MeshBasicMaterial({ visible: false }));
  powerBtnHit.position.copy(powerBtn.position);
  powerBtnHit.userData = { interactable: true, kind: "power-button", id: "powerButton" };
  printerGroup.add(powerBtnHit);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), new THREE.MeshBasicMaterial({ color: COLORS.ledOff }));
  led.rotation.x = -Math.PI / 2;
  led.position.set(-PW * 0.02, PH / 2 + 0.019, PD / 2 - 0.115);
  printerGroup.add(led);

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
  printerGroup.add(ledGlow);

  // Front toner cartridge — sits proud of the front face, drum-style.
  const tonerTex = canvasTex(96, 32, (ctx, w, h) => {
    ctx.fillStyle = "#e8e6df";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#111318";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("HP 58A", w / 2, h * 0.6);
  });
  const toner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, PW * 0.42, 20),
    [
      new THREE.MeshStandardMaterial({ color: COLORS.toner, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: tonerTex, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: tonerTex, roughness: 0.6 }),
    ]
  );
  toner.rotation.z = Math.PI / 2;
  toner.position.set(-0.02, 0.025, PD / 2 + 0.01);
  // Decorative in this variant — a distractor on the diagnose ticket, not
  // an actual fault object; the real faults are all inside the back panel.
  printerGroup.add(toner);

  // Front-loading paper tray, protruding slightly with a paper stack visible.
  // Decorative in this variant — a distractor on the diagnose ticket.
  const trayFrontGroup = new THREE.Group();
  trayFrontGroup.position.set(0, -PH / 2 + 0.03, PD / 2 + 0.045);
  printerGroup.add(trayFrontGroup);
  const paperTrayBody = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 0.82, 0.05, 0.09),
    trimMat
  );
  trayFrontGroup.add(paperTrayBody);
  const paperStack = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 0.7, 0.012, 0.075),
    new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.9 })
  );
  paperStack.position.y = 0.03;
  trayFrontGroup.add(paperStack);

  // Rear power inlet (IEC) — exterior, purely decorative in this variant
  // (the fault here is the reassembled paper path, not power delivery).
  const powerInlet = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.022, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6 })
  );
  powerInlet.position.set(-PW / 2 + 0.05, -PH / 2 + 0.05, -PD / 2 - 0.004);
  printerGroup.add(powerInlet);

  // -------- Removable back panel + 2 screws --------
  const PANEL_T = 0.01;
  const panelVentTex = canvasTex(128, 96, (ctx, w, h) => {
    ctx.fillStyle = "#d7d7d2";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b9b9b3";
    for (let y = h * 0.1; y < h * 0.55; y += 6) {
      ctx.fillRect(w * 0.1, y, w * 0.35, 3);
    }
    ctx.fillStyle = "#5a5c5e";
    ctx.font = "7px Arial";
    ctx.textAlign = "left";
    ctx.fillText("HP LaserJet Pro M404dn", w * 0.06, h * 0.72);
    ctx.font = "6px Arial";
    ctx.fillText("MODEL W1A53A  S/N 2026-0592-C", w * 0.06, h * 0.82);
    ctx.fillText("100-127V~ 4.5A  50/60Hz", w * 0.06, h * 0.9);
  });
  const backPanelGroup = new THREE.Group();
  backPanelGroup.position.set(0, PH * 0.05, -PD / 2 + PANEL_T / 2);
  printerGroup.add(backPanelGroup);
  const backPanelPlate = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 0.7, PH * 0.62, PANEL_T),
    [trimMat, trimMat, trimMat, trimMat, trimMat, new THREE.MeshStandardMaterial({ map: panelVentTex, roughness: 0.7 })]
  );
  backPanelGroup.add(backPanelPlate);

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
  const screwLocal = [[-0.09, 0.08], [0.09, 0.08]];
  const screwMeshes = {};
  screwLocal.forEach(([x, y], i) => {
    const id = "screw" + (i + 1);
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.012, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.screw, metalness: 0.85, roughness: 0.22 })
    );
    screw.rotation.x = Math.PI / 2;
    const head = new THREE.Mesh(
      new THREE.CircleGeometry(0.007, 16),
      new THREE.MeshStandardMaterial({ map: screwHeadTex, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })
    );
    head.position.z = -0.0061;
    screw.add(head);
    screw.position.set(x, y, -0.007);
    screw.userData = { interactable: true, kind: "screw", id, requiresTool: "screwdriver" };
    backPanelGroup.add(screw);
    screwMeshes[id] = screw;
  });

  // -------- Internals, revealed once the back panel is removed --------
  const internals = new THREE.Group();
  internals.visible = false;
  internals.position.set(0, PH * 0.05, -PD / 2 + 0.035);
  printerGroup.add(internals);

  // Paper-path access door — hinged on the left edge, shown swung open and
  // not latched (as the customer left it after clearing the jam). A small
  // interlock-switch tab sits on the frame right beside the hinge; the
  // control board reads this switch to know the door is truly closed, and
  // refuses to run a print cycle otherwise, even with everything else fine.
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, PH * 0.42, 0.012),
    new THREE.MeshStandardMaterial({ color: COLORS.bodyTrim, roughness: 0.55 })
  );
  doorFrame.position.set(-PW * 0.15, 0.03, -0.006);
  internals.add(doorFrame);

  const doorHinge = new THREE.Group();
  doorHinge.position.set(-PW * 0.15, 0.03, -0.006);
  doorHinge.rotation.y = -0.55; // propped open / not latched
  internals.add(doorHinge);
  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 0.32, PH * 0.38, 0.006),
    new THREE.MeshStandardMaterial({ color: COLORS.body, roughness: 0.5 })
  );
  doorPanel.position.set(PW * 0.16, 0, 0);
  doorHinge.add(doorPanel);
  doorHinge.userData = { interactable: true, kind: "connector", id: "doorInterlock" };

  const interlockTab = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.014, 0.01),
    new THREE.MeshStandardMaterial({ color: COLORS.connectorOff, roughness: 0.5 })
  );
  interlockTab.position.set(-PW * 0.15 - 0.02, 0.03 + PH * 0.14, 0.006);
  internals.add(interlockTab);

  // Fuser roller assembly — should sit level in its cradle; reassembled
  // with one end knocked out of its locating tab, so it hangs visibly
  // tilted — enough to stop it gripping and feeding paper through.
  const fuserMat = new THREE.MeshStandardMaterial({ color: COLORS.fuserMetal, metalness: 0.4, roughness: 0.4 });
  const fuserRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, PH * 0.32, 16), fuserMat);
  fuserRoller.rotation.z = Math.PI / 2;
  fuserRoller.rotation.x = 0.35; // knocked off level
  fuserRoller.position.set(PW * 0.08, 0.055, 0.01);
  fuserRoller.userData = { interactable: true, kind: "connector", id: "fuserAligned" };
  internals.add(fuserRoller);
  const fuserCradle = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.01, 0.018),
    new THREE.MeshStandardMaterial({ color: COLORS.bodyTrim, roughness: 0.6 })
  );
  fuserCradle.position.set(PW * 0.08, 0.055 - PH * 0.16, 0.01);
  internals.add(fuserCradle);

  // Pickup roller drive gear — a small toothed gear that presses onto a
  // knurled drive shaft. Reassembled resting against the shaft but not
  // pressed home, so it's visibly offset and free-spins instead of
  // turning the pickup roller underneath.
  const gearShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.025, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b2f34, metalness: 0.6, roughness: 0.4 })
  );
  gearShaft.rotation.x = Math.PI / 2;
  gearShaft.position.set(-PW * 0.1, -0.055, -0.006);
  internals.add(gearShaft);

  const gearMat = new THREE.MeshStandardMaterial({ color: COLORS.gearMetal, metalness: 0.7, roughness: 0.3 });
  const GEAR_SHAFT_X = -PW * 0.1;
  const driveGear = new THREE.Group();
  driveGear.position.set(GEAR_SHAFT_X + 0.03, -0.055, -0.006);
  internals.add(driveGear);
  const gearBody = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 12), gearMat);
  gearBody.rotation.x = Math.PI / 2;
  driveGear.add(gearBody);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.009), gearMat);
    tooth.rotation.x = Math.PI / 2;
    tooth.position.set(Math.cos(angle) * 0.015, Math.sin(angle) * 0.015, 0);
    driveGear.add(tooth);
  }
  driveGear.userData = { interactable: true, kind: "connector", id: "rollerGear" };

  // -------- Tool table: screwdriver + wrist strap --------
  const toolTableGroup = new THREE.Group();
  toolTableGroup.position.set(1.6, 0, -0.7);
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
  screwdriverOnTable.position.set(-0.1, 0.79, -0.05);
  screwdriverOnTable.userData = { interactable: true, kind: "grab-tool", id: "screwdriver" };
  toolTableGroup.add(screwdriverOnTable);

  const strapGroup = new THREE.Group();
  strapGroup.position.set(0.1, 0.79, -0.05);
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
      { minX: 1.35, maxX: 1.85, minZ: -0.9, maxZ: -0.5 },
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
    const html = `<div class="tl-title">Printer Won't Print After Jam</div><ul>${TASKS.map((t) => {
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

    // Small/thin props are easy for a direct ray to miss — fall back to the
    // nearest interactable within a generous on-screen radius, and prefer
    // whichever candidate is actually physically closer to the camera.
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
    powerBtn.position.y = PH / 2 + 0.021 - pct * 0.003;
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

    if (kind === "plug" && !taskState.unplug.done) text = `<kbd>E</kbd> Unplug power cable from power strip`;
    else if (kind === "power-button") {
      if (!taskState.discharge.done) {
        text = holding
          ? `Hold… ${Math.min(100, Math.round(((performance.now() - holdStart) / HOLD_DURATION) * 100))}%`
          : `<kbd>Hold Click</kbd> Discharge residual power (3s)`;
      } else if (faultsFixed() && !taskState.test.done) {
        text = `<kbd>Click</kbd> Power on and test`;
      }
    } else if (kind === "wearable" && !taskState.strap.done) text = `<kbd>E</kbd> Put on ESD wrist strap`;
    else if (kind === "mat" && !taskState.mat.done) text = `<kbd>E</kbd> Confirm unit is on the mat`;
    else if (kind === "manual") text = `<kbd>E</kbd> Read printer service notes`;
    else if (kind === "clipboard") {
      text = taskState.diagnose.done ? `<kbd>E</kbd> Review diagnosis` : `<kbd>E</kbd> Diagnose the fault`;
    } else if (kind === "grab-tool" && heldTool !== id) text = `<kbd>E</kbd> Pick up Screwdriver`;
    else if (kind === "screw" && !removedScrews.has(id)) {
      if (!esdReady()) text = `Complete ESD safety steps first`;
      else if (requiresTool && heldTool !== requiresTool) text = `Need the screwdriver equipped first`;
      else if (carriedPartMesh) text = `Hands full — place what you're carrying first`;
      else text = `<kbd>Click</kbd> Unscrew`;
    } else if (kind === "dropzone" && carriedPartKind === "screw") text = `<kbd>E</kbd> Place screw in tray`;
    else if (kind === "connector" && !taskState[id]?.done) {
      if (!taskState.diagnose.done) text = `Diagnose the fault first`;
      else if ((id === "doorInterlock" || id === "fuserAligned" || id === "rollerGear") && !taskState.screws.done) text = `Open the back panel first`;
      else {
        const labels = {
          doorInterlock: "Close and latch the access door",
          fuserAligned: "Realign the fuser roller",
          rollerGear: "Reseat the pickup roller gear",
        };
        text = `<kbd>Click</kbd> ${labels[id]}`;
      }
    }

    if (text) { hintEl.innerHTML = text; hintEl.classList.add("visible"); }
    else hintEl.classList.remove("visible");
  }

  function esdReady() {
    return taskState.unplug.done && taskState.discharge.done && taskState.strap.done && taskState.mat.done;
  }
  function faultsFixed() {
    return taskState.doorInterlock.done && taskState.fuserAligned.done && taskState.rollerGear.done;
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

    if (removedScrews.size === 2) {
      markDone("screws");
      openPanel();
    }
  }

  function openPanel() {
    let t = 0;
    const anim = () => {
      t += 0.03;
      backPanelGroup.position.x = Math.min(1, t) * 0.3;
      if (t < 1) requestAnimationFrame(anim);
      else { backPanelGroup.visible = false; internals.visible = true; toast("Back panel off"); }
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

  function fixConnector(id) {
    if (id === "doorInterlock") {
      interlockTab.material.color.setHex(COLORS.connectorOn);
      let t = 0;
      const startRot = doorHinge.rotation.y;
      const anim = () => {
        t += 0.06;
        const tt = Math.min(1, t);
        doorHinge.rotation.y = startRot * (1 - tt);
        if (t < 1) requestAnimationFrame(anim);
        else doorHinge.rotation.y = 0;
      };
      anim();
      markDone("doorInterlock");
      toast("Access door closed and latched — interlock engaged");
    } else if (id === "fuserAligned") {
      let t = 0;
      const startTilt = fuserRoller.rotation.x;
      const anim = () => {
        t += 0.08;
        const tt = Math.min(1, t);
        fuserRoller.rotation.x = startTilt * (1 - tt);
        if (t < 1) requestAnimationFrame(anim);
        else fuserRoller.rotation.x = 0;
      };
      anim();
      markDone("fuserAligned");
      toast("Fuser roller realigned in its cradle");
    } else if (id === "rollerGear") {
      let t = 0;
      const startX = driveGear.position.x;
      const anim = () => {
        t += 0.08;
        const tt = Math.min(1, t);
        driveGear.position.x = startX + (GEAR_SHAFT_X - startX) * tt;
        driveGear.rotation.z += 0.5;
        if (t < 1) requestAnimationFrame(anim);
        else driveGear.position.x = GEAR_SHAFT_X;
      };
      anim();
      markDone("rollerGear");
      toast("Pickup roller drive gear pressed home on its shaft");
    }
  }

  function runTest() {
    const success = taskState.diagnose.ok && faultsFixed();
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
          toast("Power restored — normal startup sequence");
          setTimeout(openSignoffModal, 900);
        } else {
          toast("Still dead — something wasn't actually fixed");
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
    wrap.innerHTML = `<div class="mc-kicker">Reference</div><h2>${JAM_SPEC_SHEET.title}</h2>`;
    const table = el("table", "spec-table");
    JAM_SPEC_SHEET.rows.forEach(([label, value]) => {
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
      `<p class="mc-body">Symptom: won't complete a print job since the customer cleared a paper jam and reassembled the unit. Select every issue you can see.</p>`;
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
      if (!esdReady()) return;
      if (requiresTool && heldTool !== requiresTool) return;
      if (carriedPartMesh) return;
      unscrew(hovered);
    } else if (kind === "connector" && taskState.diagnose.done && !taskState[id]?.done) {
      if ((id === "doorInterlock" || id === "fuserAligned" || id === "rollerGear") && !taskState.screws.done) return;
      fixConnector(id);
    } else if (kind === "power-button" && taskState.discharge.done && faultsFixed() && !taskState.test.done) {
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
    } else if (kind === "clipboard") {
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
    // TEMP DEBUG HOOKS — removed before finishing.
    __debugGetState: () => JSON.parse(JSON.stringify(taskState)),
    __debugGetPlayer: () => ({ x: fp.yawObject.position.x, y: fp.yawObject.position.y, z: fp.yawObject.position.z }),
    __debugSetLook: (yawRad, pitchRad) => { fp.yawObject.rotation.y = yawRad; fp.pitchObject.rotation.x = pitchRad; },
    __debugProject: (name) => {
      const objs = {
        plug: plugGroup, mat: matPad, clipboard, manual, screwdriver: screwdriverOnTable,
        strap: strapGroup, tray: trayGroup, screw1: screwMeshes.screw1, screw2: screwMeshes.screw2,
        powerButton: powerBtnHit, door: doorHinge, fuser: fuserRoller, gear: driveGear,
      };
      const obj = objs[name];
      if (!obj) return null;
      const v = new THREE.Vector3();
      obj.getWorldPosition(v);
      const camP = new THREE.Vector3();
      camera.getWorldPosition(camP);
      const dist = v.distanceTo(camP);
      const proj = v.clone().project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: rect.left + (proj.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-proj.y * 0.5 + 0.5) * rect.height,
        dist, inFront: proj.z <= 1,
      };
    },
  };
}
