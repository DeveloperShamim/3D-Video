import * as THREE from 'three';
import { StudioMaterialLibrary } from '../materials';
import { ProceduralTextureSet } from '../proceduralTextures';

export interface AnimatedSceneController {
  group: THREE.Group;
  update: (
    time: number,
    duration: number,
    intensity: number,
    explode: number,
    cameraPos?: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

export interface SceneBuildContext {
  materials: StudioMaterialLibrary;
  textures: ProceduralTextureSet;
  isSoftwareGl: boolean;
}

/**
 * Generates an extruded toothed gear geometry with central bore hole.
 */
export function createGearGeometry(
  teeth: number,
  outerRadius: number,
  innerRadius: number,
  thickness: number,
  boreRadius: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const toothHalfAngle = step * 0.22;

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * step;
    const a0 = baseAngle;
    const a1 = baseAngle + step * 0.14;
    const a2 = baseAngle + step * 0.14 + toothHalfAngle;
    const a3 = baseAngle + step * 0.64;

    const x0 = Math.cos(a0) * innerRadius;
    const y0 = Math.sin(a0) * innerRadius;
    if (i === 0) shape.moveTo(x0, y0);
    else shape.lineTo(x0, y0);

    shape.lineTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * innerRadius, Math.sin(a3) * innerRadius);
  }
  shape.closePath();

  if (boreRadius > 0.02) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: Math.min(0.025, thickness * 0.18),
    bevelSize: Math.min(0.02, thickness * 0.14),
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.center();
  return geo;
}
