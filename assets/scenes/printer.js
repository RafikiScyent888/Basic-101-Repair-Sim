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

  // Control panel strip (front-top)
  const panelStrip = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.5, 0.012, 0.05),
    new THREE.MeshStandardMaterial({ color: COLORS.darkTrim, roughness: 0.5 })
  );
  panelStrip.position.set(0, BH + 0.006, BD / 2 - 0.05);
  root.add(panelStrip);

  // Output tray (top, recessed look)
  const outTray = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.75, 0.01, BD * 0.5),
    new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.7 })
  );
  outTray.position.set(0, BH - 0.03, -0.02);
  root.add(outTray);

  // Paper tray (front, protruding)
  const paperTray = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.85, 0.02, 0.08),
    new THREE.MeshStandardMaterial({ color: COLORS.tray, roughness: 0.6 })
  );
  paperTray.position.set(0, 0.03, BD / 2 + 0.04);
  root.add(paperTray);

  const led = new THREE.Mesh(new THREE.CircleGeometry(0.007, 16), new THREE.MeshBasicMaterial({ color: COLORS.ledOff }));
  led.position.set(BW * 0.2, BH + 0.013, BD / 2 - 0.05);
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
  fuse.position.set(-0.06, BH * 0.35, -BD / 2 + 0.03);
  fuse.userData.hotspotId = "fuse";
  internals.add(fuse);

  const psuBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.015),
    new THREE.MeshStandardMaterial({ color: COLORS.psuOff })
  );
  psuBoard.position.set(0.06, BH * 0.32, -BD / 2 + 0.03);
  psuBoard.userData.hotspotId = "psuBoard";
  internals.add(psuBoard);

  // -------- Power inlet (external, always visible) --------
  const inlet = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.012),
    new THREE.MeshStandardMaterial({ color: COLORS.inletOff })
  );
  inlet.position.set(-BW / 2 + 0.04, 0.04, -BD / 2 - 0.004);
  inlet.userData.hotspotId = "powerInlet";
  root.add(inlet);

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
    const startZ = mesh.position.z;
    const anim = () => {
      t += 0.07;
      mesh.position.z = startZ - t * 0.08;
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
