<script setup lang="ts">
import * as Three from "three";
import TWEEN from 'three/examples/jsm/libs/tween.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {onMounted} from "vue";
onMounted(()=>{
  const container = document.querySelector('.con') as HTMLElement
  let width = container.clientWidth
  let height = container.clientHeight
  const renderer = new Three.WebGLRenderer({
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
  renderer.outputEncoding = Three.sRGBEncoding;

  // 初始化场景
  const scene = new Three.Scene();

// 初始化相机1
  const cameraGroup = new Three.Group();
  scene.add(cameraGroup);
  const camera = new Three.PerspectiveCamera(35, width / height, 1, 100)
  camera.position.set(19, 1.54, -.1);
  cameraGroup.add(camera);

  // 初始化加载管理器
  const loadingManager = new Three.LoadingManager();
  loadingManager.onLoad = () =>{
    new TWEEN.Tween(
        camera.position.set(0,4,2)
    ).to({ x: 0, y: 2.4, z: 5.8 }, 3500)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start()
  }

  // 使用 dracoLoader 加载用blender压缩过的模型
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  dracoLoader.setDecoderConfig({ type: 'js' });
  const loader = new GLTFLoader(loadingManager);
  loader.setDRACOLoader(dracoLoader);

  // 模型加载
  let oldMaterial;
  loader.load('/models/statue.glb', function (gltf) {
  // loader.load('/models/Armor.glb', function (gltf) {
    gltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        oldMaterial = obj.material;
        obj.material = new Three.MeshPhongMaterial({
          shininess: 100
        })
      }
    })
    scene.add(gltf.scene);
    oldMaterial.dispose();
    renderer.renderLists.dispose();
  });


  // 鼠标移动时添加虚拟光标
  const cursor = { x: 0, y: 0 };
  document.addEventListener('mousemove', event => {
    event.preventDefault();
    cursor.x = event.clientX / window.innerWidth - .5;
    cursor.y = event.clientY / window.innerHeight - .5;
    // document.querySelector('.cursor').style.cssText = `left: ${event.clientX}px; top: ${event.clientY}px;`;
  }, false);

// // 基于容器视图禁用渲染器
//   let secondContainer = false;
//   const ob = new IntersectionObserver(payload => {
//     secondContainer = payload[0].intersectionRatio > 0.05;
//   }, { threshold: 0.05 });
//   ob.observe(document.querySelector('.second'));

// 页面重绘动画
  const clock = new Three.Clock()
  let previousTime = 0;
  // 直射光
  const directionLight = new Three.DirectionalLight(0xffffff, .8);
  directionLight.position.set(-100, 0, -100);
  scene.add(directionLight);

// 点光源
  const fillLight = new Three.PointLight(0x88ffee, 2.7, 4, 3);
  fillLight.position.set(30, 3, 1.8);
  scene.add(fillLight);
  const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;
    const parallaxY = cursor.y;
    const parallaxX = cursor.x
    fillLight.position.y -= (parallaxY * 9 + fillLight.position.y - 2) * deltaTime;
    fillLight.position.x += (parallaxX * 8 - fillLight.position.x) * 2 * deltaTime;
    cameraGroup.position.z -= (parallaxY / 3 + cameraGroup.position.z) * 2 * deltaTime;
    cameraGroup.position.x += (parallaxX / 3 - cameraGroup.position.x) * 2 * deltaTime;
    TWEEN.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
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
