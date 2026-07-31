import * as THREE from "three";

// Minimal first-person controller: pointer-lock mouse look + WASD walk,
// clamped to a rectangular room so the player can't walk through walls.
// No external addon needed — this is small enough to own directly.
export function createFPController({ camera, domElement, bounds, obstacles = [], playerRadius = 0.28, eyeHeight = 1.65 }) {
  const yawObject = new THREE.Object3D();
  yawObject.position.set(0, eyeHeight, 0);
  const pitchObject = new THREE.Object3D();
  pitchObject.add(camera);
  yawObject.add(pitchObject);

  let yaw = 0;
  let pitch = 0;
  const PITCH_LIMIT = Math.PI / 2 - 0.05;

  const move = { forward: false, back: false, left: false, right: false };
  const SPEED = 2.6; // m/s

  let locked = false;

  function onPointerLockChange() {
    locked = document.pointerLockElement === domElement;
  }
  document.addEventListener("pointerlockchange", onPointerLockChange);

  // Pointer lock can silently fail to engage in a sandboxed embed (no
  // pointerlockchange ever fires there), so mouse-look also works as a
  // plain click-and-drag — same movementX/Y delta, just gated on the
  // button being held instead of on lock state. dragAccum tracks how far
  // a drag has moved so a real look-drag doesn't also register as a
  // click-to-interact once the button comes up.
  let dragging = false;
  let dragAccum = 0;
  const DRAG_CLICK_THRESHOLD = 6;

  function onMouseDown(e) {
    if (locked || e.button !== 0) return;
    dragging = true;
    dragAccum = 0;
  }
  function onMouseUp() {
    dragging = false;
  }
  domElement.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);

  function onMouseMove(e) {
    if (!locked && !dragging) return;
    if (dragging) dragAccum += Math.abs(e.movementX) + Math.abs(e.movementY);
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;
  }
  document.addEventListener("mousemove", onMouseMove);

  // Scenes call this from their click handler so a look-drag's mouseup
  // doesn't also fire whatever's under the crosshair as an interaction.
  function consumeWasDragLook() {
    const was = dragAccum > DRAG_CLICK_THRESHOLD;
    dragAccum = 0;
    return was;
  }

  function onKeyDown(e) {
    switch (e.code) {
      case "KeyW": case "ArrowUp": move.forward = true; break;
      case "KeyS": case "ArrowDown": move.back = true; break;
      case "KeyA": case "ArrowLeft": move.left = true; break;
      case "KeyD": case "ArrowRight": move.right = true; break;
    }
  }
  function onKeyUp(e) {
    switch (e.code) {
      case "KeyW": case "ArrowUp": move.forward = false; break;
      case "KeyS": case "ArrowDown": move.back = false; break;
      case "KeyA": case "ArrowLeft": move.left = false; break;
      case "KeyD": case "ArrowRight": move.right = false; break;
    }
  }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Scroll to zoom (narrows the FOV rather than moving the camera), so
  // players can lean in on a connector or slot to actually inspect it —
  // e.g. see a RAM stick sitting proud of its slot — without needing to
  // walk uncomfortably close to geometry the near clip plane would cut into.
  const BASE_FOV = camera.fov;
  const MIN_FOV = 16;
  function onWheel(e) {
    e.preventDefault();
    camera.fov = Math.max(MIN_FOV, Math.min(BASE_FOV, camera.fov + e.deltaY * 0.05));
    camera.updateProjectionMatrix();
  }
  domElement.addEventListener("wheel", onWheel, { passive: false });

  function requestLock() {
    // Best-effort — some browsers return a Promise that rejects when lock
    // is denied (e.g. a sandboxed embed with no pointer-lock permission);
    // swallow that instead of leaving an unhandled rejection, since the
    // click-and-drag fallback covers look-around either way.
    const p = domElement.requestPointerLock();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const velocity = new THREE.Vector3();

  function hitsObstacle(x, z) {
    for (const box of obstacles) {
      if (
        x > box.minX - playerRadius && x < box.maxX + playerRadius &&
        z > box.minZ - playerRadius && z < box.maxZ + playerRadius
      ) return true;
    }
    return false;
  }

  function update(dt) {
    forward.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-1);
    // No negation here, unlike forward — this formula already lands on the
    // correct screen-right direction; negating it (as forward needs) was
    // flipping A/D strafing left-for-right.
    right.set(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

    velocity.set(0, 0, 0);
    if (move.forward) velocity.add(forward);
    if (move.back) velocity.sub(forward);
    if (move.left) velocity.sub(right);
    if (move.right) velocity.add(right);
    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(SPEED * dt);
      const curX = yawObject.position.x;
      const curZ = yawObject.position.z;
      // Resolve X and Z independently so sliding along a wall/furniture
      // edge feels natural instead of stopping dead on diagonal contact.
      if (!hitsObstacle(curX + velocity.x, curZ)) yawObject.position.x = curX + velocity.x;
      if (!hitsObstacle(yawObject.position.x, curZ + velocity.z)) yawObject.position.z = curZ + velocity.z;
    }

    if (bounds) {
      yawObject.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, yawObject.position.x));
      yawObject.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, yawObject.position.z));
    }
  }

  function dispose() {
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    domElement.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    domElement.removeEventListener("wheel", onWheel);
  }

  return { yawObject, pitchObject, requestLock, update, dispose, isLocked: () => locked, consumeWasDragLook };
}
