import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";

const COLORS = {
  body: 0xe4e6ea,
  bodyEdge: 0x3a3f47,
  darkTrim: 0x33363c,
  tray: 0xbfc4cc,
  screwHead: 0xc9cdd4,
  panel: 0xd4d7dc,
  fuseOff: 0xd9a233,
  fuseOn: 0x3fae5c,
  fuseBlown: 0x3a3d42,
  psuOff: 0xd9a233,
  psuOn: 0x3fae5c,
  inletOff: 0xd9a233,
  inletOn: 0x3fae5c,
  harnessOff: 0xd9a233,
  harnessOn: 0x3fae5c,
  tonerBody: 0x2a2d33,
  tonerWindowLow: 0xef4444,
  tonerWindowOk: 0x22c55e,
  ledOff: 0x334155,
  ledGood: 0x22c55e,
  ledBad: 0xef4444,
  mat: 0x1c1f24,
  matSnap: 0xc9cdd4,
  bench: 0xc7ccd4,
  benchInset: 0xaab0bb,
  screwdriverHandle: 0xd9531e,
  screwdriverShaft: 0xb8bec7,
  strapBand: 0x2b3038,
  strapCable: 0x9aa0a8,
  powerBtn: 0x4b5261,
  powerBtnPressed: 0x2e3340,
  hoverHighlight: 0x60a5fa,
};

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
      ctx.strokeStyle = Math.random() > 0.5 ? "rgba(60,32,10,0.18)" : "rgba(214,168,110,0.22)";
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      let px = 0, py = gy;
      while (px < canvas.width) { px += 18 + Math.random() * 30; py += (Math.random() - 0.5) * 10; ctx.lineTo(px, py); }
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
  camera.position.set(0.65, 0.8, 1.05);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.35;
  controls.maxDistance = 3;
  controls.target.set(0, 0.1, 0);

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

  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.75, metalness: 0.02 })
  );
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -0.002;
  scene.add(desk);

  // -------- Anti-static mat, tray, and wrist strap — beside the printer --------
  const matGroup = new THREE.Group();
  matGroup.visible = false;
  matGroup.position.set(0.05, -0.0005, 0.42);
  scene.add(matGroup);

  const matPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.004, 0.5),
    new THREE.MeshStandardMaterial({ color: COLORS.mat, roughness: 0.9, metalness: 0.05 })
  );
  matPad.position.y = 0.001;
  matGroup.add(matPad);

  const matSnap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.matSnap, metalness: 0.9, roughness: 0.2 })
  );
  matSnap.position.set(-0.38, 0.005, 0.12);
  matGroup.add(matSnap);

  const trayGroup = new THREE.Group();
  trayGroup.position.set(0.08, 0.001, 0.1);
  matGroup.add(trayGroup);
  const trayFloor = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.012, 0.13),
    new THREE.MeshStandardMaterial({ color: COLORS.bench, roughness: 0.6, metalness: 0.3 })
  );
  trayFloor.position.y = 0.006;
  trayGroup.add(trayFloor);
  const trayInset = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.004, 0.1),
    new THREE.MeshStandardMaterial({ color: COLORS.benchInset, roughness: 0.7 })
  );
  trayInset.position.y = 0.013;
  trayGroup.add(trayInset);
  [[0, 0.012, 0.065, 0.2, 0.012, 0.01], [0, 0.012, -0.065, 0.2, 0.012, 0.01],
   [0.1, 0.012, 0, 0.01, 0.012, 0.13], [-0.1, 0.012, 0, 0.01, 0.012, 0.13]].forEach(([x, y, z, w, h, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: COLORS.bench, roughness: 0.6 }));
    wall.position.set(x, y, z);
    trayGroup.add(wall);
  });
  const traySlotPositions = [
    [-0.05, 0.02, -0.03], [0.05, 0.02, -0.03],
    [-0.05, 0.02, 0.03], [0.05, 0.02, 0.03],
  ];
  let nextTraySlot = 0;

  const strapGroup = new THREE.Group();
  strapGroup.visible = false;
  matGroup.add(strapGroup);
  const bandGeo = new THREE.TorusGeometry(0.032, 0.006, 8, 24, Math.PI * 1.5);
  const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: COLORS.strapBand, roughness: 0.7 }));
  band.rotation.x = Math.PI / 2;
  band.position.set(-0.28, 0.01, -0.1);
  strapGroup.add(band);
  const coilPoints = [];
  const coilTurns = 10;
  for (let i = 0; i <= coilTurns * 10; i++) {
    const t = i / (coilTurns * 10);
    const angle = t * coilTurns * Math.PI * 2;
    const r = 0.012;
    coilPoints.push(new THREE.Vector3(
      -0.28 + t * 0.1 + Math.cos(angle) * r,
      0.012,
      -0.1 + t * 0.22 + Math.sin(angle) * r
    ));
  }
  const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
  const coilTube = new THREE.Mesh(
    new THREE.TubeGeometry(coilCurve, 200, 0.003, 6, false),
    new THREE.MeshStandardMaterial({ color: COLORS.strapCable, roughness: 0.5, metalness: 0.2 })
  );
  strapGroup.add(coilTube);

  const screwdriverGroup = new THREE.Group();
  screwdriverGroup.visible = false;
  scene.add(screwdriverGroup);
  const sdSpinGroup = new THREE.Group();
  screwdriverGroup.add(sdSpinGroup);
  const sdShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045, 0.0045, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: COLORS.screwdriverShaft, metalness: 0.85, roughness: 0.2 })
  );
  sdShaft.position.y = 0.05;
  sdSpinGroup.add(sdShaft);
  const sdTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.004, 0.008, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.screwdriverShaft, metalness: 0.85, roughness: 0.2 })
  );
  sdTip.position.y = 0.004;
  sdTip.rotation.x = Math.PI;
  sdSpinGroup.add(sdTip);
  const sdHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.017, 0.07, 12),
    new THREE.MeshStandardMaterial({ color: COLORS.screwdriverHandle, roughness: 0.55 })
  );
  sdHandle.position.y = 0.1 + 0.035;
  sdSpinGroup.add(sdHandle);

  const root = new THREE.Group();
  scene.add(root);

  // -------- Main body --------
  const BW = 0.36, BH = 0.2, BD = 0.3;
  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.body, metalness: 0.15, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), bodyMat);
  body.position.y = BH / 2;
  root.add(body);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, BH, BD)), new THREE.LineBasicMaterial({ color: COLORS.bodyEdge }));
  edges.position.copy(body.position);
  root.add(edges);

  // Control panel strip (front-top) with a physical power button
  const panelStrip = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.5, 0.012, 0.05),
    new THREE.MeshStandardMaterial({ color: COLORS.darkTrim, roughness: 0.5 })
  );
  panelStrip.position.set(0, BH + 0.006, BD / 2 - 0.05);
  root.add(panelStrip);

  const powerBtnGroup = new THREE.Group();
  powerBtnGroup.position.set(BW * 0.18, BH + 0.012, BD / 2 - 0.05);
  root.add(powerBtnGroup);
  const powerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.008, 20),
    new THREE.MeshStandardMaterial({ color: COLORS.powerBtn, metalness: 0.6, roughness: 0.35 })
  );
  powerBtn.position.y = 0.004;
  powerBtnGroup.add(powerBtn);
  const powerBtnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.012, 0.016, 24),
    new THREE.MeshStandardMaterial({ color: COLORS.bodyEdge, side: THREE.DoubleSide })
  );
  powerBtnRing.rotation.x = -Math.PI / 2;
  powerBtnRing.position.y = 0.0006;
  powerBtnGroup.add(powerBtnRing);
  function setPowerButtonPress(pct) {
    powerBtn.position.y = 0.004 - pct * 0.003;
    powerBtn.material.color.setHex(pct > 0 ? COLORS.powerBtnPressed : COLORS.powerBtn);
  }

  // Output tray (top, recessed look)
  const outTray = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.75, 0.01, BD * 0.5),
    new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.7 })
  );
  outTray.position.set(0, BH - 0.03, -0.02);
  root.add(outTray);

  // Paper tray (front, protruding) — doubles as the consumables/paper-path
  // check hotspot: click to slide it out, fan-check for jams, and reseat it.
  const paperTrayGroup = new THREE.Group();
  paperTrayGroup.position.set(0, 0.03, BD / 2 + 0.04);
  root.add(paperTrayGroup);
  const paperTray = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.85, 0.02, 0.08),
    new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.6 })
  );
  paperTray.userData.hotspotId = "paperTray";
  paperTrayGroup.add(paperTray);

  const led = new THREE.Mesh(new THREE.CircleGeometry(0.007, 16), new THREE.MeshBasicMaterial({ color: COLORS.ledOff }));
  led.position.set(BW * 0.34, BH + 0.013, BD / 2 - 0.05);
  led.rotation.x = -Math.PI / 2;
  root.add(led);

  // -------- Removable back panel (2 screws) --------
  const panelGroup = new THREE.Group();
  panelGroup.position.set(0, BH / 2, -BD / 2 - 0.003);
  root.add(panelGroup);
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.9, BH * 0.85, 0.008),
    new THREE.MeshStandardMaterial({ color: COLORS.panel, metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide })
  );
  panelGroup.add(backPanel);

  const screwLayout = [[-BW * 0.35, BH * 0.3], [BW * 0.35, BH * 0.3]];
  const screwMeshes = {};
  screwLayout.forEach(([x, y], i) => {
    const id = "screw" + (i + 1);
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.01, 10),
      new THREE.MeshStandardMaterial({ color: COLORS.screwHead, metalness: 0.8, roughness: 0.3 })
    );
    screw.rotation.x = Math.PI / 2;
    screw.position.set(x, y, 0.006);
    screw.userData.hotspotId = id;
    panelGroup.add(screw);
    screwMeshes[id] = screw;
  });

  // -------- Internals revealed once back panel is off --------
  const internals = new THREE.Group();
  internals.visible = false;
  root.add(internals);

  const fuse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.035, 12),
    new THREE.MeshStandardMaterial({ color: COLORS.fuseBlown })
  );
  fuse.rotation.z = Math.PI / 2;
  fuse.position.set(-0.09, BH * 0.4, -BD / 2 + 0.03);
  fuse.userData.hotspotId = "fuse";
  internals.add(fuse);

  const psuBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.015),
    new THREE.MeshStandardMaterial({ color: COLORS.psuOff })
  );
  psuBoard.position.set(0.04, BH * 0.38, -BD / 2 + 0.03);
  psuBoard.userData.hotspotId = "psuBoard";
  internals.add(psuBoard);

  // Harness connector between the PSU and the control board — a 4th
  // correlated fault: it's worked loose from years of vibration, same as
  // the other three faults on this ticket.
  const harness = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.018, 0.018),
    new THREE.MeshStandardMaterial({ color: COLORS.harnessOff })
  );
  harness.position.set(0.09, BH * 0.15, -BD / 2 + 0.03);
  harness.userData.hotspotId = "harness";
  internals.add(harness);

  // Toner cartridge — reachable with the back panel off in this stylized
  // model, for the consumables-check step (SOP habit: check consumables
  // whenever the unit is already open, even on an unrelated power ticket).
  const tonerGroup = new THREE.Group();
  tonerGroup.position.set(-0.1, BH * 0.62, -BD / 2 + 0.06);
  internals.add(tonerGroup);
  const tonerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.11, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.tonerBody, roughness: 0.5 })
  );
  tonerBody.rotation.z = Math.PI / 2;
  tonerGroup.add(tonerBody);
  const tonerWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.02),
    new THREE.MeshStandardMaterial({ color: COLORS.tonerWindowLow, roughness: 0.4 })
  );
  tonerWindow.position.set(0, 0.029, 0);
  tonerWindow.rotation.x = -Math.PI / 2;
  tonerGroup.add(tonerWindow);
  tonerGroup.userData.hotspotId = "toner";

  // -------- Power inlet (external, always visible) --------
  const inlet = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.012),
    new THREE.MeshStandardMaterial({ color: COLORS.inletOff })
  );
  inlet.position.set(-BW / 2 + 0.04, 0.04, -BD / 2 - 0.004);
  inlet.userData.hotspotId = "powerInlet";
  root.add(inlet);

  // -------- Raycasting / hotspot dispatch — direct hit plus a screen-space
  // fallback so small parts don't require a pixel-perfect click, and hover
  // highlighting shows what's interactive before clicking --------
  const hotspotCallbacks = {};
  function onHotspotClick(id, cb) {
    (hotspotCallbacks[id] = hotspotCallbacks[id] || []).push(cb);
  }

  const hotspotMeshes = {};
  scene.traverse((obj) => { if (obj.userData.hotspotId) hotspotMeshes[obj.userData.hotspotId] = obj; });

  function isEffectivelyVisible(obj) {
    let o = obj;
    while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tmpVec = new THREE.Vector3();
  const HOVER_PX_TOLERANCE = 28;

  function findHotspotAtScreen(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData.hotspotId) return obj.userData.hotspotId;
        obj = obj.parent;
      }
    }
    let closestId = null;
    let closestDist = HOVER_PX_TOLERANCE;
    for (const [id, mesh] of Object.entries(hotspotMeshes)) {
      if (!isEffectivelyVisible(mesh)) continue;
      mesh.getWorldPosition(tmpVec);
      const proj = tmpVec.clone().project(camera);
      if (proj.z > 1) continue;
      const sx = (proj.x * 0.5 + 0.5) * rect.width + rect.left;
      const sy = (-proj.y * 0.5 + 0.5) * rect.height + rect.top;
      const dist = Math.hypot(sx - clientX, sy - clientY);
      if (dist < closestDist) { closestDist = dist; closestId = id; }
    }
    return closestId;
  }

  let hoveredMesh = null;
  function hoverTargetFor(id) {
    // toner's hotspot lives on the group; highlight the visible body mesh.
    if (id === "toner") return tonerBody;
    return hotspotMeshes[id];
  }
  function clearHover() {
    if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
      hoveredMesh.material.emissive.setHex(0x000000);
    }
    hoveredMesh = null;
    renderer.domElement.style.cursor = "default";
  }
  renderer.domElement.addEventListener("pointermove", (e) => {
    const id = findHotspotAtScreen(e.clientX, e.clientY);
    const mesh = id ? hoverTargetFor(id) : null;
    if (mesh === hoveredMesh) return;
    clearHover();
    if (mesh && mesh.material && mesh.material.emissive) {
      mesh.material.emissive.setHex(COLORS.hoverHighlight);
      hoveredMesh = mesh;
      renderer.domElement.style.cursor = "pointer";
    }
  });
  renderer.domElement.addEventListener("pointerleave", clearHover);

  renderer.domElement.addEventListener("pointerdown", (e) => {
    const id = findHotspotAtScreen(e.clientX, e.clientY);
    if (id && hotspotCallbacks[id]) hotspotCallbacks[id].forEach((cb) => cb());
  });

  // -------- API --------
  function popIn(obj, duration = 12) {
    obj.visible = true;
    obj.scale.setScalar(0.001);
    let t = 0;
    const anim = () => {
      t++;
      const p = Math.min(1, t / duration);
      obj.scale.setScalar(0.001 + 0.999 * p);
      if (p < 1) requestAnimationFrame(anim);
      else obj.scale.setScalar(1);
    };
    anim();
  }
  function showMat() { popIn(matGroup); }
  function showWristStrap() { popIn(strapGroup); }

  // Auto-orient: once ESD safety is complete, swing the camera around to
  // the back of the unit, framing the removable back panel, so the trainee
  // never has to guess which way to drag to find it.
  const REPAIR_VIEW_POS = new THREE.Vector3(-0.65, 0.75, -1.05);
  const REPAIR_VIEW_TARGET = new THREE.Vector3(0, BH * 0.5, -0.05);
  function orientForRepair() {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    controls.enabled = false;
    let t = 0;
    const anim = () => {
      t += 0.02;
      const tt = Math.min(1, t);
      const ease = tt * tt * (3 - 2 * tt);
      camera.position.lerpVectors(startPos, REPAIR_VIEW_POS, ease);
      controls.target.lerpVectors(startTarget, REPAIR_VIEW_TARGET, ease);
      if (tt < 1) requestAnimationFrame(anim);
      else controls.enabled = true;
    };
    anim();
  }

  function removeScrew(id) {
    const mesh = screwMeshes[id];
    if (!mesh) return;
    clearHover();

    const worldStart = new THREE.Vector3();
    mesh.getWorldPosition(worldStart);
    const worldQuat = new THREE.Quaternion();
    mesh.getWorldQuaternion(worldQuat);

    screwdriverGroup.position.copy(worldStart);
    screwdriverGroup.position.z += -0.09;
    screwdriverGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
    screwdriverGroup.scale.setScalar(1);
    screwdriverGroup.visible = true;

    let approachT = 0;
    const approach = () => {
      approachT += 0.12;
      const tt = Math.min(1, approachT);
      screwdriverGroup.position.z = worldStart.z + -0.09 * (1 - tt);
      if (tt < 1) requestAnimationFrame(approach);
      else spin();
    };

    let spinFrames = 0;
    const SPIN_FRAMES = 30;
    const spin = () => {
      spinFrames++;
      sdSpinGroup.rotation.y += 1.1;
      if (spinFrames < SPIN_FRAMES) requestAnimationFrame(spin);
      else {
        screwdriverGroup.visible = false;
        flyToTray();
      }
    };

    approach();

    function flyToTray() {
      panelGroup.remove(mesh);
      scene.add(mesh);
      mesh.position.copy(worldStart);
      mesh.quaternion.copy(worldQuat);
      delete mesh.userData.hotspotId;
      delete hotspotMeshes[id];

      const slotLocal = traySlotPositions[nextTraySlot % traySlotPositions.length];
      nextTraySlot++;
      const slotWorld = trayGroup.localToWorld(new THREE.Vector3(...slotLocal));

      let t = 0;
      const anim = () => {
        t += 0.045;
        const tt = Math.min(1, t);
        mesh.position.lerpVectors(worldStart, slotWorld, tt);
        mesh.position.y += Math.sin(tt * Math.PI) * 0.15;
        mesh.rotation.x += 0.3;
        mesh.rotation.z += 0.18;
        if (t < 1) requestAnimationFrame(anim);
        else {
          mesh.position.copy(slotWorld);
          mesh.rotation.set(Math.PI / 2, 0, 0);
        }
      };
      anim();
    }
  }

  function openPanel() {
    let t = 0;
    const anim = () => {
      t += 0.045;
      panelGroup.position.z = (-BD / 2 - 0.003) - t * 0.15;
      if (t < 1) requestAnimationFrame(anim);
      else { panelGroup.visible = false; internals.visible = true; }
    };
    anim();
  }

  function insertPart() { /* not used in this scenario, present for API parity */ }
  function confirmSeated() { /* not used in this scenario */ }

  function fixConnector(id) {
    if (id === "fuse") {
      fuse.material.color.setHex(COLORS.fuseOn);
    } else if (id === "psuBoard") {
      psuBoard.material.color.setHex(COLORS.psuOn);
    } else if (id === "powerInlet") {
      inlet.material.color.setHex(COLORS.inletOn);
    } else if (id === "harness") {
      harness.material.color.setHex(COLORS.harnessOn);
      let t = 0;
      const anim = () => {
        t += 0.12;
        harness.position.z = (-BD / 2 + 0.03) + Math.sin(t * Math.PI) * 0.01;
        if (t < 1) requestAnimationFrame(anim);
      };
      anim();
    } else if (id === "toner") {
      let t = 0;
      const startX = tonerGroup.position.x;
      const anim = () => {
        t += 0.05;
        const tt = Math.min(1, t);
        tonerGroup.position.x = startX - Math.sin(tt * Math.PI) * 0.08;
        if (tt < 1) requestAnimationFrame(anim);
        else {
          tonerGroup.position.x = startX;
          tonerWindow.material.color.setHex(COLORS.tonerWindowOk);
        }
      };
      anim();
    } else if (id === "paperTray") {
      let t = 0;
      const startZ = paperTrayGroup.position.z;
      const anim = () => {
        t += 0.05;
        const tt = Math.min(1, t);
        paperTrayGroup.position.z = startZ + Math.sin(tt * Math.PI) * 0.09;
        if (tt < 1) requestAnimationFrame(anim);
        else paperTrayGroup.position.z = startZ;
      };
      anim();
    }
  }

  function runTestAnimation(success) {
    led.material.color.setHex(success ? COLORS.ledGood : COLORS.ledBad);
    let blinks = 0;
    const iv = setInterval(() => { led.visible = !led.visible; blinks++; if (blinks > 5) { clearInterval(iv); led.visible = true; } }, 220);
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

  return { onHotspotClick, removeScrew, openPanel, insertPart, confirmSeated, fixConnector, runTestAnimation, showMat, showWristStrap, setPowerButtonPress, orientForRepair };
}
