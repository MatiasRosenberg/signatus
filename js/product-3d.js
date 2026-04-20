import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewers = new Map();

function createViewer(container, modelUrl) {
  if (!container) return null;
  destroyViewer(container);

  const width  = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
  camera.position.set(0, 0, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  // Luces
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2, 3, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xe53535, 0.4);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-2, -1, 3);
  scene.add(fill);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.2;
  controls.maxDistance = 6;
  controls.rotateSpeed = 0.9;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;

  // Pausar autorotate cuando el usuario interactúa
  const stopAutoRotate = () => { controls.autoRotate = false; };
  renderer.domElement.addEventListener('pointerdown', stopAutoRotate);
  renderer.domElement.addEventListener('wheel', stopAutoRotate, { passive: true });

  const viewerState = {
    scene, camera, renderer, controls,
    rafId: null,
    resizeObs: null,
    destroyed: false,
    modelRoot: null
  };

  // Loop de render
  function animate() {
    if (viewerState.destroyed) return;
    controls.update();
    renderer.render(scene, camera);
    viewerState.rafId = requestAnimationFrame(animate);
  }
  animate();

  // Responsive
  const resize = () => {
    if (viewerState.destroyed) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(container);
  viewerState.resizeObs = resizeObs;

  // Cargar modelo
  console.log('[Product3DViewer] Loading model:', modelUrl);
  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      if (viewerState.destroyed) return;
      const root = gltf.scene;
      centerAndScale(root, 1.6);
      scene.add(root);
      viewerState.modelRoot = root;
      container.classList.add('is-3d-loaded');
      console.log('[Product3DViewer] Model loaded successfully');
    },
    (xhr) => {
      if (xhr.lengthComputable) {
        console.log(`[Product3DViewer] ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`);
      }
    },
    (err) => {
      console.error('[Product3DViewer] Error loading GLB model:', err);
      console.error('[Product3DViewer] URL was:', modelUrl);
      container.classList.add('is-3d-error');
    }
  );

  viewers.set(container, viewerState);
  return viewerState;
}

function centerAndScale(root, targetSize) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  root.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = targetSize / maxDim;
    root.scale.multiplyScalar(scale);
  }
}

function destroyViewer(container) {
  const state = viewers.get(container);
  if (!state) return;
  state.destroyed = true;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  if (state.resizeObs) state.resizeObs.disconnect();
  if (state.controls) state.controls.dispose();
  if (state.renderer) {
    state.renderer.dispose();
    if (state.renderer.domElement && state.renderer.domElement.parentNode) {
      state.renderer.domElement.parentNode.removeChild(state.renderer.domElement);
    }
  }
  if (state.scene) {
    state.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          if (!m) return;
          Object.keys(m).forEach(k => {
            const v = m[k];
            if (v && v.isTexture) v.dispose();
          });
          m.dispose?.();
        });
      }
    });
  }
  viewers.delete(container);
}

window.Product3DViewer = {
  init: createViewer,
  destroy: destroyViewer
};
