import * as THREE from 'three';

export function initScene(canvas) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    30,
    w / h,
    0.1,
    100
  );
  // 相机适配窗口，让小狗完整显示
  camera.position.set(0, 0.8, 6.0);
  camera.lookAt(0, 0.0, 0);

  return { renderer, scene, camera };
}
