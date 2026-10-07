<script setup>
import { gsap } from 'gsap'
import * as THREE from 'three'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

// --- PROPS ---
const props = defineProps({
  islandTheme: {
    type: String,
    required: true,
    default: 'water',
  },
  dangerLevel: {
    type: Number,
    required: true,
    default: 0,
  },
  backgroundImage: {
    type: String,
    required: true,
  },
  trashTextures: {
    type: Array,
    default: () => [],
  },
})

const canvasRef = ref(null)

// --- THREE.JS DEĞİŞKENLERİ ---
let scene, camera, renderer, animationFrameId, clock
let activeEffect = null
const textureLoader = new THREE.TextureLoader()

// --- SHADER KODLARI ---
const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`

// --- GÜNCELLENMİŞ SU SHADER'I (HİBRİT VERSİYON) ---
const waterFragmentShader = `
    varying vec2 vUv;
    uniform float u_time;
    uniform float u_level; // 0.0'dan 1.0'a su seviyesi

    // Simplex Noise function (snoise)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
        // --- YENİ SU SEVİYESİ VE DALGA HESAPLAMASI ---
        // DEĞİŞİKLİK: max_height değeri 1.0 olarak güncellendi.
        float max_height = 1.0;
        float water_height = u_level * max_height;

        float wave_freq = 20.0;
        float wave_amp = 0.008;
        float wave_speed = 0.7;
        float wave = snoise(vec2(vUv.x * wave_freq, u_time * wave_speed)) * wave_amp;

        float surface_y = water_height + wave;

        if (vUv.y > surface_y) {
            discard;
        }

        // --- ORİJİNAL İÇ DOKU VE RENK ---
        vec2 uv = vUv;
        float time = u_time * 0.3;

        // Su içindeki bozulmalar (orijinaldeki gibi)
        float noise_freq_1 = 2.0;
        float noise_amp_1 = 0.02;
        float noise_flow_1 = 0.5;
        uv.x += snoise(vec2(uv.x * noise_freq_1, uv.y * noise_freq_1) + time * noise_flow_1) * noise_amp_1;

        float noise_freq_2 = 6.0;
        float noise_amp_2 = 0.01;
        float noise_flow_2 = -0.8;
        uv.y += snoise(vec2(uv.x * noise_freq_2, uv.y * noise_freq_2) + time * noise_flow_2) * noise_amp_2;

        // Renk gradyanı (orijinaldeki gibi)
        vec3 deep_color = vec3(0.0, 0.5, 0.6);      // koyu turkuaz
        vec3 shallow_color = vec3(0.4, 1.0, 0.9);   // açık turkuaz

        // Derinlik faktörü, suyun gerçek yüksekliğine göre hesaplanır
        float depth_factor = vUv.y / (water_height + 0.001); // 0'a bölme hatasını önle
        vec3 water_color = mix(deep_color, shallow_color, depth_factor * depth_factor);

        // Köpük efekti (yüzeyde, yeni dalga ile uyumlu)
        float foam_thickness = 0.03;
        float foam_noise_freq = 15.0;
        float foam_noise_flow = 1.2;
        float foam_noise = snoise(vec2(vUv.x * foam_noise_freq, surface_y * 10.0) + u_time * foam_noise_flow) * 0.5 + 0.5;
        float foam_line = surface_y - foam_noise * 0.01;

        float foam_intensity = smoothstep(foam_line - foam_thickness, foam_line, vUv.y);
        vec3 foam_color = vec3(1.0, 1.0, 1.0);
        water_color = mix(water_color, foam_color, foam_intensity * 0.8);

        // Işık yansımaları (specular, orijinaldeki gibi)
        float specular_noise = snoise(vec2(uv.x * 8.0, uv.y * 12.0) + u_time * 0.8);
        float specular_intensity = pow(max(0.0, specular_noise), 20.0);
        water_color += vec3(0.5, 0.7, 1.0) * specular_intensity * 0.3;

        gl_FragColor = vec4(water_color, 1.0);
    }`

// --- EFEKT OLUŞTURMA FONKSİYONU ---
function createEffect(width, height) {
  if (activeEffect)
    activeEffect.cleanup()

  const newEffect = {
    meshes: [],
    update: () => {
    },
    animate: () => {
    },
    cleanup() {
      this.meshes.forEach((mesh) => {
        if (scene)
          scene.remove(mesh)
        if (mesh.geometry)
          mesh.geometry.dispose()
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if (m.map)
                m.map.dispose()
              m.dispose()
            })
          }
          else {
            if (mesh.material.map)
              mesh.material.map.dispose()
            mesh.material.dispose()
          }
        }
      })
      this.meshes = []
      gsap.killTweensOf(this)
    },
  }

  const bgGeo = new THREE.PlaneGeometry(width, height)
  const bgMat = new THREE.MeshBasicMaterial({ visible: false })
  const bgMesh = new THREE.Mesh(bgGeo, bgMat)
  bgMesh.position.z = -10
  scene.add(bgMesh)
  newEffect.meshes.push(bgMesh)

  const effectGeo = new THREE.PlaneGeometry(width, height)
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_level: { value: 0.0 },
    },
    vertexShader,
    fragmentShader: waterFragmentShader,
    transparent: true,
  })

  const waterMesh = new THREE.Mesh(effectGeo, waterMaterial)
  scene.add(waterMesh)
  newEffect.meshes.push(waterMesh)

  newEffect.update = (level) => {
    const targetLevel = level / 100.0
    gsap.to(waterMaterial.uniforms.u_level, { value: targetLevel, duration: 0.5, ease: 'power2.out' })
  }

  newEffect.animate = (time) => {
    waterMaterial.uniforms.u_time.value = time
  }

  activeEffect = newEffect
  if (activeEffect.update)
    activeEffect.update(props.dangerLevel)
}

// --- YAŞAM DÖNGÜSÜ (LIFECYCLE) HOOKS ---
function initThree() {
  const canvas = canvasRef.value
  if (!canvas || !canvas.parentElement || canvas.parentElement.clientWidth === 0) {
    nextTick(initThree)
    return
  }
  const { width, height } = canvas.parentElement.getBoundingClientRect()
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000)
  camera.position.z = 100
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  createEffect(width, height)
  animate()
}

function animate() {
  if (!renderer)
    return

  animationFrameId = requestAnimationFrame(animate)
  const elapsedTime = clock.getElapsedTime()
  if (activeEffect && activeEffect.animate) {
    activeEffect.animate(elapsedTime)
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function cleanupThree() {
  if (!renderer)
    return

  cancelAnimationFrame(animationFrameId)
  animationFrameId = null

  if (activeEffect) {
    activeEffect.cleanup()
    activeEffect = null
  }

  if (scene) {
    while (scene.children.length > 0) {
      scene.remove(scene.children[0])
    }
  }

  if (renderer) {
    renderer.dispose()
    if (renderer.domElement) {
      renderer.domElement.width = 0
      renderer.domElement.height = 0
    }
    renderer = null
  }

  scene = null
  camera = null
  clock = null
}

// --- İZLEYİCİLER (WATCHERS) ---
watch(() => props.dangerLevel, (newLevel) => {
  if (activeEffect && activeEffect.update) {
    activeEffect.update(newLevel)
  }
})

watch(() => props.backgroundImage, () => {
  if (renderer) {
    const { width, height } = renderer.getSize(new THREE.Vector2())
    createEffect(width, height)
  }
})

let resizeObserver
onMounted(() => {
  nextTick(() => {
    const parentEl = canvasRef.value?.parentElement
    if (parentEl) {
      resizeObserver = new ResizeObserver(() => {
        cleanupThree()
        nextTick(initThree)
      })
      resizeObserver.observe(parentEl)
      initThree()
    }
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  cleanupThree()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="w-full h-full pointer-events-none bg-center bg-no-repeat bg-cover backdrop-brightness-125"
    :style="{ backgroundImage: `url(${props.backgroundImage})` }"
  />
</template>
