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

  const root = new THREE.Group();
  scene.add(root);

  // -------- Base (keyboard deck) --------
  const BW = 0.32, BD = 0.22, BH = 0.018;
  const baseTop = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), new THREE.MeshStandardMaterial({ color: COLORS.chassis, metalness: 0.4, roughness: 0.5 }));
  baseTop.position.y = BH / 2 + 0.05; // raised so there's room for a bottom panel underneath
  root.add(baseTop);

  // Keyboard hint (visual only)
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.7, BD * 0.55), new THREE.MeshStandardMaterial({ color: COLORS.keys, roughness: 0.8 }));
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(-0.01, baseTop.position.y + BH / 2 + 0.0005, 0.02);
  root.add(keys);

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
  lidPivot.rotation.x = -1.15; // tilt open

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(BW * 0.88, LID_H * 0.85),
    new THREE.MeshStandardMaterial({ color: COLORS.screen, roughness: 0.6 })
  );
  screen.position.set(0, LID_H / 2, 0.0065);
  lidPivot.add(screen);

  // -------- Removable bottom panel (underside of base) --------
  const panelY = 0.05 - 0.006; // just below the base
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
      if (id && hotspotCallbacks[id]) { hotspotCallbacks[id].forEach((cb) => cb()); break; }
    }
  });

  // -------- API --------
  function removeScrew(id) {
    const mesh = screwMeshes[id];
    if (!mesh) return;
    let t = 0;
    const startY = mesh.position.y;
    const anim = () => {
      t += 0.07;
      mesh.position.y = startY - t * 0.08;
      mesh.scale.setScalar(Math.max(0, 1 - t));
      if (t < 1) requestAnimationFrame(anim);
      else mesh.visible = false;
    };
    anim();
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

  return { onHotspotClick, removeScrew, openPanel, insertPart, confirmSeated, fixConnector, runTestAnimation };
}
