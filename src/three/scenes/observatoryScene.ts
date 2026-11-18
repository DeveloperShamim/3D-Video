import * as THREE from 'three';
import { AnimatedSceneController, SceneBuildContext } from './types';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function createObservatoryScene(ctx: SceneBuildContext): AnimatedSceneController {
  const { materials, textures } = ctx;
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];

  // 1. Pedestal Anchor Base (grounded at y = 0)
  const pedGeo = new THREE.CylinderGeometry(1.3, 1.65, 0.32, 48);
  geometries.push(pedGeo);
  const pedMesh = new THREE.Mesh(pedGeo, materials.darkTrim);
  pedMesh.position.y = 0.16;
  pedMesh.receiveShadow = true;
  pedMesh.castShadow = true;
  group.add(pedMesh);

  const ringBaseGeo = new THREE.TorusGeometry(1.42, 0.055, 16, 64);
  geometries.push(ringBaseGeo);
  const ringBase = new THREE.Mesh(ringBaseGeo, materials.heroPrimary);
  ringBase.rotation.x = Math.PI / 2;
  ringBase.position.y = 0.32;
  group.add(ringBase);

  // 2. Astrolabe Cradle Yoke
  const yokeGeo = new THREE.TorusGeometry(1.92, 0.06, 20, 64, Math.PI);
  geometries.push(yokeGeo);
  const yoke = new THREE.Mesh(yokeGeo, materials.heroSecondary);
  yoke.position.y = 2.05;
  yoke.rotation.z = Math.PI;
  yoke.castShadow = true;
  group.add(yoke);

  // 3. Multi-Axis Gyroscope Rings
  const astroGroup = new THREE.Group();
  astroGroup.position.y = 2.05;

  const r1Geo = new THREE.TorusGeometry(1.65, 0.05, 20, 72);
  const r2Geo = new THREE.TorusGeometry(1.32, 0.045, 20, 64);
  const r3Geo = new THREE.TorusGeometry(0.98, 0.04, 20, 56);
  geometries.push(r1Geo, r2Geo, r3Geo);

  const ring1 = new THREE.Mesh(r1Geo, materials.heroPrimary);
  const ring2 = new THREE.Mesh(r2Geo, materials.heroSecondary);
  const ring3 = new THREE.Mesh(r3Geo, materials.heroPrimary);
  ring1.castShadow = true;
  ring2.castShadow = true;
  ring3.castShadow = true;
  astroGroup.add(ring1, ring2, ring3);

  // 4. Refractive Crystal Stellar Core + Glowing Inner Heart
  const outerCrystalGeo = new THREE.IcosahedronGeometry(0.56, 0);
  geometries.push(outerCrystalGeo);
  const outerCrystal = new THREE.Mesh(outerCrystalGeo, materials.crystalGlass);
  outerCrystal.renderOrder = 10;
  astroGroup.add(outerCrystal);

  const heartGeo = new THREE.OctahedronGeometry(0.28, 1);
  geometries.push(heartGeo);
  const heartMesh = new THREE.Mesh(heartGeo, materials.accentGlow);
  astroGroup.add(heartMesh);

  // 5. Three Composite Orbiting Probe Satellites
  const probeBodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.24, 12);
  const probePanelGeo = new THREE.BoxGeometry(0.38, 0.02, 0.1);
  geometries.push(probeBodyGeo, probePanelGeo);

  const probes: { pivot: THREE.Group; radius: number; speed: number; tilt: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    const probe = new THREE.Group();
    const body = new THREE.Mesh(probeBodyGeo, materials.heroPrimary);
    const panel = new THREE.Mesh(probePanelGeo, materials.heroSecondary);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      materials.accentGlow,
    );
    geometries.push(beacon.geometry);
    beacon.position.y = 0.15;
    probe.add(body, panel, beacon);
    const radius = 1.95 + i * 0.42;
    probe.position.x = radius;
    pivot.add(probe);
    pivot.rotation.z = (i - 1) * 0.48;
    astroGroup.add(pivot);
    probes.push({ pivot, radius, speed: i + 1, tilt: (i - 1) * 0.48 });
  }

  group.add(astroGroup);

  // 6. 400-Star Instanced Deep-Space Field
  const starGeo = new THREE.IcosahedronGeometry(0.045, 0);
  geometries.push(starGeo);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  localMaterials.push(starMat);
  const starCount = 400;
  const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
  stars.frustumCulled = false;

  const starCoords: [number, number, number, number][] = [];
  for (let i = 0; i < starCount; i++) {
    const theta = i * 2.39996;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
    const r = 7.5 + (i % 7) * 1.45;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(r * Math.cos(phi)) + 0.6;
    const z = r * Math.sin(phi) * Math.sin(theta);
    const baseScale = 0.45 + (i % 5) * 0.25;
    starCoords.push([x, y, z, baseScale]);

    _dummy.position.set(x, y, z);
    _dummy.scale.setScalar(baseScale);
    _dummy.updateMatrix();
    stars.setMatrixAt(i, _dummy.matrix);

    _color.setHSL(0.55 + (i % 4) * 0.08, 0.45, 0.78);
    stars.setColorAt(i, _color);
  }
  stars.instanceMatrix.needsUpdate = true;
  if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
  stars.computeBoundingSphere();
  group.add(stars);

  // 7. Contact shadow grounding
  const shadowGeo = new THREE.PlaneGeometry(6.4, 6.4);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  localMaterials.push(shadowMat);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.015;
  group.add(contactShadow);

  return {
    group,
    update: (time, duration, intensity, explode) => {
      const phase = duration > 0 ? (time / duration) * Math.PI * 2 : time;
      const drive = phase * intensity;

      astroGroup.position.y = 2.05 + explode * 0.55;
      ring1.scale.setScalar(1 + explode * 0.25);
      ring2.scale.setScalar(1 + explode * 0.14);

      ring1.rotation.set(drive * 1, drive * 0.5, 0);
      ring2.rotation.set(-drive * 1, 0, drive * 1);
      ring3.rotation.set(drive * 2, -drive * 1, 0);

      outerCrystal.rotation.y = -drive * 1;
      outerCrystal.rotation.x = Math.sin(drive) * 0.4;
      heartMesh.rotation.y = drive * 3;
      heartMesh.scale.setScalar(1 + Math.sin(drive * 4) * 0.1);

      probes.forEach((p, idx) => {
        p.pivot.rotation.y = drive * p.speed + idx * 2.1;
      });

      stars.rotation.y = drive * 0.12;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}
