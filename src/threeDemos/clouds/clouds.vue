<script setup lang="ts">
import * as THREE from "three";
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { cloudsShader } from "@/threeDemos/clouds/cloudsShader.ts";

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
  const camera = new THREE.PerspectiveCamera(35, width / height, 1, 100)
  scene.add(camera)

  // const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  // const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  // const cube = new THREE.Mesh( geometry, material );
  // scene.add( cube );

  camera.position.z = 100;

  const composer = new EffectComposer( renderer );
  const renderPass = new RenderPass( scene, camera );
  composer.addPass( renderPass );

  // const glitchPass = new GlitchPass();
  // composer.addPass( glitchPass );

  const cloudsPass = new ShaderPass( {
    name: 'cloudsShader',
    uniforms: {
      tDiffuse: { value: null },
      u_camPos: { value: camera.position },
      u_camToWorldMat: { value: camera.matrixWorld },
      u_camInvProjMat: { value: camera.projectionMatrixInverse },
      cloudCoverage: { value: 0.5 },
      iTime: { value: 0 },
    },
    vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
    fragmentShader:`
      uniform vec3 u_camPos;
      uniform mat4 u_camToWorldMat;
      uniform mat4 u_camInvProjMat;
      uniform sampler2D tDiffuse;
      uniform float cloudCoverage;
      uniform float iTime;
      varying vec2 vUv;

      precision highp float;
      uniform sampler2D noiseTexture;
      vec3 skyAmbientColor = vec3(0.705, 0.850, 0.952); //0.219, 0.380, 0.541
      vec3 groundAmbientColor = vec3(0.741, 0.898, 0.823); //0.639, 0.858, 0.721
      float distanceQualityR = 0.00005; // LOD/quality ratio
      float minDistance = 10.0; // avoid cloud in cockpit

      const float PI = 3.14159265359;
     const float TWO_PI = 6.28318530718;
     const float FOUR_PI = 12.5663706144;

     #define CLOUDS_MAX_LOD 1
     #define CLOUDS_MARCH_STEP 100.0 //外部每次步进
     #define CLOUDS_DENS_MARCH_STEP 10.0 //云内每次步进
     #define MAXIMUM_CLOUDS_STEPS 300 //最大步进次数
     #define CLOUDS_MAX_VIEWING_DISTANCE 250000.0

     float saturate (float value) {
       return clamp(value, 0.0, 1.0);
     }

     float isotropic() {
       return 0.07957747154594767; //1.0 / (4.0 * PI);
     }

     float rayleigh(float costh) {
       return (3.0 / (16.0 * PI)) * (1.0 + pow(costh, 2.0));
     }

     float Schlick(float k, float costh) {
       return (1.0 - k * k) / (FOUR_PI * pow(1.0 - k * costh, 2.0));
     }
     float g = 0.9;

     float hash(float p) {
       p = fract(p * .1031);
       p *= p + 33.33;
       p *= p + p;
       return fract(p);
     }

     //噪声
     float noise(in vec3 x) {
       vec3 p = floor(x);
       vec3 f = fract(x);
       f = f*f*(3.0 - 2.0*f);
       float n = p.x + p.y*157.0 + 113.0*p.z;
       return mix(mix(mix( hash(n+ 0.0), hash(n+ 1.0),f.x),
       mix( hash(n+157.0), hash(n+158.0),f.x),f.y),
       mix(mix( hash(n+113.0), hash(n+114.0),f.x),
       mix(hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
     }

     //云的密度
     float cloudDensity(vec3 p, vec3 wind, int lod, inout float heightRatio) {
        float finalCoverage = cloudCoverage;
        if (finalCoverage <= 0.1) {
          return 0.0;
        }
        float height = p.z;
        heightRatio = height / 1000.;
        float positionResolution = 0.02;
        p = p * positionResolution + wind;
        float shape = noise(p * 0.3);
        float shapeHeight = noise(p * 0.05);
        float bn = 0.50000 * noise(p); p = p * 2.0;
        if( lod>=1 ) {
          bn += 0.20000 * noise(p); p = p * 2.11;
        }
        float cumuloNimbus = saturate((shapeHeight - 0.5) * 2.0);
        cumuloNimbus *= saturate(1.0 - pow(heightRatio - 0.5, 2.0) * 4.0);
        float cumulus = saturate(1.0 - pow(heightRatio - 0.25, 2.0) * 25.0) * shapeHeight;
        float stratoCumulus = saturate(1.0 - pow(heightRatio - 0.12, 2.0) * 60.0) * (1.0 - shapeHeight);
        float dens = saturate(stratoCumulus + cumulus + cumuloNimbus) * 2.0 * finalCoverage;
        dens -= 1.0 - shape;
        dens -= bn;
        return clamp(dens, 0.0, 1.0);
     }

      // 边界框最小值， 边界框最大值， 相机位置， 光线方向倒数
       vec4 rayBoxDst(vec3 boundsMin, vec3 boundsMax,  vec3 rayOrigin, vec3 invRaydir)
       {
           vec3 t0 = (boundsMin - rayOrigin) * invRaydir;
           vec3 t1 = (boundsMax - rayOrigin) * invRaydir;
           vec3 tmin = min(t0, t1);
           vec3 tmax = max(t0, t1);

           float dstA = max(max(tmin.x, tmin.y), tmin.z); //进入点
           float dstB = min(tmax.x, min(tmax.y, tmax.z)); //出去点

           float dstToBox = max(0., dstA);
           float dstInsideBox = max(0., dstB - dstToBox);
           return vec4(dstToBox, dstInsideBox,dstA,dstB);
       }

       vec4 calculate_clouds(
       vec3 start,
       vec3 dir,
       float maxDistance,
       vec3 light_dir,
       vec3 wind,
       vec2 bounds
       ) {
         vec4 cloud = vec4(0.0, 0.0, 0.0, 1.0);
         float startHeight = length(start) ;
         float absoluteMaxDistance = CLOUDS_MAX_VIEWING_DISTANCE;
         float tmin = bounds.x;
         float tmax = bounds.x+bounds.y;

         tmin = max(tmin, minDistance);
         tmax = min(tmax, absoluteMaxDistance);

         //if (tmax < tmin) return vec4(0.0); // object obstruction

         float rayLength = tmax - tmin;//步进总距离
         float longMarchStep = rayLength / float(MAXIMUM_CLOUDS_STEPS);//步进距离/步进次数=每次步进的距离
         longMarchStep = max(longMarchStep, CLOUDS_MARCH_STEP);//每次步进多少

         float shortMarchStep = CLOUDS_DENS_MARCH_STEP;
         float numberApproachSteps = (CLOUDS_MARCH_STEP / CLOUDS_DENS_MARCH_STEP) * 2.0;
         float distance = tmin;
         float dens = 0.0;
         float marchStep;

         float lastDensity;
         float kInScattering = 0.99;
         float dotLightRay = dot(dir, light_dir);
         float inScattering = Schlick(kInScattering, dotLightRay);
         float outScattering = isotropic();
         float sunScatteringPhase = mix(outScattering, inScattering, dotLightRay);
         float ambientScatteringPhase = isotropic();
         bool inCloud = false;
         float stepsBeforeExitingCloud = 0.0;

         for (int i = 0; i < MAXIMUM_CLOUDS_STEPS; i++) {
           vec3 position = start + dir * distance;
           int qualityRatio = int(distance * distanceQualityR);
           int lod = CLOUDS_MAX_LOD - qualityRatio;
           float heightRatio;

           if (inCloud == true) {
             marchStep = shortMarchStep;
           } else {
             marchStep = longMarchStep;
             lod = 0;
           }

           dens = cloudDensity(position, wind, lod, heightRatio);

           if(dens > 0.01) {
             if (inCloud != true) {
               inCloud = true;
               stepsBeforeExitingCloud = numberApproachSteps;
               distance = clamp(distance - CLOUDS_MARCH_STEP, tmin, tmax); // 第一次进入云 回退一步
               continue;
             }

             float deltaDens = clamp((dens - lastDensity) * 10.0, -1.0, 1.0);
             float lighting = (abs(deltaDens - dotLightRay) / 2.0) * clamp((heightRatio - 0.02) * 20.0, 0.5, 1.0);
             lastDensity = dens;
             float scatteringCoeff = 0.15 * dens;
             float extinctionCoeff = 0.01 * dens;
             cloud.a *= exp(-extinctionCoeff * marchStep);
             float sunIntensityAtSurface = clamp(0.2 - dens, 0.0, 1.0);
             vec3 czm_lightColor = vec3(1.0, 1.0, 1.0);
             vec3 sunLight = lighting * czm_lightColor * sunIntensityAtSurface * czm_lightColor.z;
             vec3 ambientSun = czm_lightColor * sunIntensityAtSurface * czm_lightColor.z * isotropic();
             vec3 skyAmbientLight = (skyAmbientColor * czm_lightColor.z + ambientSun);
             vec3 groundAmbientLight = (groundAmbientColor * czm_lightColor.z * 0.5 + ambientSun);
             vec3 ambientLight = mix(groundAmbientLight, skyAmbientLight, heightRatio);
             vec3 stepScattering = scatteringCoeff * marchStep * (sunScatteringPhase * sunLight + ambientScatteringPhase * ambientLight);
             cloud.rgb += cloud.a * stepScattering;

             if (cloud.a < 0.01) {
               cloud.a = 0.0;
               break;
             }
           } else {
             if (stepsBeforeExitingCloud > 0.0) {
               stepsBeforeExitingCloud--;
             }
             else {
               inCloud = false;
             }
           }

           distance += marchStep;

           //步进距离超出总的距离 退出
           if (distance > tmax) {
              break;
           }
         }
         cloud.a = (1.0 - cloud.a);
         return cloud;
       }

      void main() {
        gl_FragColor = texture2D( tDiffuse, vUv );
        vec3 ro = u_camPos;
        vec3 rd = (u_camInvProjMat * vec4(vUv*2.0 - 1.0, 0.0, 1.0)).xyz;
        rd = (u_camToWorldMat * vec4(rd, 0)).xyz;
        rd = normalize(rd);

        vec3 dim= vec3(10.,10.,10.);//盒子长宽高
        vec3 box_min = vec3(0.) - dim / 2.;
        vec3 box_max = vec3(0.) + dim / 2.;

        // 判断是否在盒子内
        vec4 bounds =rayBoxDst(box_min,box_max,ro,1.0 / rd);
        bounds.x = max( bounds.x, 0.0 );
        if ( bounds.z > bounds.w ) return; //盒子外

        vec3 p = ro + bounds.x * rd; //射线起点
        // p.z+=50.;


        vec3 wind = vec3(100.,0.,0.) * iTime * 0.0002;
        vec4 clouds = calculate_clouds(
          ro, // the position of the camera
          rd, // the camera vector (ray direction of this pixel)
          bounds.y, // max dist, essentially the scene depth
          vec3(1.0,1.0,1.0), // light direction
          wind,
          bounds.xy
        );
        clouds.rgb *= 3.0;
        vec4 color=gl_FragColor;
        color = mix(color, clouds, clouds.a * clouds.a );

        float exposure = 1.2;
        color = vec4(1.0 - exp(-exposure * color));
        gl_FragColor = color;
        // gl_FragColor = vec4(1.0,0.0,0.0,1.0);
      }
    `
  } );
  composer.addPass( cloudsPass)

  const outputPass = new OutputPass();
  composer.addPass( outputPass );

  const tick = () => {
    composer.render();
    requestAnimationFrame(tick);
    cloudsShader.uniforms.iTime.value += 0.01;
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
