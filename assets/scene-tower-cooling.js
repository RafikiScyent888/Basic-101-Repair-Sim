import * as THREE from "three";
import { createFPController } from "./engine/fp-controller.js";

const COLORS = {
  floor: 0x8a7256,
  wall: 0xd9d2c4,
  wallTrim: 0x9c9384,
  bench: 0x6b4a2f,
  benchLeg: 0x3d2c1c,
  chassis: 0x1b1c1f,
  chassisEdge: 0x3a3d42,
  panel: 0x1b1c1f,
  screw: 0xc9cdd4,
  boardGreen: 0x1f6b3a,
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
  connectorOn: 0x3fae5c,
  ledOff: 0x334155,
  ledGood: 0x22c55e,
  ledBad: 0xef4444,
  rgbHub: 0x1a1c1f,
  pinLoose: 0xd9a233,
};

const COOLING_SPEC_SHEET = {
  title: "ASUS TUF Gaming Z790-Plus WiFi — Cooling & Fan Headers",
  rows: [
    ["CPU_FAN header", "The CPU cooler must connect here directly — the board uses this signal for fan-speed control and fail-safe shutdown, not a hub"],
    ["Cooler mounting", "All 4 push-pins (or screws) must be fully seated for even contact pressure against the CPU"],
    ["Case airflow", "Front/bottom fans should be intake (blowing in), rear/top fans should be exhaust (blowing out) — check the airflow arrow printed on the fan frame"],
    ["Diagnosis tip", "Boots fine but throttles/crashes only under load, with the case running hot, points to airflow or cooler contact — not power or memory."],
  ],
};

const DIAGNOSE_OPTIONS = [
  {
    id: "cpuFanHub", correct: true,
    label: "CPU cooler's fan cable was plugged into the new fan hub instead of the CPU fan header",
    explain: "Correct — the board can't see or control CPU fan speed from the hub, so it can't respond properly to rising CPU temperature.",
  },
  {
    id: "coolerScrew", correct: true,
    label: "CPU cooler is missing a mounting screw, so it isn't seated flush",
    explain: "Correct — uneven mounting pressure breaks thermal contact with the CPU, causing poor heat transfer and throttling.",
  },
  {
    id: "fanBackwards", correct: true,
    label: "Front intake fan is installed backwards, blowing out instead of in",
    explain: "Correct — with intake reversed, the case loses front-to-back airflow and heat builds up across every component, not just the CPU.",
  },
  {
    id: "ram", correct: false,
    label: "RAM stick is bad or improperly seated",
    explain: "Not the cause here — the system boots and runs fine at idle; this points to a thermal issue, not a memory issue.",
  },
  {
    id: "psu", correct: false,
    label: "Power supply is failing",
    explain: "Not the cause here — a failing PSU wouldn't specifically correlate with load-related heat buildup right after a fan/cooling change.",
  },
];

const TASKS = [
  { id: "unplug", label: "Unplug the unit from the wall outlet." },
  { id: "discharge", label: "Hold the power button 3 seconds to discharge residual power." },
  { id: "strap", label: "Put on your ESD wrist strap." },
  { id: "mat", label: "Move the case onto the anti-static mat." },
  { id: "screws", label: "Remove all 4 side-panel screws and store them in the tray." },
  { id: "diagnose", label: "Check the ticket and diagnose the fault." },
  { id: "cpuFanHub", label: "Move the CPU cooler's fan cable from the RGB hub back to the CPU_FAN header." },
  { id: "coolerScrew", label: "Install the missing CPU cooler mounting screw." },
  { id: "fanBackwards", label: "Flip the front intake fan around to blow into the case." },
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
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#a9713f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.04})`;
    ctx.fillRect(0, y, canvas.width, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
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

// Kingston FURY Beast DDR5 — black low-profile aluminum heatsink with the
// embossed wordmark, gold contact edge. Matches the real product the
// student will actually be handling on the bench.
function buildKingstonFuryRam() {
  const group = new THREE.Group();
  const pcbW = 0.004, pcbH = 0.092, pcbD = 0.027;

  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(pcbW, pcbH, pcbD),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.7 })
  );
  group.add(pcb);

  const contactTex = canvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i < 44; i++) ctx.fillRect((i / 44) * w, 0, 1.4, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  const contactStrip = new THREE.Mesh(
    new THREE.BoxGeometry(pcbW + 0.0006, 0.01, pcbD * 0.94),
    new THREE.MeshStandardMaterial({ map: contactTex, metalness: 0.85, roughness: 0.3 })
  );
  contactStrip.position.y = -pcbH / 2 + 0.005;
  group.add(contactStrip);

  const heatsinkTex = canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = "#111214";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.lineWidth = 1;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 6);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8e9eb";
    ctx.font = "bold 54px Arial";
    ctx.fillText("KINGSTON", w / 2, h * 0.28);
    ctx.fillStyle = "#c7cbd1";
    ctx.font = "italic bold 68px Arial";
    ctx.fillText("FURY", w / 2, h * 0.48);
    ctx.fillStyle = "#9aa0a8";
    ctx.font = "bold 30px Arial";
    ctx.fillText("BEAST", w / 2, h * 0.58);
    ctx.fillStyle = "#7d838b";
    ctx.font = "26px Arial";
    ctx.fillText("DDR5", w / 2, h * 0.82);
  });
  const heatsinkMat = new THREE.MeshStandardMaterial({ map: heatsinkTex, color: 0xffffff, metalness: 0.6, roughness: 0.45 });
  const heatsinkGeo = new THREE.BoxGeometry(0.004, pcbH * 0.86, pcbD);
  const heatsinkFront = new THREE.Mesh(heatsinkGeo, heatsinkMat);
  heatsinkFront.position.set(0.004, 0.005, 0);
  group.add(heatsinkFront);
  const heatsinkBack = new THREE.Mesh(heatsinkGeo, heatsinkMat);
  heatsinkBack.rotation.y = Math.PI;
  heatsinkBack.position.set(-0.004, 0.005, 0);
  group.add(heatsinkBack);

  return group;
}

// ASUS TUF Gaming Z790-Plus WiFi — PCB trace texture, 4x DDR5 DIMM slots,
// LGA1700 socket, finned VRM heatsink, and the TUF camo/wordmark PCH label.
// Sized in local (pre-transform) units; the caller scales + rotates this
// into the vertical case-mounted orientation.
function buildTufMotherboard() {
  const group = new THREE.Group();

  const pcbTex = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#15181c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(140,150,160,0.25)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(200,210,220,0.15)";
      ctx.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 6 + Math.random() * 14);
    }
  });
  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.006, 0.24),
    new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.75 })
  );
  group.add(pcb);

  const socketTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#c9cdd4";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#6b7178";
    for (let x = 8; x < w - 8; x += 6) for (let y = 8; y < h - 8; y += 6) ctx.fillRect(x, y, 2, 2);
  });
  const socket = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.004, 0.045),
    new THREE.MeshStandardMaterial({ map: socketTex, metalness: 0.5, roughness: 0.5 })
  );
  socket.position.set(-0.06, 0.005, -0.02);
  group.add(socket);
  const socketBracket = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.034, 4, 1),
    new THREE.MeshStandardMaterial({ color: 0x1a1c1f, side: THREE.DoubleSide })
  );
  socketBracket.rotation.x = -Math.PI / 2;
  socketBracket.position.set(-0.06, 0.0065, -0.02);
  group.add(socketBracket);

  // Intel Core i7-13700K IHS, seated in the socket, with a stock boxed
  // cooler (finned base + shrouded fan + push-pin legs) on top.
  const cpuTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#888e96";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#33363b";
    ctx.font = "bold 15px Arial";
    ctx.fillText("intel", w / 2, h * 0.42);
    ctx.font = "9px Arial";
    ctx.fillText("CORE i7-13700K", w / 2, h * 0.56);
    ctx.font = "7px Arial";
    ctx.fillStyle = "#54585e";
    ctx.fillText("MALAY 2023", w / 2, h * 0.68);
  });
  const cpu = new THREE.Mesh(
    new THREE.BoxGeometry(0.038, 0.003, 0.038),
    new THREE.MeshStandardMaterial({ map: cpuTex, metalness: 0.5, roughness: 0.35 })
  );
  cpu.position.set(-0.06, 0.0075, -0.02);
  group.add(cpu);

  const coolerGroup = new THREE.Group();
  coolerGroup.position.set(-0.06, 0.009, -0.02);
  group.add(coolerGroup);

  const finTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#c7ccd2";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(110,116,124,0.55)";
    ctx.lineWidth = 2;
    const cx = w / 2, cy = h / 2;
    for (let a = 0; a < 28; a++) {
      const ang = (a / 28) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * w * 0.5, cy + Math.sin(ang) * h * 0.5);
      ctx.stroke();
    }
  });
  const finStack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.022, 28),
    new THREE.MeshStandardMaterial({ map: finTex, metalness: 0.6, roughness: 0.4 })
  );
  finStack.position.y = 0.014;
  coolerGroup.add(finStack);

  const copperRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.014, 0.0022, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.85, roughness: 0.25 })
  );
  copperRing.rotation.x = Math.PI / 2;
  copperRing.position.y = 0.001;
  coolerGroup.add(copperRing);

  const fanShroud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.045, 0.008, 28),
    new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.6 })
  );
  fanShroud.position.y = 0.029;
  coolerGroup.add(fanShroud);

  const fanTex2 = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#111214";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a2d31";
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(w * 0.25, 0, w * 0.22, w * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#0d84e8";
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.32, w * 0.16, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f6fb";
    ctx.textAlign = "center";
    ctx.font = "bold 8px Arial";
    ctx.fillText("intel", cx, cy + h * 0.345);
  });
  const fanBlade = new THREE.Mesh(
    new THREE.CircleGeometry(0.039, 24),
    new THREE.MeshStandardMaterial({ map: fanTex2, roughness: 0.6 })
  );
  fanBlade.rotation.x = -Math.PI / 2;
  fanBlade.position.y = 0.0335;
  coolerGroup.add(fanBlade);

  // Cooler mounting: 3 of 4 corner push-pins fully seated; the 4th (rear
  // corner, [-1,-1]) is left loose beside its hole — tipped over on its
  // side, not pushed home — the "missing screw" fault. Clicking it seats it.
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.7 });
  const loosePinMat = new THREE.MeshStandardMaterial({ color: COLORS.pinLoose, metalness: 0.4, roughness: 0.5 });
  [[1, 1], [1, -1], [-1, 1]].forEach(([sx, sz]) => {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.016, 8), pinMat);
    pin.position.set(sx * 0.026, 0.001, sz * 0.026);
    coolerGroup.add(pin);
    const pinHead = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, 8), pinMat);
    pinHead.position.set(sx * 0.026, 0.01, sz * 0.026);
    coolerGroup.add(pinHead);
  });
  const loosePinSeatedPos = new THREE.Vector3(-0.026, 0.001, -0.026);
  const loosePinLoosePos = new THREE.Vector3(-0.026 - 0.014, -0.006, -0.026 - 0.006);
  const loosePinGroup = new THREE.Group();
  loosePinGroup.position.copy(loosePinLoosePos);
  loosePinGroup.rotation.z = Math.PI * 0.42;
  const loosePin = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.016, 8), loosePinMat);
  loosePinGroup.add(loosePin);
  const loosePinHead = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, 8), loosePinMat);
  loosePinHead.position.y = 0.009;
  loosePinGroup.add(loosePinHead);
  loosePinGroup.userData = { interactable: true, kind: "loose-pin", id: "coolerScrew" };
  coolerGroup.add(loosePinGroup);
  group.userData.loosePinGroup = loosePinGroup;
  group.userData.loosePinSeatedPos = loosePinSeatedPos;
  group.userData.loosePinLoosePos = loosePinLoosePos;

  // Cable exit point where the cooler's fan cable leaves the shroud, and the
  // board's CPU_FAN header it should plug into — both in board-local (pre
  // scale/rotate) space, exposed so the caller can route/animate the cable.
  group.userData.coolerCableExitLocal = new THREE.Vector3(-0.06 + 0.03, 0.031, -0.02);
  const cpuFanHeaderLocal = new THREE.Vector3(-0.06 + 0.05, 0.012, -0.04);
  group.userData.cpuFanHeaderLocal = cpuFanHeaderLocal;
  const headerMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6 });
  const headerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.005, 0.01), headerMat);
  headerBlock.position.copy(cpuFanHeaderLocal);
  group.add(headerBlock);
  const headerLabelTex = canvasTex(64, 32, (ctx, w, h) => {
    ctx.fillStyle = "#15181c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#7d838b";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CPU_FAN", w / 2, h * 0.6);
  });
  const headerLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.018, 0.009),
    new THREE.MeshStandardMaterial({ map: headerLabelTex, roughness: 0.7 })
  );
  headerLabel.rotation.x = -Math.PI / 2;
  headerLabel.position.set(cpuFanHeaderLocal.x, cpuFanHeaderLocal.y + 0.003, cpuFanHeaderLocal.z + 0.012);
  group.add(headerLabel);

  const vrmGroup = new THREE.Group();
  vrmGroup.position.set(-0.06, 0.012, -0.09);
  group.add(vrmGroup);
  const vrmBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.016, 0.025),
    new THREE.MeshStandardMaterial({ color: 0x5a5f66, metalness: 0.7, roughness: 0.4 })
  );
  vrmGroup.add(vrmBase);
  for (let i = 0; i < 8; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.02, 0.024),
      new THREE.MeshStandardMaterial({ color: 0x45494f, metalness: 0.75, roughness: 0.35 })
    );
    fin.position.set(-0.04 + i * 0.011, 0.014, 0);
    vrmGroup.add(fin);
  }

  const tufTex = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = "#3d4147";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#babf26";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.3, 0);
    ctx.lineTo(w * 0.45, 0);
    ctx.lineTo(w * 0.15, h);
    ctx.closePath();
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#e5e7ea";
    ctx.font = "bold 34px Arial";
    ctx.fillText("TUF GAMING", w / 2, h * 0.55);
    ctx.fillStyle = "#9a9fa6";
    ctx.font = "20px Arial";
    ctx.fillText("Z790-PLUS WIFI", w / 2, h * 0.78);
  });
  const pch = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.01, 0.05),
    new THREE.MeshStandardMaterial({ map: tufTex, metalness: 0.4, roughness: 0.5 })
  );
  pch.position.set(0.03, 0.008, 0.06);
  group.add(pch);

  const slotMat = new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.6 });
  const clipMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd4, metalness: 0.6, roughness: 0.4 });
  const dimmSlots = [];
  for (let i = 0; i < 4; i++) {
    const z = -0.06 + i * 0.018;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.008), slotMat);
    slot.position.set(0.02, 0.007, z);
    group.add(slot);
    const clipL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.01), clipMat);
    clipL.position.set(-0.03, 0.01, z);
    group.add(clipL);
    const clipR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.01), clipMat);
    clipR.position.set(0.07, 0.01, z);
    group.add(clipR);
    dimmSlots.push(new THREE.Vector3(0.02, 0.011, z));
  }
  group.userData.dimmSlots = dimmSlots;
  group.userData.coolerFanBlade = fanBlade;

  return group;
}

function buildGenericPSU() {
  const group = new THREE.Group();

  const bodyTex = canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1c1e21";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.086, 0.13),
    new THREE.MeshStandardMaterial({ map: bodyTex, metalness: 0.55, roughness: 0.5 })
  );
  group.add(body);

  // Top-mounted honeycomb fan grille, visible from inside the case
  const grilleTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#101113";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2c2f34";
    ctx.lineWidth = 2;
    const r = 6;
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 12; col++) {
        const x = r + col * r * 1.7 + (row % 2 ? r * 0.85 : 0);
        const y = r + row * r * 1.5;
        if (x > w - r || y > h - r) continue;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  });
  const grille = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 24),
    new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.8 })
  );
  grille.rotation.x = -Math.PI / 2;
  grille.position.y = 0.0435;
  group.add(grille);
  const fanHub = new THREE.Mesh(
    new THREE.CircleGeometry(0.014, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6 })
  );
  fanHub.rotation.x = -Math.PI / 2;
  fanHub.position.y = 0.0436;
  group.add(fanHub);

  // Spec label sticker facing the open side panel
  const labelTex = canvasTex(256, 192, (ctx, w, h) => {
    ctx.fillStyle = "#f4f2ea";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#111318";
    ctx.font = "bold 22px Arial";
    ctx.fillText("COOLPOWER 650W", w * 0.06, h * 0.16);
    ctx.fillStyle = "#33404f";
    ctx.font = "10px Arial";
    ctx.fillText("ATX12V v2.4 / EPS12V — 80 PLUS BRONZE", w * 0.06, h * 0.26);
    ctx.font = "9px Arial";
    const rows = [
      ["+3.3V", "24A", "+5V", "20A"],
      ["+12V", "54A", "-12V", "0.3A"],
      ["+5Vsb", "3A", "MAX", "650W"],
    ];
    rows.forEach((row, i) => {
      const y = h * 0.38 + i * h * 0.09;
      ctx.fillText(row[0], w * 0.06, y);
      ctx.fillText(row[1], w * 0.22, y);
      ctx.fillText(row[2], w * 0.4, y);
      ctx.fillText(row[3], w * 0.56, y);
    });
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.moveTo(w * 0.82, h * 0.62);
    ctx.lineTo(w * 0.94, h * 0.62);
    ctx.lineTo(w * 0.88, h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111318";
    ctx.font = "bold 10px Arial";
    ctx.fillText("!", w * 0.876, h * 0.605);
    ctx.fillStyle = "#55617a";
    ctx.font = "8px Arial";
    ctx.fillText("Risk of electric shock — no user-serviceable parts inside", w * 0.06, h * 0.92);
  });
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.07),
    new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.7 })
  );
  label.rotation.y = Math.PI / 2;
  label.position.set(0.0751, -0.005, 0);
  group.add(label);

  // Rear face: IEC inlet, rocker switch, modular cable ports
  const rearTex = canvasTex(160, 128, (ctx, w, h) => {
    ctx.fillStyle = "#1c1e21";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0a0b0c";
    ctx.fillRect(w * 0.06, h * 0.3, w * 0.18, h * 0.4);
    ctx.fillStyle = "#2a2d31";
    ctx.fillRect(w * 0.3, h * 0.32, w * 0.1, h * 0.36);
    ctx.fillStyle = "#c9cdd4";
    ctx.font = "bold 12px Arial";
    ctx.fillText("O", w * 0.32, h * 0.5);
    ctx.fillText("I", w * 0.36, h * 0.5);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "#111214";
      ctx.fillRect(w * 0.48 + i * w * 0.08, h * 0.34, w * 0.06, h * 0.32);
    }
  });
  const rear = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.08),
    new THREE.MeshStandardMaterial({ map: rearTex, roughness: 0.6 })
  );
  rear.rotation.y = Math.PI;
  rear.position.set(0, -0.001, -0.0651);
  group.add(rear);

  return group;
}

// ARCTIC P12 Max, the top pick from a 2026 case-fan roundup: black frame,
// gray rubberized anti-vibration corner pads, and a 5-blade "Fan Wheel"
// with a ring joining the blade tips for static pressure. Shared by the
// front intake and rear exhaust fans.
function buildArcticP12MaxFan(diameter = 0.12) {
  const group = new THREE.Group();
  const r = diameter / 2;
  const frameSide = diameter * 1.04;

  const frameTex = canvasTex(160, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111214";
    const rr = w * 0.07;
    ctx.beginPath();
    ctx.moveTo(rr, 0); ctx.lineTo(w - rr, 0); ctx.quadraticCurveTo(w, 0, w, rr);
    ctx.lineTo(w, h - rr); ctx.quadraticCurveTo(w, h, w - rr, h);
    ctx.lineTo(rr, h); ctx.quadraticCurveTo(0, h, 0, h - rr);
    ctx.lineTo(0, rr); ctx.quadraticCurveTo(0, 0, rr, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2c2f34";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#8a9098";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Arial";
    ctx.fillText("ARCTIC", w / 2, h * 0.94);
  });
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(frameSide, frameSide),
    new THREE.MeshStandardMaterial({ map: frameTex, roughness: 0.75, side: THREE.DoubleSide })
  );
  group.add(frame);

  // Gray rubberized anti-vibration corner pads with a mounting screw hole,
  // ARCTIC's signature corner detail on the P12 Max.
  const padMat = new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.85, side: THREE.DoubleSide });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.6, side: THREE.DoubleSide });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(diameter * 0.055, 12), padMat);
    pad.position.set(sx * diameter * 0.44, sy * diameter * 0.44, 0.002);
    group.add(pad);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(diameter * 0.02, 10), holeMat);
    hole.position.set(sx * diameter * 0.44, sy * diameter * 0.44, 0.003);
    group.add(hole);
  });

  const bladeTex = canvasTex(160, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = "#babfc4";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(w * 0.27, 0, w * 0.24, w * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#1c1e21";
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9aa0a8";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ARCTIC", cx, cy + w * 0.03);
  });
  const blade = new THREE.Mesh(
    new THREE.CircleGeometry(r * 0.82, 24),
    new THREE.MeshStandardMaterial({ map: bladeTex, roughness: 0.6, side: THREE.DoubleSide })
  );
  blade.position.z = 0.0035;
  group.add(blade);

  // Thin ring joining the blade tips — the "Fan Wheel" that gives the P12
  // Max its static-pressure boost over a plain open blade design.
  const wheel = new THREE.Mesh(
    new THREE.RingGeometry(r * 0.79, r * 0.83, 32),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.55, side: THREE.DoubleSide })
  );
  wheel.position.z = 0.0036;
  group.add(wheel);

  group.userData.blade = blade;
  group.userData.wheel = wheel;
  return group;
}

// Small RGB fan-hub daughterboard: flat case-mounted box with a row of
// 4-pin fan ports (one lit, showing it's carrying the miswired CPU cooler
// cable) and a rainbow ARGB wordmark badge.
function buildRgbFanHub() {
  const group = new THREE.Group();
  const bodyTex = canvasTex(160, 96, (ctx, w, h) => {
    ctx.fillStyle = "#0e0f11";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2c2f34";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#ff5b5b");
    grad.addColorStop(0.25, "#ffd23f");
    grad.addColorStop(0.5, "#3ee06b");
    grad.addColorStop(0.75, "#3fb8ff");
    grad.addColorStop(1, "#c264ff");
    ctx.fillStyle = grad;
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("A-RGB FAN HUB", w / 2, h * 0.32);
    ctx.fillStyle = "#7d838b";
    ctx.font = "9px Arial";
    ctx.fillText("5x FAN  ·  1x SATA IN  ·  3-PIN ARGB", w / 2, h * 0.46);
    for (let i = 0; i < 5; i++) {
      const x = w * 0.14 + i * w * 0.18;
      ctx.fillStyle = i === 0 ? "#3fae5c" : "#111214";
      ctx.fillRect(x, h * 0.6, w * 0.09, h * 0.28);
      ctx.strokeStyle = "#45494f";
      ctx.strokeRect(x, h * 0.6, w * 0.09, h * 0.28);
    }
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.006, 0.036),
    new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.6, metalness: 0.2 })
  );
  group.add(body);
  const port = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.006, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6 })
  );
  port.position.set(-0.021, 0.005, 0.004);
  group.add(port);
  group.userData.port = port;
  return group;
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

  // -------- Wall outlet + plug (unplug task) --------
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

  // -------- Workbench along the back wall, holding the tower case --------
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

  // Anti-static mat + screw tray on the bench
  const matGroup = new THREE.Group();
  matGroup.position.set(0.55, 0.926, 0.15);
  benchGroup.add(matGroup);
  // Purely a landing pad now — the case itself is what you interact with
  // to move it here (see the "case" kind below), not the mat.
  const matPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.004, 0.5),
    new THREE.MeshStandardMaterial({ map: makeEsdMatTexture(), roughness: 0.8 })
  );
  matGroup.add(matPad);

  // Shifted right (toward the mat's +X edge) so it's clear of where the
  // case lands once rotated to face its screws toward the front.
  const trayGroup = new THREE.Group();
  trayGroup.position.set(0.15, 0.008, 0.05);
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

  // Ticket clipboard — a real printed work order, so the symptom is legible
  // on the physical prop and matches the diagnose modal.
  const ticketTex = canvasTex(280, 360, (ctx, w, h) => {
    ctx.fillStyle = "#f4f2ea";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c9c4b4";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = "#111318";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "left";
    ctx.fillText("WORK ORDER  #2026-0095", 16, 28);
    ctx.strokeStyle = "#8a8578";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(16, 38); ctx.lineTo(w - 16, 38); ctx.stroke();

    ctx.font = "bold 10px Arial";
    ctx.fillText("DEVICE", 16, 56);
    ctx.font = "10px Arial";
    ctx.fillText("Customer-built Tower (ASUS TUF Z790)", 16, 70);
    ctx.fillText("Case fans + RGB fan hub installed", 16, 82);
    ctx.fillText("by customer", 16, 94);

    ctx.font = "bold 10px Arial";
    ctx.fillText("REPORTED SYMPTOM", 16, 114);
    ctx.font = "10px Arial";
    const lines = [
      "Boots fine, throttles or crashes",
      "under any real load, case runs hot,",
      "since new case fans and an RGB",
      "fan hub were installed.",
    ];
    lines.forEach((line, i) => ctx.fillText(line, 16, 130 + i * 15));

    ctx.font = "bold 10px Arial";
    ctx.fillText("CHECK EVERY CAUSE YOU FIND:", 16, 210);
    const checks = [
      "CPU fan header", "CPU cooler mounting", "Intake fan direction",
      "RAM seated", "PSU health",
    ];
    checks.forEach((c, i) => {
      const y = 230 + i * 20;
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
  // Kept clear of both the case's original spot and its mat destination so
  // the two never sit close enough to compete for hover/click priority.
  clipboard.position.set(-0.85, 0.931, -0.32);
  clipboard.userData = { interactable: true, kind: "clipboard", id: "diagnose" };
  benchGroup.add(clipboard);

  // -------- Tower case on the bench --------
  const CW = 0.34, CH = 0.38, CD = 0.16;
  const chassisGroup = new THREE.Group();
  chassisGroup.position.set(-0.45, 0.926 + CH / 2, -0.1);
  benchGroup.add(chassisGroup);
  chassisGroup.userData = { interactable: true, kind: "case", id: "case" };
  const chassisMat = new THREE.MeshStandardMaterial({
    map: makeBrushedMetalTexture("#1b1c1f"), metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide,
  });
  // Fractal Design Meshify 2's signature: an angular, faceted front panel
  // (diagonal creases break the surface into banded facets) with a fine
  // perforated mesh for airflow, and a small wordmark badge near the base.
  const meshPanelTex = canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1c1e21";
    ctx.fillRect(0, 0, w, h);
    const rows = 10;
    for (let r = 0; r < rows; r++) {
      const y0 = (r / rows) * h;
      const y1 = ((r + 1) / rows) * h;
      ctx.fillStyle = r % 2 === 0 ? "#232629" : "#1a1c1f";
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(w, y0 - h * 0.02);
      ctx.lineTo(w, y1 - h * 0.02);
      ctx.lineTo(0, y1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#0e0f11";
    for (let y = 4; y < h; y += 7) {
      for (let x = 4; x < w; x += 7) {
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#8a9098";
    ctx.textAlign = "center";
    ctx.font = "bold 10px Arial";
    ctx.fillText("FRACTAL DESIGN", w / 2, h * 0.97);
  });
  const frontMat = new THREE.MeshStandardMaterial({ map: meshPanelTex, roughness: 0.8, side: THREE.DoubleSide });
  function face(w, h, pos, rotEuler, mat) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat || chassisMat);
    m.position.set(...pos);
    if (rotEuler) m.rotation.set(...rotEuler);
    chassisGroup.add(m);
    return m;
  }
  face(CW, CD, [0, CH / 2, 0], [Math.PI / 2, 0, 0]);
  face(CW, CD, [0, -CH / 2, 0], [Math.PI / 2, 0, 0]);
  face(CW, CH, [0, 0, CD / 2], null, frontMat);
  face(CW, CH, [0, 0, -CD / 2], [0, Math.PI, 0]);
  face(CD, CH, [-CW / 2, 0, 0], [0, Math.PI / 2, 0]);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, CH, CD)),
    new THREE.LineBasicMaterial({ color: COLORS.chassisEdge })
  );
  edges.position.copy(chassisGroup.position);
  benchGroup.add(edges);

  // Front intake + rear exhaust fans, both ARCTIC P12 Max (120mm), visible
  // through the mesh front panel and mounted high on the back wall.
  const frontFan = buildArcticP12MaxFan(0.12);
  frontFan.position.set(chassisGroup.position.x, chassisGroup.position.y + 0.02, chassisGroup.position.z + CD / 2 - 0.016);
  benchGroup.add(frontFan);

  const rearFan = buildArcticP12MaxFan(0.12);
  rearFan.rotation.y = Math.PI;
  rearFan.position.set(chassisGroup.position.x - 0.08, chassisGroup.position.y + CH / 2 - 0.09, chassisGroup.position.z - CD / 2 + 0.016);
  benchGroup.add(rearFan);

  // Front intake fan installed backwards — the third fault. The frame/blade
  // are physically symmetric, so a printed airflow-direction sticker (a
  // separate, non-rotating prop mounted just outside the mesh panel) is the
  // legible "tell"; clicking the fan itself does the 180° flip-in-place.
  // Object.assign, not a userData replace — buildArcticP12MaxFan already
  // stashed .blade/.wheel refs there for the per-frame spin in animate().
  Object.assign(frontFan.userData, { interactable: true, kind: "case-fan", id: "fanBackwards" });
  const airflowWrongTex = canvasTex(160, 96, (ctx, w, h) => {
    ctx.fillStyle = "#3a1414";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#7a2222";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.28); ctx.lineTo(w * 0.68, h * 0.28); ctx.lineTo(w * 0.68, h * 0.14);
    ctx.lineTo(w * 0.92, h * 0.42); ctx.lineTo(w * 0.68, h * 0.7); ctx.lineTo(w * 0.68, h * 0.56);
    ctx.lineTo(w * 0.3, h * 0.56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd7d7";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText("AIRFLOW: OUT", w / 2, h * 0.88);
  });
  const airflowRightTex = canvasTex(160, 96, (ctx, w, h) => {
    ctx.fillStyle = "#123420";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1f6b3a";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = "#57e08a";
    ctx.beginPath();
    ctx.moveTo(w * 0.7, h * 0.28); ctx.lineTo(w * 0.32, h * 0.28); ctx.lineTo(w * 0.32, h * 0.14);
    ctx.lineTo(w * 0.08, h * 0.42); ctx.lineTo(w * 0.32, h * 0.7); ctx.lineTo(w * 0.32, h * 0.56);
    ctx.lineTo(w * 0.7, h * 0.56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d8ffe8";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText("AIRFLOW: IN", w / 2, h * 0.88);
  });
  const airflowSticker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.03),
    new THREE.MeshStandardMaterial({ map: airflowWrongTex, roughness: 0.7 })
  );
  airflowSticker.position.set(frontFan.position.x, frontFan.position.y - 0.075, chassisGroup.position.z + CD / 2 + 0.001);
  benchGroup.add(airflowSticker);

  // Top-front I/O panel — USB-A, USB-C, and audio jacks
  const ioTex = canvasTex(256, 96, (ctx, w, h) => {
    ctx.fillStyle = "#26292d";
    ctx.fillRect(0, 0, w, h);
    // USB-A (rectangular)
    ctx.fillStyle = "#c9cdd4";
    ctx.fillRect(w * 0.08, h * 0.32, w * 0.16, h * 0.22);
    // USB-C (rounded capsule, reversible connector)
    const ccx = w * 0.3 + w * 0.08, ccy = h * 0.43, crr = h * 0.11;
    ctx.beginPath();
    ctx.moveTo(ccx - w * 0.04, ccy - crr);
    ctx.lineTo(ccx + w * 0.04, ccy - crr);
    ctx.arc(ccx + w * 0.04, ccy, crr, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(ccx - w * 0.04, ccy + crr);
    ctx.arc(ccx - w * 0.04, ccy, crr, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9aa0a8";
    ctx.beginPath();
    ctx.ellipse(w * 0.58, h * 0.43, w * 0.05, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3fae5c";
    ctx.beginPath();
    ctx.arc(w * 0.76, h * 0.43, h * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d23c3c";
    ctx.beginPath();
    ctx.arc(w * 0.9, h * 0.43, h * 0.11, 0, Math.PI * 2);
    ctx.fill();
  });
  const ioPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.014, 0.03),
    new THREE.MeshStandardMaterial({ map: ioTex, roughness: 0.5 })
  );
  ioPanel.position.set(chassisGroup.position.x - 0.08, chassisGroup.position.y + CH / 2 - 0.001, chassisGroup.position.z + CD / 2 - 0.03);
  benchGroup.add(ioPanel);

  // PSU shroud across the bottom front, a shade darker than the main shell
  const shroud = new THREE.Mesh(
    new THREE.BoxGeometry(CW + 0.002, CH * 0.16, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x2c2f33, metalness: 0.5, roughness: 0.6 })
  );
  shroud.position.set(chassisGroup.position.x, chassisGroup.position.y - CH / 2 + CH * 0.08, chassisGroup.position.z + CD / 2 + 0.001);
  benchGroup.add(shroud);

  // Rear I/O shield on the back face
  const rearIoTex = canvasTex(128, 96, (ctx, w, h) => {
    ctx.fillStyle = "#1a1c1f";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#7d838b";
    for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.1 + i * w * 0.11, h * 0.15, w * 0.08, h * 0.3);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(w * 0.62, h * 0.2, w * 0.22, h * 0.2);
    ctx.fillStyle = "#3b5a8a";
    ctx.fillRect(w * 0.62, h * 0.55, w * 0.3, h * 0.16);
  });
  const rearIo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.06),
    new THREE.MeshStandardMaterial({ map: rearIoTex, roughness: 0.5 })
  );
  rearIo.rotation.y = Math.PI;
  rearIo.position.set(chassisGroup.position.x + 0.05, chassisGroup.position.y + CH / 2 - 0.06, chassisGroup.position.z - CD / 2 + 0.001);
  benchGroup.add(rearIo);

  // Power button, front face
  const powerBtnGroup = new THREE.Group();
  powerBtnGroup.position.set(chassisGroup.position.x + 0.1, chassisGroup.position.y + CH / 2 - 0.05, chassisGroup.position.z + CD / 2);
  benchGroup.add(powerBtnGroup);
  const powerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.powerBtn, metalness: 0.6, roughness: 0.35 })
  );
  powerBtn.rotation.x = Math.PI / 2;
  powerBtn.position.z = 0.005;
  powerBtnGroup.add(powerBtn);
  powerBtnGroup.userData = { interactable: true, kind: "power-button", id: "powerButton" };

  const panelGroup = new THREE.Group();
  panelGroup.position.set(chassisGroup.position.x + CW / 2 + 0.005, chassisGroup.position.y, chassisGroup.position.z);
  benchGroup.add(panelGroup);
  const brushedMetalTex = canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#202225";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.025 + Math.random() * 0.04})`;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }
  });
  const panelMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, CH * 0.98, CD * 0.98),
    new THREE.MeshStandardMaterial({ map: brushedMetalTex, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })
  );
  panelGroup.add(panelMesh);

  const screwHeadTex = canvasTex(32, 32, (ctx, w, h) => {
    ctx.fillStyle = "#c9cdd4";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#6b7178";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.15);
    ctx.lineTo(w * 0.5, h * 0.85);
    ctx.moveTo(w * 0.15, h * 0.5);
    ctx.lineTo(w * 0.85, h * 0.5);
    ctx.stroke();
  });
  const screwLocal = [[0.15, 0.06], [0.15, -0.06], [-0.15, 0.06], [-0.15, -0.06]];
  const screwMeshes = {};
  screwLocal.forEach(([y, z], i) => {
    const id = "screw" + (i + 1);
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.screw, metalness: 0.85, roughness: 0.22 })
    );
    const head = new THREE.Mesh(
      new THREE.CircleGeometry(0.009, 16),
      new THREE.MeshStandardMaterial({ map: screwHeadTex, metalness: 0.8, roughness: 0.3 })
    );
    head.rotation.x = Math.PI / 2;
    head.position.y = -0.0061;
    screw.add(head);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(0.006, y, z);
    screw.userData = { interactable: true, kind: "screw", id, requiresTool: "screwdriver" };
    panelGroup.add(screw);
    screwMeshes[id] = screw;
  });

  // -------- Internals, revealed once the panel opens --------
  const internals = new THREE.Group();
  internals.visible = false;
  benchGroup.add(internals);

  // ASUS TUF Gaming Z790-Plus WiFi, mounted vertically against the case's
  // open side. buildTufMotherboard() is authored flat (facing +Y); rotating
  // -90deg around Z stands it up with its component face toward +X.
  const BOARD_SCALE = 0.5;
  const BOARD_ROT_Z = -Math.PI / 2;
  const boardGroup = buildTufMotherboard();
  boardGroup.scale.setScalar(BOARD_SCALE);
  boardGroup.rotation.z = BOARD_ROT_Z;
  boardGroup.position.set(chassisGroup.position.x + 0.05, chassisGroup.position.y, chassisGroup.position.z);
  internals.add(boardGroup);

  // Map a point in the board's own local (pre-transform) space into the
  // internals'/benchGroup's local space, so RAM/slot hotspots line up
  // exactly with the slots drawn on the board.
  function boardLocalToInternals(v) {
    const s = BOARD_SCALE;
    const cos = Math.cos(BOARD_ROT_Z), sin = Math.sin(BOARD_ROT_Z);
    const sx = v.x * s, sy = v.y * s, sz = v.z * s;
    return new THREE.Vector3(
      boardGroup.position.x + (sx * cos - sy * sin),
      boardGroup.position.y + (sx * sin + sy * cos),
      boardGroup.position.z + sz
    );
  }

  // RAM is correctly seated in this scenario (a diagnose-modal distractor,
  // not one of the 3 real faults) — decorative only, not interactable.
  const dimmSlotsLocal = boardGroup.userData.dimmSlots;
  const slotAPos = boardLocalToInternals(dimmSlotsLocal[0]);
  const ramStick = buildKingstonFuryRam();
  ramStick.position.copy(slotAPos);
  internals.add(ramStick);

  const connTex = canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#1c1e21";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0a0b0c";
    for (let x = 6; x < w - 6; x += 8) for (let y = 6; y < h - 6; y += 8) ctx.fillRect(x, y, 3, 3);
  });
  // 8-pin CPU power — already fully seated in this scenario (also a
  // distractor, not a fault) — just realistic set dressing for its cable.
  const cpuConn = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.026, 0.018),
    new THREE.MeshStandardMaterial({ map: connTex, color: COLORS.connectorOn, roughness: 0.5 })
  );
  cpuConn.position.set(chassisGroup.position.x + 0.06, chassisGroup.position.y + CH / 2 - 0.02, chassisGroup.position.z - 0.05);
  internals.add(cpuConn);

  // -------- RGB fan hub + CPU cooler fan cable (miswired — fault #1) --------
  const fanHub = buildRgbFanHub();
  const fanHubPos = new THREE.Vector3(
    chassisGroup.position.x + 0.1,
    chassisGroup.position.y + CH / 2 - 0.03,
    chassisGroup.position.z - 0.035
  );
  fanHub.position.copy(fanHubPos);
  // Box is authored thin in Y (a flat daughterboard) — rotate so its
  // labeled face points local +X, matching the board's own component
  // face and the direction the panel opens toward (where the player ends
  // up standing once the case is turned to face them on the mat).
  fanHub.rotation.z = -Math.PI / 2;
  Object.assign(fanHub.userData, { interactable: true, kind: "fan-hub", id: "cpuFanHub" });
  internals.add(fanHub);

  const cpuFanHeaderPos = boardLocalToInternals(boardGroup.userData.cpuFanHeaderLocal);
  const coolerCableExitPos = boardLocalToInternals(boardGroup.userData.coolerCableExitLocal);
  const fanHubPlugPos = fanHubPos.clone().add(new THREE.Vector3(-0.02, 0.004, 0.012));

  const coolerCableMat2 = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.8 });
  function buildCoolerCableMesh(endPoint) {
    const mid = coolerCableExitPos.clone().lerp(endPoint, 0.55);
    mid.y -= 0.012;
    const curve = new THREE.CatmullRomCurve3([coolerCableExitPos, mid, endPoint]);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0018, 6, false), coolerCableMat2);
  }
  let coolerCableEnd = fanHubPlugPos.clone();
  let coolerCableMesh = buildCoolerCableMesh(coolerCableEnd);
  internals.add(coolerCableMesh);

  // Generic modular ATX PSU, mounted low and clear of the board's own
  // footprint (further -X), with sleeved cables run to the 24-pin edge
  // and the 8-pin CPU connector.
  const psu = buildGenericPSU();
  const psuPos = new THREE.Vector3(
    chassisGroup.position.x - 0.07,
    chassisGroup.position.y - CH / 2 + 0.086 / 2 + 0.006,
    chassisGroup.position.z
  );
  psu.position.copy(psuPos);
  internals.add(psu);

  const mobo24Pos = boardLocalToInternals(new THREE.Vector3(0.13, 0.012, 0.11));

  // Sleeved-cable texture (a tight woven diagonal weave) instead of a flat
  // color, wrapped around each routed cable's length.
  const cableSleeveTex = canvasTex(16, 128, (ctx, w, h) => {
    ctx.fillStyle = "#1c1e21";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(70,75,82,0.85)";
    ctx.lineWidth = 1.4;
    for (let y = -w; y < h; y += 5) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + w); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w, y); ctx.lineTo(0, y + w); ctx.stroke();
    }
  });
  cableSleeveTex.wrapS = THREE.RepeatWrapping;
  cableSleeveTex.wrapT = THREE.RepeatWrapping;
  cableSleeveTex.repeat.set(1, 12);
  cableSleeveTex.needsUpdate = true;
  const cableMat = new THREE.MeshStandardMaterial({ map: cableSleeveTex, roughness: 0.75 });

  const plugMat = new THREE.MeshStandardMaterial({ map: connTex, color: 0x2b2f34, roughness: 0.5 });
  function addCable(points, plugSize = 0.009) {
    const curve = new THREE.CatmullRomCurve3(points);
    internals.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.0035, 6, false), cableMat));
    const end = points[points.length - 1];
    const plug = new THREE.Mesh(new THREE.BoxGeometry(plugSize, plugSize * 1.4, plugSize), plugMat);
    plug.position.copy(end);
    internals.add(plug);
  }
  const psuTop = new THREE.Vector3(psuPos.x, psuPos.y + 0.043, psuPos.z);
  addCable([psuTop, new THREE.Vector3(psuPos.x + 0.04, psuPos.y + 0.05, psuPos.z + 0.02), mobo24Pos], 0.012);
  addCable([
    psuTop,
    new THREE.Vector3(psuPos.x - 0.02, cpuConn.position.y - 0.05, chassisGroup.position.z - CD / 2 + 0.01),
    new THREE.Vector3(cpuConn.position.x - 0.01, cpuConn.position.y - 0.01, cpuConn.position.z),
  ], 0.009);

  // Fan header cables — front and rear case fans routed back to headers
  // along the board's edges.
  const fanHeader1 = boardLocalToInternals(new THREE.Vector3(0.1, 0.012, -0.1));
  const fanHeader2 = boardLocalToInternals(new THREE.Vector3(-0.12, 0.012, 0.1));
  addCable([
    frontFan.position.clone(),
    new THREE.Vector3(frontFan.position.x - 0.03, frontFan.position.y + 0.02, frontFan.position.z - 0.05),
    fanHeader1,
  ], 0.005);
  addCable([
    rearFan.position.clone(),
    new THREE.Vector3(rearFan.position.x + 0.03, rearFan.position.y - 0.02, rearFan.position.z + 0.05),
    fanHeader2,
  ], 0.005);

  // A couple of cable clips along the case's permanent left wall, anchoring
  // the PSU cable run for a "managed" look rather than loose floating tubes.
  const clipMat2 = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.7 });
  [0.05, -0.02].forEach((dy) => {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.014), clipMat2);
    clip.position.set(chassisGroup.position.x - CW / 2 + 0.004, psuPos.y + 0.06 + dy, psuPos.z);
    internals.add(clip);
  });

  const led = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), new THREE.MeshBasicMaterial({ color: COLORS.ledOff }));
  led.position.set(chassisGroup.position.x - 0.12, chassisGroup.position.y + CH / 2 - 0.05, chassisGroup.position.z + CD / 2 + 0.001);
  benchGroup.add(led);

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
  ledGlow.position.z += 0.002;
  benchGroup.add(ledGlow);

  // Wrap the whole case assembly (shell, panel+screws, internals, power
  // button, LED) in one group so it can be moved as a rigid unit onto the
  // anti-static mat — .attach() reparents each without changing its
  // current world position, so nothing has to be recomputed here.
  // towerGroup carries the SLIDE (translation only); towerPivot sits at
  // the case's own original center and carries the TURN, so rotating it
  // spins the case in place instead of swinging it around benchGroup's
  // origin (which is off in a corner, nowhere near the case).
  const towerGroup = new THREE.Group();
  benchGroup.add(towerGroup);
  const towerPivot = new THREE.Group();
  towerPivot.position.copy(chassisGroup.position);
  towerGroup.add(towerPivot);
  // Also carries the exterior cosmetic pieces (front/rear fans, I/O panel,
  // shroud, rear I/O shield, edge outline, airflow sticker) along with the
  // shell — the original template left these as siblings on benchGroup
  // since nothing on them was interactive there, but this scenario's front
  // intake fan IS a fault the player must click, so it has to actually
  // travel to the mat with the rest of the case instead of being left
  // floating at the case's old bench position.
  [chassisGroup, powerBtnGroup, panelGroup, internals, led, ledGlow, frontFan, rearFan, ioPanel, shroud, rearIo, edges, airflowSticker].forEach((obj) => towerPivot.attach(obj));
  const towerRestPos = towerGroup.position.clone();
  // Target: the case's side panel (local +X) ends up facing the mat's
  // front edge (+Z, toward where the player stands) instead of the case's
  // own side — a -90° turn around the pivot achieves that. The landing
  // spot is shifted toward the mat's left (-X) half so the narrower
  // (post-turn) footprint leaves the tray room on the right, per request.
  const towerMatPos = new THREE.Vector3(0.85, 0, 0.25).add(towerRestPos);
  const towerMatRotY = -Math.PI / 2;

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

  // JAKEMY JM-8192 precision driver: gray/black ergonomic handle with
  // automotive-inspired side ventilation grooves and a printed wordmark.
  const screwdriverGripTex = canvasTex(64, 256, (ctx, w, h) => {
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
  function buildScrewdriverMesh() {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: COLORS.screwdriverShaft, metalness: 0.85, roughness: 0.2 })
    );
    shaft.position.y = 0.055;
    g.add(shaft);

    // Magnetic Phillips bit tip — a cross-slot cut from two thin fins
    // instead of a plain cone, so the head reads as a real driver bit.
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
      new THREE.MeshStandardMaterial({ map: screwdriverGripTex, roughness: 0.6 })
    );
    handle.position.y = 0.1 + 0.04;
    g.add(handle);

    // Color band separating shaft from grip — a common tech-tool cue for
    // driver size/type — plus a pocket clip along one side of the handle.
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0165, 0.0165, 0.008, 16),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 })
    );
    band.position.y = 0.1 + 0.004;
    g.add(band);
    const clip = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.06, 0.006),
      new THREE.MeshStandardMaterial({ color: 0xb8bec7, metalness: 0.7, roughness: 0.3 })
    );
    clip.position.set(0.019, 0.1 + 0.05, 0);
    g.add(clip);

    // Rotating end cap, visually separated by a thin groove ring
    const groove = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0155, 0.0155, 0.003, 16),
      new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.5 })
    );
    groove.position.y = 0.1 + 0.077;
    g.add(groove);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5 })
    );
    cap.position.y = 0.1 + 0.08;
    g.add(cap);
    return g;
  }
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
  let diagnoseSelections = new Set();
  let heldTool = null;
  let carriedPartMesh = null;
  let carriedPartKind = null; // "screw"
  const removedScrews = new Set();
  let modalOpen = false;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("visible"), 1800);
  }

  function renderTaskList() {
    const firstIncompleteIdx = TASKS.findIndex((t) => !taskState[t.id].done);
    const items = TASKS.map((t, i) => {
      const st = taskState[t.id];
      const cls = st.done ? "done" : i === firstIncompleteIdx ? "current" : "";
      return `<li class="${cls}"><div class="tl-box"></div><div>${t.label}</div></li>`;
    }).join("");
    taskListEl.innerHTML = `<div class="tl-title">Tower Cooling &amp; Airflow</div><ul>${items}</ul>`;
  }
  function markDone(id, ok = true) {
    taskState[id].done = true;
    taskState[id].ok = ok;
    renderTaskList();
  }
  renderTaskList();

  function renderWornItems() {
    wornItemsEl.innerHTML = "";
    if (taskState.strap.done) wornItemsEl.appendChild(el("div", "badge", "📌 ESD Strap: Worn"));
    if (heldTool) wornItemsEl.appendChild(el("div", "badge", `🔧 Holding: ${heldTool}`));
  }

  // -------- Raycast / hover --------
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

  let hovered = null;
  function clearHoverHighlight() {
    if (hovered && hovered.material && hovered.material.emissive) hovered.material.emissive.setHex(0x000000);
    hovered = null;
  }
  const REACH = 2.2;
  const HOVER_PX_TOLERANCE = 26;
  const tmpVec = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  function isEffectivelyVisible(obj) {
    let o = obj;
    while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  }

  function findLookedAtInteractable() {
    const useCursor = !fp.isLocked() && mouseInside;
    raycaster.setFromCamera(useCursor ? mouseNDC : center, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    let direct = null;
    for (const hit of hits) {
      if (!isEffectivelyVisible(hit.object)) continue; // THREE.Raycaster ignores .visible on its own
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
    // Small/thin props (tubes, torus straps, slot markers) are easy to miss
    // with a single ray — fall back to the nearest interactable within a
    // generous on-screen radius, same trick used in the orbit-cam scenes.
    // Whichever candidate is actually physically closer to the camera wins,
    // so a farther direct hit (e.g. the case shell, glimpsed at a grazing
    // angle) can't beat a closer small part that only the fallback caught.
    camera.getWorldPosition(camPos);
    const rect = renderer.domElement.getBoundingClientRect();
    const refX = useCursor ? mouseScreen.x : rect.width / 2;
    const refY = useCursor ? mouseScreen.y : rect.height / 2;
    let closest = null;
    let closestDist = HOVER_PX_TOLERANCE;
    let closestCamDist = Infinity;
    for (const obj of interactableRegistry) {
      // interactableRegistry is a one-time snapshot taken at startup — an
      // object whose one-time job is done (like the case, once it's on the
      // mat) gets its flag turned off afterward, so that has to be
      // rechecked live here or it stays a permanent hover candidate forever.
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
    powerBtn.position.z = 0.005 - pct * 0.004;
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

    if (kind === "plug" && !taskState.unplug.done) text = `<kbd>E</kbd> Unplug from wall outlet`;
    else if (kind === "power-button") {
      if (!taskState.discharge.done) {
        text = holding
          ? `Hold… ${Math.min(100, Math.round(((performance.now() - holdStart) / HOLD_DURATION) * 100))}%`
          : `<kbd>Hold Click</kbd> Discharge residual power (3s)`;
      } else if (repairsReady() && !taskState.test.done) {
        text = `<kbd>Click</kbd> Power on and test`;
      }
    } else if (kind === "wearable" && !taskState.strap.done) text = `<kbd>E</kbd> Put on ESD wrist strap`;
    else if (kind === "case" && !taskState.mat.done) {
      text = (taskState.unplug.done && taskState.discharge.done && taskState.strap.done)
        ? `<kbd>E</kbd> Move case onto the anti-static mat`
        : `Complete ESD safety steps first`;
    } else if (kind === "manual") text = `<kbd>E</kbd> Read motherboard manual`;
    else if (kind === "clipboard") {
      text = taskState.screws.done
        ? (taskState.diagnose.done ? `<kbd>E</kbd> Review diagnosis` : `<kbd>E</kbd> Diagnose the fault`)
        : `Open the case first`;
    } else if (kind === "grab-tool" && heldTool !== id) text = `<kbd>E</kbd> Pick up Screwdriver`;
    else if (kind === "screw" && !removedScrews.has(id)) {
      if (!esdReady()) text = `Complete ESD safety steps first`;
      else if (requiresTool && heldTool !== requiresTool) text = `Need the screwdriver equipped first`;
      else if (carriedPartMesh) text = `Hands full — place what you're carrying first`;
      else text = `<kbd>Click</kbd> Unscrew`;
    } else if (kind === "dropzone" && carriedPartKind === "screw") text = `<kbd>E</kbd> Place screw in tray`;
    else if (kind === "fan-hub" && taskState.diagnose.done && !taskState.cpuFanHub.done) {
      text = `<kbd>Click</kbd> Move CPU cooler cable to the CPU_FAN header`;
    } else if (kind === "loose-pin" && taskState.diagnose.done && !taskState.coolerScrew.done) {
      text = `<kbd>Click</kbd> Seat the loose cooler mounting pin`;
    } else if (kind === "case-fan" && taskState.diagnose.done && !taskState.fanBackwards.done) {
      text = `<kbd>Click</kbd> Flip the intake fan around`;
    }

    if (text) { hintEl.innerHTML = text; hintEl.classList.add("visible"); }
    else hintEl.classList.remove("visible");
  }

  function esdReady() {
    return taskState.unplug.done && taskState.discharge.done && taskState.strap.done && taskState.mat.done;
  }
  function repairsReady() {
    return taskState.cpuFanHub.done && taskState.coolerScrew.done && taskState.fanBackwards.done;
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

  function moveCaseToMat() {
    let t = 0;
    const start = towerGroup.position.clone();
    const startRotY = towerPivot.rotation.y;
    const anim = () => {
      t += 0.025;
      const tt = Math.min(1, t);
      // Ease in/out so the slide doesn't start or stop with a jolt.
      const e = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
      towerGroup.position.lerpVectors(start, towerMatPos, e);
      towerPivot.rotation.y = startRotY + (towerMatRotY - startRotY) * e;
      if (tt < 1) requestAnimationFrame(anim);
      else {
        towerGroup.position.copy(towerMatPos);
        towerPivot.rotation.y = towerMatRotY;
        // Once on the mat, the case's own bulk sits close enough to the
        // internals (RAM, connectors) and the ticket to win the hover
        // fallback's proximity check over them — its one job here is
        // done, so stop it from competing for raycasts at all.
        chassisGroup.userData.interactable = false;
        markDone("mat");
        toast("Case moved onto the anti-static mat");
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
      new THREE.CylinderGeometry(0.009, 0.009, 0.012, 12),
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
      panelGroup.position.x = chassisGroup.position.x + CW / 2 + 0.005 + Math.min(1, t) * 0.35;
      if (t < 1) requestAnimationFrame(anim);
      else { panelGroup.visible = false; internals.visible = true; toast("Side panel open"); }
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

  // Fault fix #1: move the CPU cooler's fan cable off the RGB hub and onto
  // the board's CPU_FAN header, animating the tube's endpoint across.
  function fixCpuFanHub() {
    let t = 0;
    const start = coolerCableEnd.clone();
    const anim = () => {
      t += 0.04;
      const tt = Math.min(1, t);
      coolerCableEnd = start.clone().lerp(cpuFanHeaderPos, tt);
      internals.remove(coolerCableMesh);
      coolerCableMesh = buildCoolerCableMesh(coolerCableEnd);
      internals.add(coolerCableMesh);
      if (tt < 1) requestAnimationFrame(anim);
      else {
        fanHub.userData.interactable = false;
        markDone("cpuFanHub");
        toast("Fan cable moved to the CPU_FAN header");
      }
    };
    anim();
  }

  // Fault fix #2: seat the loose CPU cooler mounting pin back into its hole.
  function fixCoolerScrew() {
    const grp = boardGroup.userData.loosePinGroup;
    const startPos = grp.position.clone();
    const startRot = grp.rotation.z;
    const targetPos = boardGroup.userData.loosePinSeatedPos;
    let t = 0;
    const anim = () => {
      t += 0.06;
      const tt = Math.min(1, t);
      grp.position.lerpVectors(startPos, targetPos, tt);
      grp.rotation.z = startRot * (1 - tt);
      if (tt < 1) requestAnimationFrame(anim);
      else {
        grp.userData.interactable = false;
        markDone("coolerScrew");
        toast("Cooler mounting pin seated");
      }
    };
    anim();
  }

  // Fault fix #3: flip the reversed front intake fan 180° in place and swap
  // its airflow sticker to the correct (intake) direction.
  function fixFanBackwards() {
    let t = 0;
    const startRot = frontFan.rotation.z;
    const anim = () => {
      t += 0.05;
      const tt = Math.min(1, t);
      frontFan.rotation.z = startRot + Math.PI * tt;
      if (tt < 1) requestAnimationFrame(anim);
      else {
        airflowSticker.material.map = airflowRightTex;
        airflowSticker.material.needsUpdate = true;
        frontFan.userData.interactable = false;
        markDone("fanBackwards");
        toast("Intake fan flipped — now blowing into the case");
      }
    };
    anim();
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
          toast("POST successful");
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
    wrap.innerHTML = `<div class="mc-kicker">Reference</div><h2>${COOLING_SPEC_SHEET.title}</h2>`;
    const table = el("table", "spec-table");
    COOLING_SPEC_SHEET.rows.forEach(([label, value]) => {
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
      `<p class="mc-body">Symptom: boots fine, throttles or crashes under any real load, case runs hot — since new case fans and an RGB fan hub were installed. Select every issue you can see.</p>`;
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
    } else if (kind === "fan-hub" && taskState.diagnose.done && !taskState.cpuFanHub.done) {
      fixCpuFanHub();
    } else if (kind === "loose-pin" && taskState.diagnose.done && !taskState.coolerScrew.done) {
      fixCoolerScrew();
    } else if (kind === "case-fan" && taskState.diagnose.done && !taskState.fanBackwards.done) {
      fixFanBackwards();
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
    } else if (kind === "case" && !taskState.mat.done) {
      if (!(taskState.unplug.done && taskState.discharge.done && taskState.strap.done)) return;
      moveCaseToMat();
    } else if (kind === "manual") {
      openManualModal();
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
    if (hovered && hovered.userData.kind === "power-button" && !taskState.discharge.done) return; // handled by hold
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
  // which of the ~130 meshes in this scene should ground themselves, and
  // nothing here is large/flat enough for a wrongly-shadowed mesh to be a
  // visible problem. Floor/bench/mat surfaces mainly receive; small parts
  // mainly cast onto them.
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

    frontFan.userData.blade.rotateZ(dt * 6);
    frontFan.userData.wheel.rotateZ(dt * 6);
    rearFan.userData.blade.rotateZ(dt * 6);
    rearFan.userData.wheel.rotateZ(dt * 6);
    if (internals.visible) boardGroup.userData.coolerFanBlade.rotateZ(dt * 6);

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
