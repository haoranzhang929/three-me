import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise";

import { setupScene, setupCamera, setupRenderer } from "./threeSetup";
import useWindowSize from "./hooks/useWindowSize";
import { ColorPalette } from "./config";

// Helpers
import { publicPath } from "./helpers/AssetHelper";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import "./App.css";

const useHelper = false;
const moveSpeed = 3;
const mapSize = 512;

let frameId: number | null;

// Setup Scene, Camera & Renderer for Three.js
// For details of how to setup each component
// Please check ./three/index.ts file
const scene = setupScene(ColorPalette.NIGHT_OWL_BLUE);
scene.fog = new THREE.Fog(ColorPalette.NIGHT_OWL_BLUE, 1, 800);
const camera = setupCamera(window.innerWidth, window.innerHeight);
camera.position.z = 100;
camera.position.y = 0;
const renderer = setupRenderer(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lights
const ambientLight = new THREE.AmbientLight(ColorPalette.LIGHT_CREAM, 0.5);
ambientLight.position.set(0, 50, 0);

const hemisphereLight = new THREE.HemisphereLight(
  ColorPalette.LIGHT_CREAM,
  ColorPalette.BLACK,
  0.95
);
hemisphereLight.position.set(0, 100, 100);

const directionalLight = new THREE.DirectionalLight(ColorPalette.LIGHT_CREAM, 0.5);
directionalLight.castShadow = true;
directionalLight.position.set(-100, 100, -100);
// Set up shadow properties for the light
directionalLight.shadow.mapSize.set(mapSize, mapSize);
directionalLight.shadow.camera.near = 0.5; // default
directionalLight.shadow.camera.far = 500; // default

scene.add(ambientLight, hemisphereLight, directionalLight);

// OrbitControls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enablePan = false;
orbitControls.maxDistance = 150;
orbitControls.minDistance = 50;
orbitControls.rotateSpeed = 0.6;
orbitControls.zoomSpeed = 0.8;
orbitControls.maxPolarAngle = Math.PI / 1.5;
orbitControls.minAzimuthAngle = -Math.PI / 2;
orbitControls.maxAzimuthAngle = Math.PI / 2;

let me: THREE.Object3D | undefined;
(async () => {
  const gltf = (await new GLTFLoader().loadAsync(publicPath("me.glb"))) as GLTF;
  me = gltf.scene;
  me.scale.set(100, 100, 100);
  me.position.set(0, -60, 0);
  me.name = "Hao";
  me.traverse(node => {
    if (node.isObject3D) node.castShadow = true;
  });
  scene.add(me);
  camera.lookAt(me.position);
  orbitControls.update();

  // SkeletonHelper
  if (useHelper) {
    const skeletonHelper = new THREE.SkeletonHelper(me);
    scene.add(skeletonHelper);
  }
})();

// Terrain
const planeSize = 4000;
const crossArea = 800;
const moveBackSize = -(planeSize / 2) + 2 * crossArea - planeSize;
const numSegments = 50;
const getNoise = (x: number, y: number, z: number, t: number) =>
  new SimplexNoise().noise4d(x, y, z, t);
const planeMaterial = new THREE.MeshPhongMaterial({
  color: ColorPalette.PANTONE_BLUE_2020,
  flatShading: true,
  side: THREE.DoubleSide
});
const planeGeometry = new THREE.PlaneGeometry(planeSize / 1.5, planeSize, numSegments, numSegments);
for (let i = 0; i < planeGeometry.vertices.length; i++) {
  const v = planeGeometry.vertices[i];
  v.z = getNoise(v.x * 0.01, v.y * 0.01, v.z * 0.01, 0) * 60;
  v.z += getNoise(v.x * 0.03, v.y * 0.03, v.z * 0.03, 0) * 10;
  v.z += getNoise(v.x * 0.1, v.y * 0.125, v.z * 0.125, 0);
}
planeGeometry.verticesNeedUpdate = true;
const bufferPlaneGeometry = new THREE.BufferGeometry().fromGeometry(planeGeometry);
const terrain = new THREE.Mesh(bufferPlaneGeometry, planeMaterial);
terrain.name = "Terrain";
terrain.rotateX(-Math.PI / 2);
terrain.position.setZ(-(planeSize / 2) + crossArea);
terrain.position.setY(-75);
terrain.receiveShadow = true;
const terrain2 = terrain.clone();
terrain2.name = "Terrain 2";
terrain2.position.setZ(moveBackSize);
terrain2.position.setY(-76);
scene.add(terrain, terrain2);

const renderScene = () => renderer.render(scene, camera);

// Helpers
if (useHelper) {
  // Lights Helper
  const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 5);
  scene.add(hemisphereLightHelper);
  const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight);
  scene.add(directionalLightHelper);

  // AxesHelper
  const axesHelper = new THREE.AxesHelper(100);
  scene.add(axesHelper);
}

const App = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const { width, height } = useWindowSize();

  const onWindowResize = (width: number, height: number) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  const animate = () => {
    frameId = window.requestAnimationFrame(animate);
    orbitControls.update();
    terrain.position.z += moveSpeed;
    terrain2.position.z += moveSpeed;

    if (terrain.position.z > planeSize / 2) {
      console.log(`terrain move back ${moveBackSize}`);
      terrain.position.z = moveBackSize;
    }
    if (terrain2.position.z > planeSize / 2) {
      console.log(`terrain2 move back ${moveBackSize}`);
      terrain2.position.z = moveBackSize;
    }
    renderScene();
  };

  const start = () => {
    if (!frameId) {
      frameId = requestAnimationFrame(animate);
    }
  };

  const stop = () => {
    frameId && cancelAnimationFrame(frameId);
    frameId = null;
  };

  useEffect(() => {
    onWindowResize(width, height);

    start();

    const divEl = divRef.current;
    divEl?.appendChild(renderer.domElement);

    return () => {
      stop();
      divEl?.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  return <div ref={divRef} className="three-container"></div>;
};

export default App;
