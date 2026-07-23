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
  mat: 0x1c1f24,
  matSnap: 0xc9cdd4,
  tray: 0xc7ccd4,
  trayInset: 0xaab0bb,
  screwdriverHandle: 0xd9531e,
  screwdriverShaft: 0xb8bec7,
  strapBand: 0x2b3038,
  strapCable: 0x9aa0a8,
  powerBtn: 0x4b5261,
  powerBtnPressed: 0x2e3340,
  hoverHighlight: 0x60a5fa,
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

  // -------- Anti-static mat (appears when the trainee confirms it's placed) --------
  const matGroup = new THREE.Group();
  matGroup.visible = false;
  matGroup.position.set(0.02, -0.0005, 0.19);
  scene.add(matGroup);

  const matPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.004, 0.8),
    new THREE.MeshStandardMaterial({ color: COLORS.mat, roughness: 0.9, metalness: 0.05 })
  );
  matPad.position.y = 0.001;
  matGroup.add(matPad);

  // Grounding snap on the mat
  const matSnap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.matSnap, metalness: 0.9, roughness: 0.2 })
  );
  matSnap.position.set(-0.4, 0.005, 0.24);
  matGroup.add(matSnap);

  // -------- Screw tray, sitting on the mat --------
  const trayGroup = new THREE.Group();
  trayGroup.position.set(0.08, 0.001, 0.24);
  matGroup.add(trayGroup);
  const trayFloor = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.012, 0.14),
    new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.6, metalness: 0.3 })
  );
  trayFloor.position.y = 0.006;
  trayGroup.add(trayFloor);
  const trayInset = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.004, 0.11),
    new THREE.MeshStandardMaterial({ color: COLORS.trayInset, roughness: 0.7 })
  );
  trayInset.position.y = 0.013;
  trayGroup.add(trayInset);
  // 4 low walls so it visually reads as a tray, not a flat chip
  [[0, 0.012, 0.07, 0.22, 0.012, 0.01], [0, 0.012, -0.07, 0.22, 0.012, 0.01],
   [0.11, 0.012, 0, 0.01, 0.012, 0.14], [-0.11, 0.012, 0, 0.01, 0.012, 0.14]].forEach(([x, y, z, w, h, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.6 }));
    wall.position.set(x, y, z);
    trayGroup.add(wall);
  });
  const traySlotPositions = [
    [-0.05, 0.02, -0.03], [0.05, 0.02, -0.03],
    [-0.05, 0.02, 0.03], [0.05, 0.02, 0.03],
    [-0.05, 0.02, 0], [0.05, 0.02, 0],
  ];
  let nextTraySlot = 0;

  // -------- Wrist strap (band + coiled cable + grounding clip), appears when confirmed worn --------
  const strapGroup = new THREE.Group();
  strapGroup.visible = false;
  matGroup.add(strapGroup);

  const bandGeo = new THREE.TorusGeometry(0.032, 0.006, 8, 24, Math.PI * 1.5);
  const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: COLORS.strapBand, roughness: 0.7 }));
  band.rotation.x = Math.PI / 2;
  band.position.set(-0.28, 0.01, 0.1);
  strapGroup.add(band);

  // Coiled cable approximated as a spring-shaped tube from the band to the grounding snap
  const coilPoints = [];
  const coilTurns = 10;
  for (let i = 0; i <= coilTurns * 10; i++) {
    const t = i / (coilTurns * 10);
    const angle = t * coilTurns * Math.PI * 2;
    const r = 0.012;
    coilPoints.push(new THREE.Vector3(
      -0.28 + t * 0.12 + Math.cos(angle) * r,
      0.012,
      0.1 - t * 0.14 + Math.sin(angle) * r
    ));
  }
  const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
  const coilTube = new THREE.Mesh(
    new THREE.TubeGeometry(coilCurve, 200, 0.003, 6, false),
    new THREE.MeshStandardMaterial({ color: COLORS.strapCable, roughness: 0.5, metalness: 0.2 })
  );
  strapGroup.add(coilTube);

  // -------- Screwdriver (appears and spins in place at each screw before it comes loose) --------
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

  // Physical power button — depresses in sync with the ESD discharge hold
  const powerBtnGroup = new THREE.Group();
  powerBtnGroup.position.set(0.1, 0.4, 0.1);
  root.add(powerBtnGroup);
  const powerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.012, 20),
    new THREE.MeshStandardMaterial({ color: COLORS.powerBtn, metalness: 0.6, roughness: 0.35 })
  );
  powerBtn.rotation.x = Math.PI / 2;
  powerBtn.position.z = 0.006;
  powerBtnGroup.add(powerBtn);
  const powerBtnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.019, 0.024, 24),
    new THREE.MeshStandardMaterial({ color: COLORS.chassisEdge, side: THREE.DoubleSide })
  );
  powerBtnRing.position.z = 0.002;
  powerBtnGroup.add(powerBtnRing);

  function setPowerButtonPress(pct) {
    // pct: 0 (released) to 1 (fully held down)
    powerBtn.position.z = 0.006 - pct * 0.005;
    powerBtn.material.color.setHex(pct > 0 ? COLORS.powerBtnPressed : COLORS.powerBtn);
  }

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
  // Small real-world parts (screws, connectors) are hard to click pixel-
  // perfectly, so besides a direct raycast we fall back to "nearest hotspot
  // within a generous on-screen radius" — this also powers hover highlighting
  // so the trainee can see what's interactive before clicking.
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
      const id = hit.object.userData.hotspotId;
      if (id) return id;
    }
    let closestId = null;
    let closestDist = HOVER_PX_TOLERANCE;
    for (const [id, mesh] of Object.entries(hotspotMeshes)) {
      if (!isEffectivelyVisible(mesh)) continue;
      mesh.getWorldPosition(tmpVec);
      const proj = tmpVec.clone().project(camera);
      if (proj.z > 1) continue; // behind camera
      const sx = (proj.x * 0.5 + 0.5) * rect.width + rect.left;
      const sy = (-proj.y * 0.5 + 0.5) * rect.height + rect.top;
      const dist = Math.hypot(sx - clientX, sy - clientY);
      if (dist < closestDist) { closestDist = dist; closestId = id; }
    }
    return closestId;
  }

  let hoveredMesh = null;
  function clearHover() {
    if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
      hoveredMesh.material.emissive.setHex(0x000000);
    }
    hoveredMesh = null;
    renderer.domElement.style.cursor = "default";
  }
  renderer.domElement.addEventListener("pointermove", (e) => {
    const id = findHotspotAtScreen(e.clientX, e.clientY);
    const mesh = id ? hotspotMeshes[id] : null;
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

  // -------- API the engine drives --------
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

  // Smoothly swing the camera back to the canonical "open side panel" view
  // once ESD safety is complete, so the trainee never has to guess which
  // way to drag to find the removable panel.
  const REPAIR_VIEW_POS = new THREE.Vector3(1.7, 0.85, 0.55);
  const REPAIR_VIEW_TARGET = new THREE.Vector3(0, 0.23, 0);
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

    // Bring the screwdriver in, tip at the screw head, and spin it in place
    // before the screw actually comes free.
    screwdriverGroup.position.copy(worldStart);
    screwdriverGroup.position.x += 0.09; // start pulled back from the head
    screwdriverGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
    screwdriverGroup.scale.setScalar(1);
    screwdriverGroup.visible = true;

    let approachT = 0;
    const approach = () => {
      approachT += 0.12;
      const tt = Math.min(1, approachT);
      screwdriverGroup.position.x = worldStart.x + 0.09 * (1 - tt);
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
      delete mesh.userData.hotspotId; // already removed — no longer clickable
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

  return { onHotspotClick, removeScrew, openPanel, insertPart, confirmSeated, fixConnector, runTestAnimation, showMat, showWristStrap, setPowerButtonPress, orientForRepair };
}
