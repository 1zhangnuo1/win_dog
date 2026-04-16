import * as THREE from 'three';

// 程序化低多边形小狗（备用方案，当没有GLTF模型时使用）
export function createProceduralDog(scene) {
  const dogGroup = new THREE.Group();

  // 材质
  const bodyMat = new THREE.MeshToonMaterial({ color: 0xd4a574 }); // 金棕色
  const darkMat = new THREE.MeshToonMaterial({ color: 0x8b6914 }); // 深棕色
  const noseMat = new THREE.MeshToonMaterial({ color: 0x333333 }); // 黑色鼻子
  const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
  const eyeMat = new THREE.MeshToonMaterial({ color: 0x222222 });
  const tongueMat = new THREE.MeshToonMaterial({ color: 0xff6b8a });
  const collarMat = new THREE.MeshToonMaterial({ color: 0xff4444 });

  // === 身体 ===
  const bodyGeo = new THREE.CapsuleGeometry(0.45, 0.7, 8, 16);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.7, 0);
  body.rotation.z = Math.PI / 2;
  dogGroup.add(body);

  // === 头部 ===
  const headGroup = new THREE.Group();
  headGroup.position.set(0.65, 1.2, 0);
  dogGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.35, 16, 12);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.scale.set(1, 0.95, 0.9);
  headGroup.add(head);

  // 鼻子/嘴部
  const snoutGeo = new THREE.SphereGeometry(0.18, 12, 8);
  const snout = new THREE.Mesh(snoutGeo, darkMat);
  snout.position.set(0.28, -0.08, 0);
  snout.scale.set(1, 0.7, 0.8);
  headGroup.add(snout);

  // 鼻尖
  const noseGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0.43, -0.04, 0);
  headGroup.add(nose);

  // 眼睛
  function createEye(x) {
    const eyeG = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeWhiteMat);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    // 瞳孔朝前（面向相机方向，即+x方向，因为模型朝+x）
    pupil.position.set(0.04, 0, 0);
    eyeG.add(white, pupil);
    eyeG.position.set(0.22, 0.08, x);
    return eyeG;
  }
  const leftEye = createEye(0.15);
  const rightEye = createEye(-0.15);
  headGroup.add(leftEye, rightEye);

  // 耳朵
  function createEar(x, rotZ) {
    const earGeo = new THREE.CapsuleGeometry(0.1, 0.25, 4, 8);
    const ear = new THREE.Mesh(earGeo, darkMat);
    ear.position.set(-0.05, 0.28, x);
    ear.rotation.z = rotZ;
    return ear;
  }
  const leftEar = createEar(0.22, 0.3);
  const rightEar = createEar(-0.22, -0.3);
  headGroup.add(leftEar, rightEar);

  // 舌头
  const tongueGeo = new THREE.CapsuleGeometry(0.04, 0.12, 4, 8);
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0.3, -0.2, 0.05);
  tongue.rotation.z = Math.PI / 2;
  headGroup.add(tongue);

  // 项圈
  const collarGeo = new THREE.TorusGeometry(0.3, 0.03, 8, 16);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0.3, 0.95, 0);
  collar.rotation.x = Math.PI / 2;
  collar.rotation.y = 0.2;
  dogGroup.add(collar);

  // === 腿 ===
  function createLeg(x, z) {
    const legGeo = new THREE.CapsuleGeometry(0.08, 0.35, 4, 8);
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(x, 0.2, z);
    return leg;
  }
  const legs = [
    createLeg(0.3, 0.2),   // 前左
    createLeg(0.3, -0.2),  // 前右
    createLeg(-0.4, 0.2),  // 后左
    createLeg(-0.4, -0.2), // 后右
  ];
  legs.forEach(l => dogGroup.add(l));

  // === 尾巴 ===
  const tailGroup = new THREE.Group();
  tailGroup.position.set(-0.75, 0.95, 0);
  const tailGeo = new THREE.CapsuleGeometry(0.04, 0.3, 4, 8);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.y = 0.15;
  tail.rotation.z = -0.5;
  tailGroup.add(tail);
  dogGroup.add(tailGroup);

  // 整体位置和缩放
  dogGroup.position.set(0, -0.8, 0);
  dogGroup.scale.setScalar(0.9);
  // 让小狗正面朝向相机（原模型脸朝+x，旋转到朝+z）
  dogGroup.rotation.y = Math.PI / 2;

  scene.add(dogGroup);

  return {
    group: dogGroup,
    head: headGroup,
    body,
    tail: tailGroup,
    legs,
    leftEye,
    rightEye,
    leftEar,
    rightEar,
    tongue,
  };
}

// 动画控制
export class DogAnimator {
  constructor(parts) {
    this.parts = parts;
    this.currentAnim = 'idle';
    this._clock = new THREE.Clock();
    this._animTime = 0;
  }

  update() {
    const dt = this._clock.getDelta();
    this._animTime += dt;

    switch (this.currentAnim) {
      case 'idle':
        this._animateIdle();
        break;
      case 'happy':
        this._animateHappy();
        break;
      case 'sad':
        this._animateSad();
        break;
      case 'thinking':
        this._animateThinking();
        break;
      case 'excited':
        this._animateExcited();
        break;
      case 'sleepy':
        this._animateSleepy();
        break;
      case 'curious':
        this._animateCurious();
        break;
      case 'confused':
        this._animateConfused();
        break;
      case 'rollover':
        this._animateRollover();
        break;
      case 'cute':
        this._animateCute();
        break;
      case 'sit':
        this._animateSit();
        break;
      case 'lie':
        this._animateLie();
        break;
      default:
        this._animateIdle();
    }
  }

  play(name) {
    if (this.currentAnim !== name) {
      this._resetPose();
    }
    this.currentAnim = name;
    this._animTime = 0;
  }

  _resetPose() {
    const p = this.parts;
    p.group.position.y = -0.8;
    p.group.rotation.x = 0;
    p.group.rotation.z = 0;
    p.group.scale.setScalar(0.9);
    p.head.rotation.x = 0;
    p.head.rotation.y = 0;
    p.head.rotation.z = 0;
    p.head.position.y = 1.2;
    p.body.scale.set(1, 1, 1);
    p.tail.rotation.x = 0;
    p.tail.rotation.z = 0;
    p.leftEar.rotation.z = 0;
    p.rightEar.rotation.z = 0;
    p.leftEar.rotation.x = 0;
    p.rightEar.rotation.x = 0;
    p.tongue.scale.set(1, 1, 1);
    p.legs.forEach(l => { l.scale.y = 1; });
  }

  _animateIdle() {
    const t = this._animTime;
    const p = this.parts;
    // 呼吸
    p.body.scale.y = 1 + Math.sin(t * 2) * 0.02;
    // 尾巴慢摇
    p.tail.rotation.z = Math.sin(t * 2) * 0.3;
    // 耳朵微动
    p.leftEar.rotation.x = Math.sin(t * 1.5) * 0.05;
    p.rightEar.rotation.x = Math.sin(t * 1.5 + 0.5) * 0.05;
  }

  _animateHappy() {
    const t = this._animTime;
    const p = this.parts;
    // 上下弹跳
    p.group.position.y = -0.4 + Math.abs(Math.sin(t * 5)) * 0.15;
    // 快速摇尾巴
    p.tail.rotation.z = Math.sin(t * 12) * 0.6;
    // 身体微缩放
    p.body.scale.y = 1 + Math.sin(t * 5) * 0.04;
    // 舌头伸出来
    p.tongue.scale.y = 1.3;
  }

  _animateSad() {
    const t = this._animTime;
    const p = this.parts;
    // 头低垂
    p.head.rotation.x = 0.2;
    // 耳朵耷拉
    p.leftEar.rotation.z = 0.6;
    p.rightEar.rotation.z = -0.6;
    // 尾巴垂下
    p.tail.rotation.z = Math.sin(t * 1) * 0.05;
    // 轻微呼吸
    p.body.scale.y = 1 + Math.sin(t * 1.5) * 0.01;
  }

  _animateThinking() {
    const t = this._animTime;
    const p = this.parts;
    // 歪头
    p.head.rotation.z = Math.sin(t * 1.5) * 0.15;
    // 尾巴不摇
    p.tail.rotation.z = 0;
    // 微微点头
    p.head.rotation.x = Math.sin(t * 2) * 0.08;
  }

  _animateExcited() {
    const t = this._animTime;
    const p = this.parts;
    // 快速弹跳
    p.group.position.y = -0.4 + Math.abs(Math.sin(t * 8)) * 0.2;
    // 快速摇尾
    p.tail.rotation.z = Math.sin(t * 15) * 0.8;
    // 耳朵飞起
    p.leftEar.rotation.z = -0.3;
    p.rightEar.rotation.z = 0.3;
    // 身体缩放
    p.body.scale.set(1 + Math.sin(t * 8) * 0.03, 1 + Math.cos(t * 8) * 0.03, 1);
  }

  _animateSleepy() {
    const t = this._animTime;
    const p = this.parts;
    // 缓慢呼吸
    p.body.scale.y = 1 + Math.sin(t * 0.8) * 0.03;
    // 头慢慢下垂
    p.head.rotation.x = 0.15 + Math.sin(t * 0.5) * 0.05;
    // 耳朵放松
    p.leftEar.rotation.z = 0.2;
    p.rightEar.rotation.z = -0.2;
    // 不摇尾巴
    p.tail.rotation.z = 0;
    // 身体微微下沉
    p.group.position.y = -0.45;
  }

  _animateCurious() {
    const t = this._animTime;
    const p = this.parts;
    // 头歪向一侧
    p.head.rotation.z = 0.2;
    // 一只耳朵竖起
    p.leftEar.rotation.z = -0.3;
    p.rightEar.rotation.z = 0.1;
    // 尾巴适度摇
    p.tail.rotation.z = Math.sin(t * 4) * 0.3;
    // 轻微前倾
    p.group.rotation.x = -0.05;
  }

  _animateConfused() {
    const t = this._animTime;
    const p = this.parts;
    // 头左右摆动，像在看这是什么
    p.head.rotation.z = Math.sin(t * 3) * 0.2;
    // 头微微后仰
    p.head.rotation.x = -0.1;
    // 耳朵一前一后
    p.leftEar.rotation.z = Math.sin(t * 3) * 0.3;
    p.rightEar.rotation.z = Math.sin(t * 3 + 1) * 0.3;
    // 尾巴慢摇（不确定）
    p.tail.rotation.z = Math.sin(t * 2) * 0.15;
    // 身体微微缩
    p.group.position.y = -0.8;
  }

  _animateRollover() {
    const t = this._animTime;
    const p = this.parts;
    // 整体绕Z轴翻滚
    p.group.rotation.z = t * 4 % (Math.PI * 2);
    // 翻滚时上下弹跳
    p.group.position.y = -0.8 + Math.abs(Math.sin(t * 4)) * 0.3;
    // 尾巴甩
    p.tail.rotation.z = Math.sin(t * 10) * 0.7;
    // 耳朵飞起来
    p.leftEar.rotation.z = Math.sin(t * 8) * 0.4;
    p.rightEar.rotation.z = Math.sin(t * 8 + 1) * 0.4;
    // 舌头伸出来
    p.tongue.scale.y = 1.5;
    p.tongue.scale.x = 1.3;
  }

  _animateCute() {
    const t = this._animTime;
    const p = this.parts;
    // 头大幅歪向一侧（撒娇经典动作）
    p.head.rotation.z = 0.35 + Math.sin(t * 2) * 0.1;
    // 抬头看着你
    p.head.rotation.x = -0.15;
    // 大眼睛效果 - 身体微微缩
    p.group.scale.setScalar(0.85 + Math.sin(t * 3) * 0.02);
    // 耳朵一高一低（卖萌）
    p.leftEar.rotation.z = -0.5;
    p.rightEar.rotation.z = 0.1;
    // 尾巴慢摇（温顺）
    p.tail.rotation.z = Math.sin(t * 3) * 0.4;
    // 微微前后摇晃
    p.group.position.y = -0.8 + Math.sin(t * 2) * 0.02;
    // 舌头微伸
    p.tongue.scale.y = 1.2;
  }

  _animateSit() {
    const t = this._animTime;
    const p = this.parts;
    // 后腿下沉（身体后倾模拟坐下）
    p.group.rotation.x = 0.15;
    // 身体下沉
    p.group.position.y = -1.0;
    // 头微微上扬
    p.head.rotation.x = -0.1;
    p.head.rotation.z = Math.sin(t * 1.5) * 0.05;
    // 尾巴在地上拍打
    p.tail.rotation.z = Math.sin(t * 3) * 0.2;
    p.tail.rotation.x = -0.3;
    // 耳朵自然竖起
    p.leftEar.rotation.z = -0.1;
    p.rightEar.rotation.z = 0.1;
    // 呼吸
    p.body.scale.y = 1 + Math.sin(t * 1.5) * 0.015;
  }

  _animateLie() {
    const t = this._animTime;
    const p = this.parts;
    // 整体压扁趴下
    p.group.rotation.x = 0.3;
    p.group.position.y = -1.15;
    // 头搁在地上（前爪上）
    p.head.rotation.x = 0.1;
    p.head.position.y = 0.95;
    // 耳朵完全放松耷拉
    p.leftEar.rotation.z = 0.5;
    p.rightEar.rotation.z = -0.5;
    // 尾巴几乎不动，偶尔微摆
    p.tail.rotation.z = Math.sin(t * 0.5) * 0.1;
    // 缓慢呼吸
    p.body.scale.y = 1 + Math.sin(t * 0.8) * 0.02;
    p.body.scale.x = 1.05;
    // 腿收起来
    p.legs.forEach(l => { l.scale.y = 0.7; });
  }

  // 鼠标注视效果
  lookAt(mouseX, mouseY) {
    const p = this.parts;
    const targetRotY = mouseX * 0.3;
    const targetRotX = -mouseY * 0.15;
    p.head.rotation.y += (targetRotY - p.head.rotation.y) * 0.1;
    p.head.rotation.x += (targetRotX - p.head.rotation.x) * 0.1;
  }
}
