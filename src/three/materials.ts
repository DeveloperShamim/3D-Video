import * as THREE from 'three';
import { MATERIAL_FINISHES, MaterialFinishId } from '../types/studio';
import { ProceduralTextureSet } from './proceduralTextures';

export interface StudioMaterialLibrary {
  heroPrimary: THREE.MeshPhysicalMaterial;
  heroSecondary: THREE.MeshStandardMaterial;
  darkTrim: THREE.MeshStandardMaterial;
  accentGlow: THREE.MeshStandardMaterial;
  crystalGlass: THREE.MeshPhysicalMaterial;
  floorSurface: THREE.MeshStandardMaterial;
  dialSurface: THREE.MeshStandardMaterial;
  applyFinish: (finishId: MaterialFinishId) => void;
  dispose: () => void;
}

export function createStudioMaterialLibrary(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): StudioMaterialLibrary {
  const initial = MATERIAL_FINISHES[0];

  const heroPrimary = new THREE.MeshPhysicalMaterial({
    color: initial.color,
    metalness: initial.metalness,
    roughness: initial.roughness,
    roughnessMap: textures.brushedRoughness,
    anisotropy: isSoftwareGl ? 0 : initial.anisotropy,
    clearcoat: initial.clearcoat,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.25,
  });

  const heroSecondary = new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    metalness: 0.72,
    roughness: 0.45,
    envMapIntensity: 1.0,
  });

  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x161920,
    metalness: 0.18,
    roughness: 0.82,
    envMapIntensity: 0.7,
  });

  const accentGlow = new THREE.MeshStandardMaterial({
    color: initial.accentColor,
    emissive: initial.accentColor,
    emissiveIntensity: 1.35,
    metalness: 0.2,
    roughness: 0.25,
  });

  const crystalGlass = new THREE.MeshPhysicalMaterial({
    color: 0xeef6ff,
    metalness: 0.0,
    roughness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: isSoftwareGl ? 0.32 : 1.0,
    ior: 1.56,
    thickness: 1.1,
    attenuationColor: new THREE.Color(0xdbeafe),
    attenuationDistance: 4.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    depthWrite: false,
  });

  const floorSurface = new THREE.MeshStandardMaterial({
    map: textures.floorGrid,
    color: 0x94a3b8,
    metalness: 0.15,
    roughness: 0.78,
    envMapIntensity: 0.6,
  });

  const dialSurface = new THREE.MeshStandardMaterial({
    map: textures.dialFace,
    metalness: 0.3,
    roughness: 0.52,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const applyFinish = (finishId: MaterialFinishId) => {
    const preset = MATERIAL_FINISHES.find((f) => f.id === finishId) ?? MATERIAL_FINISHES[0];
    heroPrimary.color.setHex(preset.color);
    heroPrimary.metalness = preset.metalness;
    heroPrimary.roughness = preset.roughness;
    heroPrimary.anisotropy = isSoftwareGl ? 0 : preset.anisotropy;
    heroPrimary.clearcoat = preset.clearcoat;

    accentGlow.color.setHex(preset.accentColor);
    accentGlow.emissive.setHex(preset.accentColor);
  };

  return {
    heroPrimary,
    heroSecondary,
    darkTrim,
    accentGlow,
    crystalGlass,
    floorSurface,
    dialSurface,
    applyFinish,
    dispose: () => {
      heroPrimary.dispose();
      heroSecondary.dispose();
      darkTrim.dispose();
      accentGlow.dispose();
      crystalGlass.dispose();
      floorSurface.dispose();
      dialSurface.dispose();
    },
  };
}
