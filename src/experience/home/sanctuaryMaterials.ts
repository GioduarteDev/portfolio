import * as THREE from "three";

export const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

export function createSanctuaryMaterials() {
  const pearl = new THREE.MeshPhysicalMaterial({
    name: "pearl architecture", color: "#f1e5df", roughness: 0.43,
    metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.36,
    ior: 1.46, iridescence: 0.07, iridescenceIOR: 1.3,
    iridescenceThicknessRange: [180, 320], envMapIntensity: 0.65,
  });
  const moonstone = new THREE.MeshPhysicalMaterial({
    name: "moonstone inserts", color: "#e7e9f6", roughness: 0.31,
    metalness: 0, transmission: 0.14, thickness: 0.22, ior: 1.42,
    clearcoat: 0.22, clearcoatRoughness: 0.3, iridescence: 0.09,
    envMapIntensity: 0.65,
  });
  const sapphire = new THREE.MeshPhysicalMaterial({
    name: "sapphire crystal", color: "#617fab", roughness: 0.19,
    metalness: 0, transmission: 0.46, thickness: 0.75, ior: 1.62,
    clearcoat: 0.3, clearcoatRoughness: 0.18,
    attenuationColor: "#5b72a3", attenuationDistance: 2.8,
    envMapIntensity: 1.1,
  });
  const amethyst = sapphire.clone();
  amethyst.name = "amethyst crystal";
  amethyst.color.set("#b6a0cf");
  amethyst.attenuationColor.set("#ab8ec3");
  const opal = moonstone.clone();
  opal.name = "opal accents";
  opal.color.set("#f3eeea");
  opal.transmission = 0.28;
  opal.iridescence = 0.16;
  opal.roughness = 0.24;
  return { pearl, moonstone, sapphire, amethyst, opal };
}
