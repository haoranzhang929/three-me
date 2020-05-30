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

let frameId: number | null;

// Setup Scene, Camera & Renderer for Three.js
// For details of how to setup each component
// Please check ./three/index.ts file
const scene = setupScene(ColorPalette.NIGHT_OWL_BLUE);
const camera = setupCamera(window.innerWidth, window.innerHeight);
camera.position.z = 100;
camera.position.y = 0;
const renderer = setupRenderer(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lights
const ambientLight = new THREE.AmbientLight(ColorPalette.LIGHT_CREAM, 0.35);
ambientLight.position.setY(50);

const hemisphereLight = new THREE.HemisphereLight(
  ColorPalette.LIGHT_CREAM,
  ColorPalette.BLACK,
  0.95
);
hemisphereLight.position.setY(100);
hemisphereLight.position.setZ(100);

const directionalLight = new THREE.DirectionalLight(ColorPalette.LIGHT_CREAM, 0.5);
directionalLight.castShadow = true;
directionalLight.position.setY(100);
directionalLight.position.setZ(100);
// Set up shadow properties for the light
directionalLight.shadow.mapSize.width = 1024; // default
directionalLight.shadow.mapSize.height = 1024; // default
directionalLight.shadow.camera.near = 0.5; // default
directionalLight.shadow.camera.far = 500; // default

scene.add(ambientLight, hemisphereLight, directionalLight);

// OrbitControls
const orbitControls = new OrbitControls(camera, renderer.domElement);

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
})();

// Terrain
const numSegments = 20;
const getNoise = (x: number, y: number, z: number, t: number) =>
  new SimplexNoise().noise4d(x, y, z, t);
const planeMaterial = new THREE.MeshPhongMaterial({
  color: ColorPalette.PANTONE_BLUE_2020,
  flatShading: true,
  side: THREE.DoubleSide
});
const planeGeometry = new THREE.PlaneGeometry(1500, 1500, numSegments, numSegments);
for (let i = 0; i < planeGeometry.vertices.length; i++) {
  const v = planeGeometry.vertices[i];
  v.z = getNoise(v.x * 0.01, v.y * 0.01, v.z * 0.01, 0) * 60;
  v.z += getNoise(v.x * 0.03, v.y * 0.03, v.z * 0.03, 0) * 10;
  v.z += getNoise(v.x * 0.1, v.y * 0.125, v.z * 0.125, 0);
}
planeGeometry.verticesNeedUpdate = true;
const terrain = new THREE.Mesh(planeGeometry, planeMaterial);
terrain.name = "Terrain";
terrain.rotateX(-Math.PI / 2);
terrain.position.setY(-60);
terrain.receiveShadow = true;
scene.add(terrain);

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

  // SkeletonHelper
  if (me) {
    const skeletonHelper = new THREE.SkeletonHelper(me);
    scene.add(skeletonHelper);
  }
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
    me && me.rotateY(0.01);
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
