import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";

const COLORS = {
  chassis: 0x757f8f,
  chassisEdge: 0x1c2230,
  panel: 0x8fa0b8,
  screw: 0xc9cdd4,
  screwGone: 0x000000,
  boardGreen: 0x1f6b3a,
  ramBad: 0xd23c3c,
  ramGood: 0x3fae5c,
  ramSlotEmpty: 0x14202b,
  connectorOff: 0xd9a233,
  connectorOn: 0x3fae5c,
  standoff: 0x9aa0a8,
  psu: 0x181b20,
  ledOff: 0x334155,
  ledGood: 0x22c55e,
  ledBad: 0xef4444,
};

// Procedural wood-grain texture for the workbench surface — no external
// image assets, just canvas-drawn planks with grain streaks.
function makeWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#a9713f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const plankHeight = 64;
  for (let y = 0; y < canvas.height; y += plankHeight) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.04})`;
    ctx.fillRect(0, y, canvas.width, 2);

    for (let i = 0; i < 26; i++) {
      const gy = y + Math.random() * plankHeight;
      const shade = Math.random() > 0.5 ? "rgba(60,32,10,0.18)" : "rgba(214,168,110,0.22)";
      ctx.strokeStyle = shade;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      let px = 0, py = gy;
      while (px < canvas.width) {
        px += 18 + Math.random() * 30;
        py += (Math.random() - 0.5) * 10;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export async function buildScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdde5f2);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.05, 50);
  camera.position.set(1.7, 0.85, 0.55);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 4;
  controls.target.set(0, 0.05, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(2, 3, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.7);
  fill.position.set(-2, 1, -2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);
  rim.position.set(0, 2, -3);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  // -------- Workbench desk surface --------
  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.75, metalness: 0.02 })
  );
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -0.002;
  scene.add(desk);

  // -------- Chassis --------
  // Built as 5 open faces (everything except the +X side) instead of a
  // sealed box, so removing the side panel actually reveals the interior
  // instead of being blocked by the chassis' own hidden face.
  const CW = 0.42, CH = 0.46, CD = 0.2; // full width/height/depth
  const chassisGroup = new THREE.Group();
  chassisGroup.position.y = 0.23;
  root.add(chassisGroup);
  const chassisMat = new THREE.MeshStandardMaterial({ color: COLORS.chassis, metalness: 0.4, roughness: 0.55, side: THREE.DoubleSide });

  function face(w, h, pos, rotEuler) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), chassisMat);
    m.position.set(...pos);
    if (rotEuler) m.rotation.set(...rotEuler);
    chassisGroup.add(m);
    return m;
  }
  face(CW, CD, [0, CH / 2, 0], [Math.PI / 2, 0, 0]);           // top
  face(CW, CD, [0, -CH / 2, 0], [Math.PI / 2, 0, 0]);          // bottom
  face(CW, CH, [0, 0, CD / 2]);                                  // front
  face(CW, CH, [0, 0, -CD / 2], [0, Math.PI, 0]);              // back
  face(CD, CH, [-CW / 2, 0, 0], [0, Math.PI / 2, 0]);          // left (opposite the removable panel)
  // Intentionally no face at +X — that's where the removable side panel sits.

  const chassisGeoForEdges = new THREE.BoxGeometry(CW, CH, CD);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(chassisGeoForEdges), new THREE.LineBasicMaterial({ color: COLORS.chassisEdge }));
  edges.position.copy(chassisGroup.position);
  root.add(edges);

  // Front panel LED (test indicator)
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), new THREE.MeshBasicMaterial({ color: COLORS.ledOff }));
  led.position.set(0.15, 0.4, 0.101);
  root.add(led);

  // -------- Side panel (removable) --------
  const panelGroup = new THREE.Group();
  panelGroup.position.set(0.211, 0.23, 0);
  root.add(panelGroup);
  const panelMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.44, 0.19),
    new THREE.MeshStandardMaterial({ color: COLORS.panel, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide })
  );
  panelGroup.add(panelMesh);

  const screwPositions = [
    [0, 0.18, 0.07], [0, 0.18, -0.07], [0, -0.18, 0.07], [0, -0.18, -0.07],
  ];
  const screwMeshes = {};
  screwPositions.forEach((pos, i) => {
    const id = "screw" + (i + 1);
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.014, 12),
      new THREE.MeshStandardMaterial({ color: COLORS.screw, metalness: 0.8, roughness: 0.3 })
    );
    screw.rotation.z = Math.PI / 2;
    screw.position.set(pos[0] + 0.008, pos[1], pos[2]);
    screw.userData.hotspotId = id;
    panelGroup.add(screw);
    screwMeshes[id] = screw;
  });

  // -------- Internals (revealed once panel opens) --------
  const internals = new THREE.Group();
  internals.visible = false;
  root.add(internals);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.38, 0.16),
    new THREE.MeshStandardMaterial({ color: COLORS.boardGreen, metalness: 0.2, roughness: 0.7 })
  );
  board.position.set(0.08, 0.24, 0);
  internals.add(board);

  // RAM slots: two slot markers, one holding the "bad" stick, one empty (correct target)
  function makeRamStick(color) {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.1, 0.03),
      new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 })
    );
    g.add(stick);
    return g;
  }

  const slotAPos = [0.092, 0.3, -0.04];
  const slotBPos = [0.092, 0.3, 0.04];

  const slotAMarker = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.105, 0.032), new THREE.MeshStandardMaterial({ color: COLORS.ramSlotEmpty }));
  slotAMarker.position.set(slotAPos[0] - 0.006, slotAPos[1], slotAPos[2]);
  slotAMarker.userData.hotspotId = "ramSlotA";
  internals.add(slotAMarker);

  const slotBMarker = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.105, 0.032), new THREE.MeshStandardMaterial({ color: COLORS.ramSlotEmpty }));
  slotBMarker.position.set(slotBPos[0] - 0.006, slotBPos[1], slotBPos[2]);
  internals.add(slotBMarker);

  const badRam = makeRamStick(COLORS.ramBad);
  badRam.position.set(...slotAPos);
  badRam.userData.hotspotId = "badRam";
  internals.add(badRam);

  const goodRamStick = makeRamStick(COLORS.ramGood);
  goodRamStick.position.set(...slotBPos);
  goodRamStick.visible = false;
  internals.add(goodRamStick);

  // CPU power connector (unseated = offset + amber, fixed = seated + green)
  const cpuConn = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.03, 0.02),
    new THREE.MeshStandardMaterial({ color: COLORS.connectorOff })
  );
  cpuConn.position.set(0.09, 0.42, -0.05);
  cpuConn.userData.hotspotId = "cpuPower";
  internals.add(cpuConn);

  // Stray standoff sticking up where it shouldn't be
  const standoff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.standoff, metalness: 0.8, roughness: 0.3 })
  );
  standoff.position.set(0.09, 0.08, 0.03);
  standoff.userData.hotspotId = "standoff";
  internals.add(standoff);

  const psu = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: COLORS.psu, metalness: 0.5, roughness: 0.5 })
  );
  psu.position.set(0.09, 0.09, -0.08);
  internals.add(psu);

  // CMOS battery (coin cell) — used by the workstation-repair scenario
  const cmosBattery = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.connectorOff, metalness: 0.7, roughness: 0.3 })
  );
  cmosBattery.rotation.x = Math.PI / 2;
  cmosBattery.position.set(0.09, 0.16, 0.05);
  cmosBattery.userData.hotspotId = "cmosBattery";
  internals.add(cmosBattery);

  // Main 24-pin motherboard power connector — separate from the CPU 8-pin,
  // used by the workstation-repair scenario
  const mainPowerConn = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.05, 0.015),
    new THREE.MeshStandardMaterial({ color: COLORS.connectorOff })
  );
  mainPowerConn.position.set(0.09, 0.28, -0.075);
  mainPowerConn.userData.hotspotId = "mainPower24";
  internals.add(mainPowerConn);

  // -------- Raycasting / hotspot dispatch --------
  const hotspotCallbacks = {};
  function onHotspotClick(id, cb) {
    (hotspotCallbacks[id] = hotspotCallbacks[id] || []).push(cb);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener("pointerdown", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      const id = hit.object.userData.hotspotId;
      if (id && hotspotCallbacks[id]) {
        hotspotCallbacks[id].forEach((cb) => cb());
        break;
      }
    }
  });

  // -------- API the engine drives --------
  function removeScrew(id) {
    const mesh = screwMeshes[id];
    if (!mesh) return;
    let t = 0;
    const start = mesh.position.x;
    const anim = () => {
      t += 0.06;
      mesh.position.x = start + t * 0.15;
      mesh.scale.setScalar(Math.max(0, 1 - t));
      if (t < 1) requestAnimationFrame(anim);
      else mesh.visible = false;
    };
    anim();
  }

  function openPanel(id) {
    let t = 0;
    const anim = () => {
      t += 0.04;
      panelGroup.position.x = 0.211 + t * 0.3;
      panelGroup.rotation.y = t * 0.6;
      if (t < 1) requestAnimationFrame(anim);
      else { panelGroup.visible = false; internals.visible = true; }
    };
    anim();
  }

  function insertPart(slotId, candidate) {
    if (slotId !== "ramSlotB") return;
    badRam.visible = false;
    goodRamStick.visible = true;
    goodRamStick.position.y = slotBPos[1] + 0.06;
    goodRamStick.userData._seated = false;
  }

  function confirmSeated(slotId) {
    if (slotId !== "ramSlotB") return;
    let t = 0;
    const startY = goodRamStick.position.y;
    const targetY = slotBPos[1];
    const anim = () => {
      t += 0.15;
      goodRamStick.position.y = startY + (targetY - startY) * Math.min(1, t);
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  function fixConnector(id) {
    if (id === "cpuPower") {
      cpuConn.material.color.setHex(COLORS.connectorOn);
      cpuConn.position.y = 0.4;
    } else if (id === "standoff") {
      let t = 0;
      const anim = () => {
        t += 0.08;
        standoff.position.y = 0.08 + t * 0.1;
        standoff.scale.setScalar(Math.max(0, 1 - t));
        if (t < 1) requestAnimationFrame(anim);
        else standoff.visible = false;
      };
      anim();
    } else if (id === "mainPower24") {
      mainPowerConn.material.color.setHex(COLORS.connectorOn);
      mainPowerConn.position.z = -0.07;
    } else if (id === "cmosBattery") {
      let t = 0;
      const anim = () => {
        t += 0.1;
        cmosBattery.scale.setScalar(Math.max(0, 1 - t) * 0.5 + 0.5);
        if (t < 1) requestAnimationFrame(anim);
        else cmosBattery.material.color.setHex(COLORS.connectorOn);
      };
      anim();
    }
  }

  function runTestAnimation(success) {
    led.material.color.setHex(success ? COLORS.ledGood : COLORS.ledBad);
    let blinks = 0;
    const iv = setInterval(() => {
      led.visible = !led.visible;
      blinks++;
      if (blinks > 5) { clearInterval(iv); led.visible = true; }
    }, 220);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { onHotspotClick, removeScrew, openPanel, insertPart, confirmSeated, fixConnector, runTestAnimation };
}
