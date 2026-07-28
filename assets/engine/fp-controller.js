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

  function onMouseMove(e) {
    if (!locked) return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;
  }
  document.addEventListener("mousemove", onMouseMove);

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

  function requestLock() {
    domElement.requestPointerLock();
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
    right.set(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2)).multiplyScalar(-1);

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
  }

  return { yawObject, pitchObject, requestLock, update, dispose, isLocked: () => locked };
}
