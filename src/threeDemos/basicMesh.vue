<script setup lang="ts">
import * as THREE from "three";
import {onMounted} from "vue";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

onMounted(()=>{
  const container = document.querySelector('.con') as HTMLElement
  let width = container.clientWidth
  let height = container.clientHeight
  const renderer = new THREE.WebGLRenderer({
    canvas: container,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setSize(width,height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // 定义渲染器是否在渲染每一帧之前自动清除其输出
  renderer.autoClear = true;
  // 定义渲染器的输出编码
  // renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // 初始化场景
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(new THREE.Color('#000000'));
  // scene.fog = new THREE.Fog(new THREE.Color('#000000'), 1, 1000);

  const camera = new THREE.PerspectiveCamera(35, width / height)
  scene.add(camera)
  camera.position.set(20, 100, 450);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const light = new THREE.AmbientLight(0xdeedff, 1.5);
  scene.add(light);

  const SphereMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color('rgba(102,245,30,0.94)'),
    wireframe: true,
  });
  const SphereGeometry = new THREE.SphereGeometry(80, 32, 32);
  const planet = new THREE.Mesh(SphereGeometry, SphereMaterial);
  scene.add(planet);

  // 创建星球轨道环
  const TorusGeometry = new THREE.TorusGeometry(150, 20, 10, 100);
  const TorusMaterial = new THREE.MeshLambertMaterial({
    color: 0x40a9ff,
    wireframe: true
  });
  const ring = new THREE.Mesh(TorusGeometry, TorusMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.rotation.y = -0.1 * (Math.PI / 2);
  scene.add(ring);

  const stars = new THREE.Group();
  for (let i = 0; i < 500; i++) {
    const geometry = new THREE.IcosahedronGeometry(Math.random() * 2, 0);
    const material = new THREE.MeshToonMaterial({ color: 0xeeeeee });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (Math.random() - 0.5) * 700;
    mesh.position.y = (Math.random() - 0.5) * 700;
    mesh.position.z = (Math.random() - 0.5) * 700;
    mesh.rotation.x = Math.random() * 2 * Math.PI;
    mesh.rotation.y = Math.random() * 2 * Math.PI;
    mesh.rotation.z = Math.random() * 2 * Math.PI;
    stars.add(mesh);
  }
  scene.add(stars);



  let rot = 0;
// 动画
  const axis = new THREE.Vector3(0, 0, 1);
  const tick = () => {
    // 更新渲染器
    renderer.render(scene, camera);
    // 给网格模型添加一个转动动画
    rot += Math.random() * 0.8;
    const radian = (rot * Math.PI) / 180;
    // 星球位置动画
    planet && (planet.rotation.y += .005);
    // 星球轨道环位置动画
    ring && ring.rotateOnAxis(axis, Math.PI / 400);
    // 卫星位置动画
    // satellite.position.x = 250 * Math.sin(radian);
    // satellite.position.y = 100 * Math.cos(radian);
    // satellite.position.z = -100 * Math.cos(radian);
    // satellite.rotation.x += 0.005;
    // satellite.rotation.y += 0.005;
    // satellite.rotation.z -= 0.005;
    // 星星动画
    stars.rotation.y += 0.0009;
    stars.rotation.z -= 0.0003;
    // 更新控制器
    controls.update();
    // 页面重绘时调用自身
    window.requestAnimationFrame(tick);
  }
  tick();


})
</script>

<template>
  <canvas class="con"></canvas>
</template>

<style scoped>
.con{
  width: 100%;
  height: 100%;
}
</style>
