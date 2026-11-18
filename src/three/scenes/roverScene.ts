import * as THREE from 'three';
import { AnimatedSceneController, SceneBuildContext } from './types';

const _dummy = new THREE.Object3D();

export function createRoverScene(ctx: SceneBuildContext): AnimatedSceneController {
  const { materials, textures } = ctx;
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];

  // 1. Sculpted Undulating Dune Terrain with animated scrolling wave offset
  const terrainGeo = new THREE.PlaneGeometry(18, 18, 72, 72);
  terrainGeo.rotateX(-Math.PI / 2);
  geometries.push(terrainGeo);

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x262932,
    roughness: 0.88,
    metalness: 0.08,
    envMapIntensity: 0.55,
  });
  localMaterials.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Store original X/Z coordinates for procedural dune height evaluation
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const baseX = new Float32Array(posAttr.count);
  const baseZ = new Float32Array(posAttr.count);
  for (let i = 0; i < posAttr.count; i++) {
    baseX[i] = posAttr.getX(i);
    baseZ[i] = posAttr.getZ(i);
  }

  const duneHeight = (x: number, z: number, scroll: number) => {
    const sz = z - scroll;
    const radialFade = Math.max(0, 1 - Math.hypot(x, z) / 9.2);
    const wave =
      Math.sin(sz * 0.55) * 0.28 +
      Math.cos(x * 0.48 + sz * 0.25) * 0.18 +
      Math.sin(sz * 1.15 - x * 0.3) * 0.07;
    return wave * radialFade;
  };

  // 2. 9-Part Composite Planetary Rover Assembly
  const roverGroup = new THREE.Group();

  // Chassis Hull (Extruded beveled profile)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-0.78, 0);
  hullShape.lineTo(0.85, 0);
  hullShape.lineTo(1.05, 0.28);
  hullShape.lineTo(0.65, 0.54);
  hullShape.lineTo(-0.68, 0.54);
  hullShape.lineTo(-0.92, 0.24);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 1.08,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  hullGeo.center();
  // Rotate so length is along Z
  hullGeo.rotateY(Math.PI / 2);
  geometries.push(hullGeo);

  const chassis = new THREE.Mesh(hullGeo, materials.heroPrimary);
  chassis.position.y = 0.68;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  roverGroup.add(chassis);

  // Lower Skid Belly Armor
  const bellyGeo = new THREE.BoxGeometry(0.95, 0.14, 1.72);
  geometries.push(bellyGeo);
  const bellyMesh = new THREE.Mesh(bellyGeo, materials.darkTrim);
  bellyMesh.position.y = 0.38;
  bellyMesh.castShadow = true;
  roverGroup.add(bellyMesh);

  // Solar Wing Decks (Left & Right)
  const wingGeo = new THREE.BoxGeometry(0.82, 0.04, 1.15);
  geometries.push(wingGeo);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x0f1f3d,
    metalness: 0.78,
    roughness: 0.22,
    envMapIntensity: 1.2,
  });
  localMaterials.push(wingMat);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.96, 0.88, -0.1);
  leftWing.rotation.z = 0.08;
  leftWing.castShadow = true;
  roverGroup.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.96, 0.88, -0.1);
  rightWing.rotation.z = -0.08;
  rightWing.castShadow = true;
  roverGroup.add(rightWing);

  // Articulated Camera Mast + Optical Head + Glowing Lens
  const mastGroup = new THREE.Group();
  mastGroup.position.set(0.24, 0.96, 0.56);

  const mastNeckGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.62, 16);
  geometries.push(mastNeckGeo);
  const mastNeck = new THREE.Mesh(mastNeckGeo, materials.heroSecondary);
  mastNeck.position.y = 0.31;
  mastNeck.castShadow = true;
  mastGroup.add(mastNeck);

  const headHousingGeo = new THREE.BoxGeometry(0.36, 0.2, 0.28);
  geometries.push(headHousingGeo);
  const headHousing = new THREE.Mesh(headHousingGeo, materials.heroPrimary);
  headHousing.position.y = 0.66;
  headHousing.castShadow = true;
  mastGroup.add(headHousing);

  const lensGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 24);
  lensGeo.rotateX(Math.PI / 2);
  geometries.push(lensGeo);
  const lensMesh = new THREE.Mesh(lensGeo, materials.accentGlow);
  lensMesh.position.set(0, 0.66, 0.15);
  mastGroup.add(lensMesh);

  roverGroup.add(mastGroup);

  // High-Gain Dish Antenna
  const dishGeo = new THREE.SphereGeometry(0.28, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
  geometries.push(dishGeo);
  const dishMesh = new THREE.Mesh(dishGeo, materials.heroSecondary);
  dishMesh.position.set(-0.32, 1.12, -0.58);
  dishMesh.rotation.x = -Math.PI * 0.35;
  dishMesh.castShadow = true;
  roverGroup.add(dishMesh);

  // 6 Articulated Wheels + Suspension Rocker Arms
  const tireGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 28);
  tireGeo.rotateZ(Math.PI / 2);
  geometries.push(tireGeo);

  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.25, 12);
  hubGeo.rotateZ(Math.PI / 2);
  geometries.push(hubGeo);

  const armGeo = new THREE.BoxGeometry(0.12, 0.08, 0.85);
  geometries.push(armGeo);

  const wheelOffsets: [number, number, number][] = [
    [-0.78, 0.32, 0.82],
    [0.78, 0.32, 0.82],
    [-0.82, 0.32, 0.0],
    [0.82, 0.32, 0.0],
    [-0.78, 0.32, -0.82],
    [0.78, 0.32, -0.82],
  ];

  const wheels: THREE.Group[] = [];
  wheelOffsets.forEach(([wx, wy, wz]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(tireGeo, materials.darkTrim);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, materials.heroPrimary);
    wGroup.add(tire, hub);
    roverGroup.add(wGroup);
    wheels.push(wGroup);
  });

  // Left & right rocker-bogie suspension struts
  const leftStrut = new THREE.Mesh(armGeo, materials.heroSecondary);
  leftStrut.position.set(-0.66, 0.45, 0.25);
  const rightStrut = new THREE.Mesh(armGeo, materials.heroSecondary);
  rightStrut.position.set(0.66, 0.45, 0.25);
  roverGroup.add(leftStrut, rightStrut);

  group.add(roverGroup);

  // 3. Instanced Atmospheric Dust Motes
  const dustGeo = new THREE.PlaneGeometry(0.06, 0.06);
  geometries.push(dustGeo);
  const dustMat = new THREE.MeshBasicMaterial({
    map: textures.particleGlow,
    color: 0xfdba74,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  localMaterials.push(dustMat);
  const dustCount = 80;
  const dustInstanced = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
  dustInstanced.frustumCulled = false;
  group.add(dustInstanced);

  return {
    group,
    update: (time, duration, intensity, explode) => {
      const phase = duration > 0 ? (time / duration) * Math.PI * 2 : time;
      // Integer cycle for smooth looping terrain motion
      const scroll = (phase / (Math.PI * 2)) * 11.42 * intensity;

      // Update dune vertices
      for (let i = 0; i < posAttr.count; i++) {
        const x = baseX[i];
        const z = baseZ[i];
        posAttr.setY(i, duneHeight(x, z, scroll));
      }
      posAttr.needsUpdate = true;
      terrainGeo.computeVertexNormals();

      // Ground rover on center dune height + compute pitch/roll slope
      const hCenter = duneHeight(0, 0, scroll);
      const hFront = duneHeight(0, 0.85, scroll);
      const hBack = duneHeight(0, -0.85, scroll);
      const hLeft = duneHeight(-0.8, 0, scroll);
      const hRight = duneHeight(0.8, 0, scroll);

      roverGroup.position.y = hCenter;
      roverGroup.rotation.x = Math.atan2(hBack - hFront, 1.7);
      roverGroup.rotation.z = Math.atan2(hLeft - hRight, 1.6);

      // Exploded view spreads wings, mast, and chassis upward
      chassis.position.y = 0.68 + explode * 0.45;
      leftWing.position.set(-0.96 - explode * 0.65, 0.88 + explode * 0.55, -0.1);
      rightWing.position.set(0.96 + explode * 0.65, 0.88 + explode * 0.55, -0.1);
      mastGroup.position.y = 0.96 + explode * 0.95;

      // Spin wheels proportionally to terrain scroll
      const wheelRot = scroll / 0.32;
      wheels.forEach((w) => {
        w.rotation.x = wheelRot;
      });

      // Mast scans horizon gently
      mastGroup.rotation.y = Math.sin(phase * 2) * 0.55;
      dishMesh.rotation.z = Math.cos(phase) * 0.25;

      // Drift atmospheric dust backward
      for (let i = 0; i < dustCount; i++) {
        const seed = i * 2.399;
        const x = ((Math.sin(seed * 7.1) * 0.5 + 0.5) - 0.5) * 9.5;
        const rawZ = ((i / dustCount) * 12 - scroll * 0.85) % 12;
        const z = rawZ < -6 ? rawZ + 12 : rawZ > 6 ? rawZ - 12 : rawZ;
        const y = 0.35 + (i % 7) * 0.28 + Math.sin(phase * 2 + seed) * 0.14;
        _dummy.position.set(x, y, z);
        _dummy.rotation.set(0, phase + seed, 0);
        _dummy.scale.setScalar(0.65 + (i % 3) * 0.35);
        _dummy.updateMatrix();
        dustInstanced.setMatrixAt(i, _dummy.matrix);
      }
      dustInstanced.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}
