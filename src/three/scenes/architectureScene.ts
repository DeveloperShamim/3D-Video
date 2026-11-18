import * as THREE from 'three';
import { AnimatedSceneController, SceneBuildContext } from './types';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function createArchitectureScene(ctx: SceneBuildContext): AnimatedSceneController {
  const { materials, textures } = ctx;
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];

  // 1. Stepped Pavilion Plinth Base
  const stageGeo = new THREE.CylinderGeometry(4.4, 4.65, 0.16, 64);
  geometries.push(stageGeo);
  const stageMesh = new THREE.Mesh(stageGeo, materials.darkTrim);
  stageMesh.position.y = 0.08;
  stageMesh.receiveShadow = true;
  group.add(stageMesh);

  // 2. 144 Instanced Kinetic Monolith Pillars (12x12 grid)
  const gridDim = 12;
  const count = gridDim * gridDim;
  const pillarGeo = new THREE.BoxGeometry(0.32, 1.0, 0.32);
  // Shift pivot to bottom so scaling Y keeps bottoms flush
  pillarGeo.translate(0, 0.5, 0);
  geometries.push(pillarGeo);

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.65,
    roughness: 0.34,
    envMapIntensity: 1.1,
  });
  localMaterials.push(pillarMat);

  const monoliths = new THREE.InstancedMesh(pillarGeo, pillarMat, count);
  monoliths.castShadow = true;
  monoliths.receiveShadow = true;
  monoliths.frustumCulled = false;

  for (let i = 0; i < count; i++) {
    const gx = i % gridDim;
    const gz = Math.floor(i / gridDim);
    const dist = Math.hypot(gx - 5.5, gz - 5.5) / 7.8;
    _color.setHSL(0.58 - dist * 0.45, 0.25, 0.32 + (1 - dist) * 0.28);
    monoliths.setColorAt(i, _color);
  }
  if (monoliths.instanceColor) monoliths.instanceColor.needsUpdate = true;
  group.add(monoliths);

  // 3. Central Levitating Kinetic Spire (7-part composite group)
  const spireGroup = new THREE.Group();
  spireGroup.position.y = 1.95;

  const coreCrystalGeo = new THREE.OctahedronGeometry(0.62, 0);
  geometries.push(coreCrystalGeo);
  const coreCrystal = new THREE.Mesh(coreCrystalGeo, materials.heroPrimary);
  coreCrystal.scale.set(1, 1.65, 1);
  coreCrystal.castShadow = true;
  spireGroup.add(coreCrystal);

  const innerCoreGeo = new THREE.IcosahedronGeometry(0.32, 1);
  geometries.push(innerCoreGeo);
  const innerCore = new THREE.Mesh(innerCoreGeo, materials.accentGlow);
  spireGroup.add(innerCore);

  // Three nested aperture rings
  const ringGeos = [
    new THREE.TorusGeometry(1.15, 0.045, 18, 64),
    new THREE.TorusGeometry(1.52, 0.038, 18, 64),
    new THREE.TorusGeometry(1.88, 0.032, 18, 64),
  ];
  ringGeos.forEach((g) => geometries.push(g));

  const ringMeshes = ringGeos.map((geo, idx) => {
    const mesh = new THREE.Mesh(
      geo,
      idx % 2 === 0 ? materials.heroPrimary : materials.heroSecondary,
    );
    mesh.castShadow = true;
    spireGroup.add(mesh);
    return mesh;
  });

  // 4. Glass Halo Shroud around spire
  const shroudGeo = new THREE.CylinderGeometry(0.95, 0.95, 1.45, 32, 1, true);
  geometries.push(shroudGeo);
  const shroudMesh = new THREE.Mesh(shroudGeo, materials.crystalGlass);
  shroudMesh.renderOrder = 8;
  spireGroup.add(shroudMesh);

  group.add(spireGroup);

  // 5. Contact shadow grounding
  const shadowGeo = new THREE.PlaneGeometry(10.5, 10.5);
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

      const spacing = 0.54 + explode * 0.14;
      const offset = ((gridDim - 1) * spacing) / 2;

      for (let i = 0; i < count; i++) {
        const gx = i % gridDim;
        const gz = Math.floor(i / gridDim);
        const x = gx * spacing - offset;
        const z = gz * spacing - offset;
        const dist = Math.hypot(x, z);

        // Leave central courtyard recessed around the spire
        const centerClear = THREE.MathUtils.smoothstep(dist, 0.8, 2.2);
        const wave =
          Math.sin(dist * 1.45 - drive * 2.0) * 0.55 +
          Math.cos(x * 0.8 + drive) * 0.25 +
          0.95;
        const h = Math.max(0.18, wave * (0.35 + centerClear * 0.95));

        _dummy.position.set(x, 0.16, z);
        _dummy.rotation.set(0, Math.sin(drive + dist * 0.4) * 0.08 * explode, 0);
        _dummy.scale.set(1, h, 1);
        _dummy.updateMatrix();
        monoliths.setMatrixAt(i, _dummy.matrix);
      }
      monoliths.instanceMatrix.needsUpdate = true;

      // Animate central kinetic spire
      spireGroup.position.y = 2.05 + Math.sin(drive * 2) * 0.18 + explode * 0.8;
      coreCrystal.rotation.y = drive * 1;
      innerCore.rotation.y = -drive * 2;
      shroudMesh.rotation.y = drive * 0.5;
      shroudMesh.scale.setScalar(1 + explode * 0.35);

      ringMeshes[0].rotation.set(drive * 1, drive * 0.5, 0);
      ringMeshes[1].rotation.set(-drive * 0.5, drive * 1, Math.PI / 4);
      ringMeshes[2].rotation.set(Math.PI / 3, -drive * 1, drive * 1);
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}
