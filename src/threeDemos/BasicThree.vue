<script setup lang="ts">
import * as THREE from "three";
import {onMounted} from "vue";

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
  const camera = new THREE.PerspectiveCamera(35, width / height)
  camera.position.set(0, 1, 5);
  scene.add(camera)

  const tick = () => {
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
