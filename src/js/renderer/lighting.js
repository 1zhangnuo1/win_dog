import * as THREE from 'three';

export function setupLighting(scene) {
  // 环境光 - 柔和基础照明
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  // 主方向光 - 模拟日光
  const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
  dirLight.position.set(3, 5, 4);
  dirLight.castShadow = false;
  scene.add(dirLight);

  // 补光 - 从侧面补充
  const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  // 底部反射光
  const rimLight = new THREE.DirectionalLight(0xffd4e6, 0.3);
  rimLight.position.set(0, -1, 3);
  scene.add(rimLight);
}
