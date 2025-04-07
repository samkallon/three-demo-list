<script setup lang="ts">
import * as THREE from "three";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import portalVertexShader from './vertex.glsl?raw';
import portalFragmentShader from './fragment.glsl?raw';

import {onMounted} from "vue";
import {getAssetsFile} from "@/utils.ts";

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
  renderer.autoClear = false;
  // 定义渲染器的输出编码
  // renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // 初始化场景
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height)
  camera.position.set(0, 1, 5);
  scene.add(camera)

  // 添加直射光
  const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.far = 15;
  directionalLight.shadow.mapSize.set(1024, 1024);
  directionalLight.shadow.normalBias = 0.05
  directionalLight.position.set(.25, 3, -1.25);
  scene.add(directionalLight);

// 添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

// 添加镜头控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
// 限制垂直旋转角度
  controls.minPolarAngle = .5;
  controls.maxPolarAngle = 2.5;
// 限制水平旋转角度
  controls.minAzimuthAngle = -1;
  controls.maxAzimuthAngle = 1;

  var options = {
    exposure: 2.8,
    bloomStrength: 2.39,
    bloomThreshold: 0,
    bloomRadius: 0.38,
    color0: [1, 5, 1],
    color1: [2, 20, 2],
    color2: [44, 97, 15],
    color3: [14, 28, 5],
    color4: [255, 255, 255],
    color5: [74, 145, 0],
  };
  const textureLoader = new THREE.TextureLoader();
  const portalGeometry = new THREE.PlaneGeometry(8, 8, 1, 1);
  const portalMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: {
        type: 'f',
        value: 0.0,
      },
      perlinnoise: {
        type: 't',
        value: textureLoader.load(getAssetsFile('imgs/perlinnoise.png')),
      },
      sparknoise: {
        type: 't',
        value: textureLoader.load(getAssetsFile('/imgs/sparknoise.png')),
      },
      waterturbulence: {
        type: 't',
        value: textureLoader.load(getAssetsFile('/imgs/waterturbulence.png')),
      },
      noiseTex: {
        type: 't',
        value: textureLoader.load(getAssetsFile('/imgs/noise.png')),
      },
      color5: {
        value: new THREE.Vector3(...options.color5),
      },
      color4: {
        value: new THREE.Vector3(...options.color4),
      },
      color3: {
        value: new THREE.Vector3(...options.color3),
      },
      color2: {
        value: new THREE.Vector3(...options.color2),
      },
      color1: {
        value: new THREE.Vector3(...options.color1),
      },
      color0: {
        value: new THREE.Vector3(...options.color0),
      },
      resolution: {
        value: new THREE.Vector2(width, height)
      }
    },
    fragmentShader: portalFragmentShader,
    vertexShader: portalVertexShader
  });
  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  portal.layers.set(1);
  scene.add(portal);

  // 更新材质
  const updateShaderMaterial = deltaTime => {
    portalMaterial.uniforms.time.value = deltaTime / 5000;
    portalMaterial.uniforms.color5.value = new THREE.Vector3(...options.color5);
    portalMaterial.uniforms.color4.value = new THREE.Vector3(...options.color4);
    portalMaterial.uniforms.color3.value = new THREE.Vector3(...options.color3);
    portalMaterial.uniforms.color2.value = new THREE.Vector3(...options.color2);
    portalMaterial.uniforms.color1.value = new THREE.Vector3(...options.color1);
    portalMaterial.uniforms.color0.value = new THREE.Vector3(...options.color0);
  }

// 辉光效果
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, .4, .85);
  bloomPass.threshold = options.bloomThreshold;
  bloomPass.strength = options.bloomStrength;
  bloomPass.radius = options.bloomRadius;
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = true;
  bloomComposer.addPass(renderScene);
  bloomComposer.addPass(bloomPass);

// dat.gui
  const gui = new GUI();
  const bloom = gui.addFolder('bloom');
  bloom.add(options, 'bloomStrength', 0.0, 5.0).name('bloomStrength').listen();
  bloom.add(options, 'bloomRadius', .1, 2.0).name('bloomRadius').listen();
  bloom.open();
  const colors = gui.addFolder('Colors');
  colors.addColor(options, 'color0').name('layer0');
  colors.addColor(options, 'color1').name('layer1');
  colors.addColor(options, 'color2').name('layer2');
  colors.addColor(options, 'color3').name('layer3');
  colors.addColor(options, 'color4').name('layer4');
  colors.addColor(options, 'color5').name('layer5');
  colors.open();

  const clock = new THREE.Clock();


  const tick = deltaTime => {
    updateShaderMaterial(deltaTime);

    renderer.clear();
    camera.layers.set(1);
    bloomComposer.render();

    renderer.clearDepth();
    camera.layers.set(0);
    renderer.render(scene, camera);

    const elapsedTime = clock.getElapsedTime()
    const ghost1Angle = elapsedTime * 0.5


    const scale = Math.cos(ghost1Angle) * 2 + 3;
    portal && portal.scale.set(scale, scale, scale);

    // 页面重绘时调用自身
    controls && controls.update();
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
