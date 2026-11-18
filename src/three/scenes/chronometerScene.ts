import * as THREE from 'three';
import { AnimatedSceneController, SceneBuildContext, createGearGeometry } from './types';

const _dummy = new THREE.Object3D();

export function createChronometerScene(ctx: SceneBuildContext): AnimatedSceneController {
  const { materials, textures } = ctx;
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];

  // 1. Machined Plinth Base (grounded at y = 0)
  const baseProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(2.35, 0),
    new THREE.Vector2(2.35, 0.14),
    new THREE.Vector2(2.12, 0.24),
    new THREE.Vector2(1.95, 0.24),
    new THREE.Vector2(1.95, 0.34),
    new THREE.Vector2(0, 0.34),
  ];
  const plinthGeo = new THREE.LatheGeometry(baseProfile, 64);
  geometries.push(plinthGeo);
  const plinthMesh = new THREE.Mesh(plinthGeo, materials.darkTrim);
  plinthMesh.receiveShadow = true;
  plinthMesh.castShadow = true;
  group.add(plinthMesh);

  // 2. Calibrated Dial Plate (seated slightly above plinth to avoid z-fighting)
  const dialGeo = new THREE.CylinderGeometry(1.88, 1.88, 0.04, 64);
  geometries.push(dialGeo);
  const dialMesh = new THREE.Mesh(dialGeo, materials.dialSurface);
  dialMesh.position.y = 0.36;
  dialMesh.receiveShadow = true;
  group.add(dialMesh);

  // 3. Beveled Brass Chapter Bezel Ring
  const bezelGeo = new THREE.TorusGeometry(1.94, 0.085, 24, 72);
  geometries.push(bezelGeo);
  const bezelMesh = new THREE.Mesh(bezelGeo, materials.heroPrimary);
  bezelMesh.rotation.x = Math.PI / 2;
  bezelMesh.position.y = 0.38;
  bezelMesh.castShadow = true;
  group.add(bezelMesh);

  // 4. Support Bridge Pillars (3 radial columns)
  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.25, 20);
  geometries.push(pillarGeo);
  const pillarsGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const pillar = new THREE.Mesh(pillarGeo, materials.heroSecondary);
    pillar.position.set(Math.cos(angle) * 1.55, 1.0, Math.sin(angle) * 1.55);
    pillar.castShadow = true;
    pillarsGroup.add(pillar);
  }
  group.add(pillarsGroup);

  // 5. Lower Main Drive Gear
  const mainGearGeo = createGearGeometry(24, 1.38, 1.18, 0.1, 0.42);
  geometries.push(mainGearGeo);
  const mainGear = new THREE.Mesh(mainGearGeo, materials.heroPrimary);
  mainGear.rotation.x = Math.PI / 2;
  mainGear.position.y = 0.62;
  mainGear.castShadow = true;
  mainGear.receiveShadow = true;
  group.add(mainGear);

  // 6. Planetary Escapement Pinion Gears (3 orbiting)
  const pinionGeo = createGearGeometry(12, 0.44, 0.34, 0.12, 0.1);
  geometries.push(pinionGeo);
  const pinionGroup = new THREE.Group();
  pinionGroup.position.y = 0.85;
  const pinions: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const pinion = new THREE.Mesh(pinionGeo, materials.heroSecondary);
    pinion.rotation.x = Math.PI / 2;
    pinion.position.set(Math.cos(a) * 0.92, 0, Math.sin(a) * 0.92);
    pinion.castShadow = true;
    pinionGroup.add(pinion);
    pinions.push(pinion);
  }
  group.add(pinionGroup);

  // 7. Central Tourbillon Gimbal Assembly (Outer + Inner rings + Oscillating Core)
  const gimbalAssembly = new THREE.Group();
  gimbalAssembly.position.y = 1.72;

  const outerGimbalGeo = new THREE.TorusGeometry(1.18, 0.055, 20, 72);
  geometries.push(outerGimbalGeo);
  const outerGimbal = new THREE.Mesh(outerGimbalGeo, materials.heroPrimary);
  outerGimbal.castShadow = true;
  gimbalAssembly.add(outerGimbal);

  const innerGimbalGeo = new THREE.TorusGeometry(0.86, 0.045, 20, 64);
  geometries.push(innerGimbalGeo);
  const innerGimbal = new THREE.Mesh(innerGimbalGeo, materials.heroSecondary);
  innerGimbal.castShadow = true;
  gimbalAssembly.add(innerGimbal);

  const balanceWheelGeo = createGearGeometry(16, 0.56, 0.46, 0.08, 0.18);
  geometries.push(balanceWheelGeo);
  const balanceWheel = new THREE.Mesh(balanceWheelGeo, materials.heroPrimary);
  balanceWheel.castShadow = true;
  gimbalAssembly.add(balanceWheel);

  const jewelCoreGeo = new THREE.OctahedronGeometry(0.24, 1);
  geometries.push(jewelCoreGeo);
  const jewelCore = new THREE.Mesh(jewelCoreGeo, materials.accentGlow);
  gimbalAssembly.add(jewelCore);

  group.add(gimbalAssembly);

  // 8. Sapphire Crystal Dome Cover (exploded upward when explode > 0)
  const domeGeo = new THREE.SphereGeometry(1.82, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
  geometries.push(domeGeo);
  const domeMesh = new THREE.Mesh(domeGeo, materials.crystalGlass);
  domeMesh.position.y = 0.42;
  domeMesh.renderOrder = 10;
  group.add(domeMesh);

  // 9. Instanced Precision Studs around Bezel (24 fasteners)
  const studGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.07, 12);
  geometries.push(studGeo);
  const studCount = 24;
  const studInstanced = new THREE.InstancedMesh(studGeo, materials.heroSecondary, studCount);
  for (let i = 0; i < studCount; i++) {
    const a = (i / studCount) * Math.PI * 2;
    _dummy.position.set(Math.cos(a) * 1.94, 0.46, Math.sin(a) * 1.94);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    studInstanced.setMatrixAt(i, _dummy.matrix);
  }
  studInstanced.instanceMatrix.needsUpdate = true;
  studInstanced.computeBoundingSphere();
  group.add(studInstanced);

  // 10. Instanced Ambient Dust Motes orbiting the dome
  const moteGeo = new THREE.PlaneGeometry(0.055, 0.055);
  geometries.push(moteGeo);
  const moteMat = new THREE.MeshBasicMaterial({
    map: textures.particleGlow,
    color: 0xfde68a,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  localMaterials.push(moteMat);
  const moteCount = 60;
  const motes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  motes.frustumCulled = false;
  group.add(motes);

  // Contact shadow grounding plane
  const shadowGeo = new THREE.PlaneGeometry(6.8, 6.8);
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
      const norm = duration > 0 ? (time / duration) * Math.PI * 2 : time;
      const drive = norm * intensity;

      // Exploded view offsets (smoothly separates mechanical layers vertically)
      mainGear.position.y = 0.62 + explode * 0.35;
      pinionGroup.position.y = 0.85 + explode * 0.85;
      gimbalAssembly.position.y = 1.72 + explode * 1.35;
      domeMesh.position.y = 0.42 + explode * 2.25;
      bezelMesh.position.y = 0.38 + explode * 0.15;

      // Synchronized mechanical rotations (integer multiples for seamless looping!)
      mainGear.rotation.z = drive * 1;
      pinionGroup.rotation.y = -drive * 1;
      pinions.forEach((p, idx) => {
        p.rotation.z = drive * 3 + idx * (Math.PI / 3);
      });

      outerGimbal.rotation.y = drive * 1;
      outerGimbal.rotation.x = Math.sin(drive) * 0.45;
      innerGimbal.rotation.z = -drive * 2;
      innerGimbal.rotation.y = Math.cos(drive) * 0.6;
      balanceWheel.rotation.z = Math.sin(drive * 4) * 1.35;
      jewelCore.rotation.y = drive * 3;
      jewelCore.rotation.x = drive * 2;
      const coreScale = 1 + Math.sin(drive * 4) * 0.08;
      jewelCore.scale.setScalar(coreScale);

      // Update orbiting motes
      for (let i = 0; i < moteCount; i++) {
        const seed = i * 1.618;
        const radius = 2.1 + (i % 5) * 0.36;
        const angle = drive * (0.4 + (i % 3) * 0.2) + seed;
        const height = 0.45 + ((i * 0.37) % 2.6) + Math.sin(drive * 2 + seed) * 0.25;
        _dummy.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        );
        _dummy.rotation.set(0, -angle, 0);
        const s = 0.6 + Math.sin(drive * 3 + seed) * 0.35;
        _dummy.scale.setScalar(s);
        _dummy.updateMatrix();
        motes.setMatrixAt(i, _dummy.matrix);
      }
      motes.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}
