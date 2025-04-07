/**
 * Full-screen textured quad shader
 */

const cloudsShader = {

    name: 'cloudsShader',

    uniforms: {

        'tDiffuse': { value: null },
        tDepth: { value: null },
        cameraNear: { value: 1 },
        cameraFar: { value: 100 },
        'cloudCoverage': { value: 0.5 },
        iTime: { value: 0 },
    },

    vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

    fragmentShader: /* glsl */`

		uniform sampler2D tDiffuse;
		uniform sampler2D tDepth;
		uniform float cameraNear;
        uniform float cameraFar;
		uniform float cloudCoverage;
		uniform float iTime;

		varying vec2 vUv;

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

     precision highp float;
     uniform sampler2D noiseTexture;
     vec3 skyAmbientColor = vec3(0.705, 0.850, 0.952); //0.219, 0.380, 0.541
     vec3 groundAmbientColor = vec3(0.741, 0.898, 0.823); //0.639, 0.858, 0.721
     float distanceQualityR = 0.00005; // LOD/quality ratio
     float minDistance = 10.0; // avoid cloud in cockpit

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
           // vec3 sunLight = lighting * czm_lightColor * sunIntensityAtSurface * czm_lightColor.z;
           // vec3 ambientSun = czm_lightColor * sunIntensityAtSurface * czm_lightColor.z * isotropic();
           // vec3 skyAmbientLight = (skyAmbientColor * czm_lightColor.z + ambientSun);
           // vec3 groundAmbientLight = (groundAmbientColor * czm_lightColor.z * 0.5 + ambientSun);
           // vec3 ambientLight = mix(groundAmbientLight, skyAmbientLight, heightRatio);
           // vec3 stepScattering = scatteringCoeff * marchStep * (sunScatteringPhase * sunLight + ambientScatteringPhase * ambientLight);
           // cloud.rgb += cloud.a * stepScattering;

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
     
     float readDepth( sampler2D depthSampler, vec2 coord ) {
        vec4 fragCoord = texture2D( depthSampler, coord );
      
        float logDepthBufFC = 2.0 / ( log( cameraFar + 1.0 ) / log(2.0) );
        float invViewZ = exp2(fragCoord.x / (logDepthBufFC * 0.5)) - 1.0;
        //return invViewZ;
        return viewZToOrthographicDepth( -invViewZ, cameraNear, cameraFar );
        }


    void main(){
        gl_FragColor = texture2D( tDiffuse, vUv );
        float depth = readDepth(tDepth, vUv);
        // vec4 rawDepthColor = texture(depthTexture, v_textureCoordinates);
        // float depth = czm_unpackDepth(rawDepthColor);
        // if (depth == 0.0) {
        //   depth = 1.0;
        // }
        // // 获取眼睛坐标
        // vec4 eyeCoordinate4 = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
        // vec3 eyeCoordinate3 = eyeCoordinate4.xyz/eyeCoordinate4.w;
        // // 获取世界坐标
        // vec4 worldCoordinate4 = czm_inverseView * vec4(eyeCoordinate3,1.) ;
        // vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;
        //
        // // 将世界坐标转换到本地坐标，即盒子中心为原点的本地坐标系
        // vec4 worldPos= inverse * vec4(worldCoordinate,1.);
        // vec4 cameraPos= inverse * vec4(czm_viewerPositionWC,1.);
        //
        // // 获取相机到每个像素的射线方向
        // vec3 vDirection=worldPos.xyz-cameraPos.xyz;//方向
        // vec3 rayDir = normalize( vDirection );

        vec3 dim= vec3(10.,10.,10.);//盒子长宽高
        vec3 box_min = vec3(0.) - dim / 2.;
        vec3 box_max = vec3(0.) + dim / 2.;
        
         // 相机设置
        vec3 cameraOrigin = vec3(0.0, 0.0, -100.0);
        vec3 cameraTarget = vec3(cos(iTime) + sin(iTime / 2.0) * 10.0, exp(sin(iTime)) * 2.0, 3.0 + iTime * 4.0);
        vec3 upDirection = vec3(0.0, 1.0, 0.0);
        vec3 cameraDir = normalize(cameraTarget - cameraOrigin);
        vec3 cameraRight = normalize(cross(upDirection, cameraOrigin));
        vec3 cameraUp = cross(cameraDir, cameraRight);
        vec3 rayDirection = normalize(cameraRight * vUv.x + cameraUp * vUv.y + cameraDir);


        // 判断是否在盒子内
        vec4 bounds =rayBoxDst(box_min,box_max,cameraOrigin,1.0 / rayDirection);
        bounds.x = max( bounds.x, 0.0 );
        if ( bounds.z > bounds.w ) return; //盒子外

        // vec3 p = cameraPos.xyz + bounds.x * rayDir; //射线起点
        // p.z+=50.;
        // vec3 posToEye = worldPos.xyz - cameraPos.xyz;
        // vec3 direction = normalize(posToEye);
        // // 太阳光照方向
        // vec3 lightDirection = normalize(czm_sunPositionWC);
        // float distance = length(posToEye);
        //
        //
        // vec3 wind = vec3(100.,0.,0.) * czm_frameNumber * 0.0002;
        // vec4 clouds = calculate_clouds(
        //   cameraPos.xyz, // the position of the camera
        //   direction, // the camera vector (ray direction of this pixel)
        //   distance, // max dist, essentially the scene depth
        //   lightDirection, // light direction
        //   wind,
        //   bounds.xy
        // );
        // clouds.rgb *= 3.0;
        // vec4 color=gl_FragColor;
        // color = mix(color, clouds, clouds.a * clouds.a );
        //
        // float exposure = 1.2;
        // color = vec4(1.0 - exp(-exposure * color));
        // gl_FragColor = color;
        gl_FragColor = vec4(1.0,0.0,0.0,1.0);
      }
		
		`

};

export { cloudsShader };
