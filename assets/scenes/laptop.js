import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";

const COLORS = {
  chassis: 0x8a8f97,
  chassisEdge: 0x24262b,
  keys: 0x3b3e44,
  screen: 0x12151a,
  screwHead: 0xc9cdd4,
  panel: 0x9aa0a8,
  batteryBad: 0xd23c3c,
  batteryGood: 0x3fae5c,
  ribbonOff: 0xd9a233,
  ribbonOn: 0x3fae5c,
  dcJackOff: 0xd9a233,
  dcJackOn: 0x3fae5c,
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
  camera.position.set(0.55, 0.75, 0.95);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.3;
  controls.maxDistance = 3;
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

  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.75, metalness: 0.02 })
  );
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -0.002;
  scene.add(desk);

  // -------- Anti-static mat, tray, and wrist strap — sit beside the laptop
  // on the desk, unaffected by the laptop's own flip animation below --------
  const matGroup = new THREE.Group();
  matGroup.visible = false;
  matGroup.position.set(0.0, -0.0005, 0.3);
  scene.add(matGroup);

  const matPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.004, 0.5),
    new THREE.MeshStandardMaterial({ color: COLORS.mat, roughness: 0.9, metalness: 0.05 })
  );
  matPad.position.y = 0.001;
  matGroup.add(matPad);

  const matSnap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.matSnap, metalness: 0.9, roughness: 0.2 })
  );
  matSnap.position.set(-0.36, 0.005, 0.12);
  matGroup.add(matSnap);

  const trayGroup = new THREE.Group();
  trayGroup.position.set(0.05, 0.001, 0.1);
  matGroup.add(trayGroup);
  const trayFloor = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.012, 0.13),
    new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.6, metalness: 0.3 })
  );
  trayFloor.position.y = 0.006;
  trayGroup.add(trayFloor);
  const trayInset = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.004, 0.1),
    new THREE.MeshStandardMaterial({ color: COLORS.trayInset, roughness: 0.7 })
  );
  trayInset.position.y = 0.013;
  trayGroup.add(trayInset);
  [[0, 0.012, 0.065, 0.2, 0.012, 0.01], [0, 0.012, -0.065, 0.2, 0.012, 0.01],
   [0.1, 0.012, 0, 0.01, 0.012, 0.13], [-0.1, 0.012, 0, 0.01, 0.012, 0.13]].forEach(([x, y, z, w, h, d]) => {
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

  const strapGroup = new THREE.Group();
  strapGroup.visible = false;
  matGroup.add(strapGroup);
  const bandGeo = new THREE.TorusGeometry(0.032, 0.006, 8, 24, Math.PI * 1.5);
  const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: COLORS.strapBand, roughness: 0.7 }));
  band.rotation.x = Math.PI / 2;
  band.position.set(-0.24, 0.01, -0.1);
  strapGroup.add(band);
  const coilPoints = [];
  const coilTurns = 10;
  for (let i = 0; i <= coilTurns * 10; i++) {
    const t = i / (coilTurns * 10);
    const angle = t * coilTurns * Math.PI * 2;
    const r = 0.012;
    coilPoints.push(new THREE.Vector3(
      -0.24 + t * 0.1 + Math.cos(angle) * r,
      0.012,
      -0.1 + t * 0.2 + Math.sin(angle) * r
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

  // -------- The laptop itself, wrapped in a flip pivot so it can rotate
  // bottom-side-up after the ESD steps without the trainee having to drag.
  // The pivot sits at the laptop's own vertical mid-height (not the desk
  // surface), so a 180 degree turn swaps top/bottom in place instead of
  // swinging the whole model down through the floor. --------
  const PIVOT_Y = 0.059;
  const flipGroup = new THREE.Group();
  flipGroup.position.set(0, PIVOT_Y, 0);
  scene.add(flipGroup);
  const root = new THREE.Group();
  root.position.set(0, -PIVOT_Y, 0);
  flipGroup.add(root);

  // -------- Base (keyboard deck) --------
  const BW = 0.32, BD = 0.22, BH = 0.018;
  const baseTop = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), new THREE.MeshStandardMaterial({ color: COLORS.chassis, metalness: 0.4, roughness: 0.5 }));
  baseTop.position.y = BH / 2 + 0.05;
  root.add(baseTop);

  const keys = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.7, BD * 0.55), new THREE.MeshStandardMaterial({ color: COLORS.keys, roughness: 0.8 }));
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(-0.01, baseTop.position.y + BH / 2 + 0.0005, 0.02);
  root.add(keys);

  // Physical power button on the deck, top-right — depresses in sync with
  // the ESD discharge hold, same as the tower's chassis button.
  const powerBtnGroup = new THREE.Group();
  powerBtnGroup.position.set(0.13, baseTop.position.y + BH / 2, -0.08);
  root.add(powerBtnGroup);
  const powerBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.008, 20),
    new THREE.MeshStandardMaterial({ color: COLORS.powerBtn, metalness: 0.6, roughness: 0.35 })
  );
  powerBtn.position.y = 0.003;
  powerBtnGroup.add(powerBtn);
  const powerBtnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.013, 0.017, 24),
    new THREE.MeshStandardMaterial({ color: COLORS.chassisEdge, side: THREE.DoubleSide })
  );
  powerBtnRing.rotation.x = -Math.PI / 2;
  powerBtnRing.position.y = 0.0006;
  powerBtnGroup.add(powerBtnRing);
  function setPowerButtonPress(pct) {
    powerBtn.position.y = 0.003 - pct * 0.0025;
    powerBtn.material.color.setHex(pct > 0 ? COLORS.powerBtnPressed : COLORS.powerBtn);
  }

  // -------- Lid (open at an angle, hinged at the back edge) --------
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, baseTop.position.y + BH / 2, -BD / 2);
  root.add(lidPivot);
  const LID_H = 0.21;
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(BW, LID_H, 0.012),
    new THREE.MeshStandardMaterial({ color: COLORS.chassis, metalness: 0.4, roughness: 0.5 })
  );
  lid.position.set(0, LID_H / 2, 0);
  lidPivot.add(lid);
  lidPivot.rotation.x = -1.15;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(BW * 0.88, LID_H * 0.85),
    new THREE.MeshStandardMaterial({ color: COLORS.screen, roughness: 0.6 })
  );
  screen.position.set(0, LID_H / 2, 0.0065);
  lidPivot.add(screen);

  // -------- Removable bottom panel (underside of base) --------
  const panelY = 0.05 - 0.006;
  const panelGroup = new THREE.Group();
  panelGroup.position.set(0, panelY, 0);
  root.add(panelGroup);
  const bottomPanel = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.94, 0.006, BD * 0.9),
    new THREE.MeshStandardMaterial({ color: COLORS.panel, metalness: 0.4, roughness: 0.6 })
  );
  panelGroup.add(bottomPanel);

  const screwLayout = [
    [-0.12, 0.08], [0.12, 0.08],
    [-0.12, -0.08], [0.12, -0.08],
    [-0.12, 0], [0.12, 0],
  ];
  const screwMeshes = {};
  screwLayout.forEach(([x, z], i) => {
    const id = "screw" + (i + 1);
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.006, 10),
      new THREE.MeshStandardMaterial({ color: COLORS.screwHead, metalness: 0.8, roughness: 0.3 })
    );
    screw.position.set(x, -0.004, z);
    screw.userData.hotspotId = id;
    panelGroup.add(screw);
    screwMeshes[id] = screw;
  });

  // -------- Internals revealed once the bottom panel is off --------
  const internals = new THREE.Group();
  internals.visible = false;
  root.add(internals);

  const batteryBad = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.012, 0.09),
    new THREE.MeshStandardMaterial({ color: COLORS.batteryBad, roughness: 0.5 })
  );
  batteryBad.position.set(-0.04, 0.03, 0.02);
  batteryBad.userData.hotspotId = "oldBattery";
  internals.add(batteryBad);

  const batteryGood = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.012, 0.09),
    new THREE.MeshStandardMaterial({ color: COLORS.batteryGood, roughness: 0.5 })
  );
  batteryGood.position.set(-0.04, 0.045, 0.02);
  batteryGood.visible = false;
  internals.add(batteryGood);

  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.006, 0.012),
    new THREE.MeshStandardMaterial({ color: COLORS.ribbonOff })
  );
  ribbon.position.set(0.1, 0.032, -0.06);
  ribbon.userData.hotspotId = "powerRibbon";
  internals.add(ribbon);

  // -------- DC power jack (external, always visible on the side edge) --------
  const dcJack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: COLORS.dcJackOff })
  );
  dcJack.rotation.z = Math.PI / 2;
  dcJack.position.set(BW / 2 + 0.005, baseTop.position.y, 0.06);
  dcJack.userData.hotspotId = "dcJack";
  root.add(dcJack);

  const led = new THREE.Mesh(new THREE.CircleGeometry(0.006, 16), new THREE.MeshBasicMaterial({ color: COLORS.ledOff }));
  led.rotation.x = -Math.PI / 2;
  led.position.set(0.13, baseTop.position.y + BH / 2 + 0.0006, 0.09);
  root.add(led);

  // -------- Raycasting / hotspot dispatch — direct hit plus a screen-space
  // fallback so small parts (screws, connectors) don't require a pixel-
  // perfect click, and hover highlighting shows what's interactive --------
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
      if (proj.z > 1) continue;
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

  // Auto-flip: once ESD safety is complete, physically turn the laptop
  // bottom-side-up so the trainee can see the panel screws immediately
  // instead of having to guess which way to drag-rotate the model.
  let flipped = false;
  const LID_OPEN_ANGLE = -1.15;
  const LID_CLOSED_ANGLE = Math.PI / 2 - 0.03; // folds forward flat over the keyboard deck
  function orientForRepair() {
    if (flipped) return;
    flipped = true;
    controls.enabled = false;

    // A technician closes the lid before flipping a laptop over — do the
    // same here, otherwise the open screen would swing wildly through
    // the flip and end up floating in mid-air.
    let ct = 0;
    const closeLid = () => {
      ct += 0.06;
      const tt = Math.min(1, ct);
      lidPivot.rotation.x = LID_OPEN_ANGLE + (LID_CLOSED_ANGLE - LID_OPEN_ANGLE) * tt;
      if (tt < 1) requestAnimationFrame(closeLid);
      else flip();
    };

    let t = 0;
    const flip = () => {
      t += 0.014;
      const tt = Math.min(1, t);
      const ease = tt * tt * (3 - 2 * tt);
      flipGroup.rotation.x = ease * Math.PI;
      flipGroup.position.y = PIVOT_Y + Math.sin(tt * Math.PI) * 0.1;
      if (tt < 1) requestAnimationFrame(flip);
      else {
        flipGroup.position.y = PIVOT_Y;
        controls.enabled = true;
      }
    };

    closeLid();
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
    screwdriverGroup.position.x += 0.09;
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
      panelGroup.position.y = panelY - t * 0.12;
      if (t < 1) requestAnimationFrame(anim);
      else { panelGroup.visible = false; internals.visible = true; }
    };
    anim();
  }

  function insertPart(slotId) {
    if (slotId !== "batterySlot") return;
    batteryBad.visible = false;
    batteryGood.visible = true;
    batteryGood.position.y = 0.09;
  }

  function confirmSeated(slotId) {
    if (slotId !== "batterySlot") return;
    let t = 0;
    const startY = batteryGood.position.y;
    const targetY = 0.045;
    const anim = () => {
      t += 0.15;
      batteryGood.position.y = startY + (targetY - startY) * Math.min(1, t);
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  function fixConnector(id) {
    if (id === "powerRibbon") {
      ribbon.material.color.setHex(COLORS.ribbonOn);
    } else if (id === "dcJack") {
      dcJack.material.color.setHex(COLORS.dcJackOn);
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
