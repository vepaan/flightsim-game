import * as THREE from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'

const waterResolution = 8
const waterMovement = 1/200
const terrainX = 1000
const terrainY = 1000

export function setupRenderOcean(
    scene: THREE.Scene,
    primaryLight: THREE.DirectionalLight
) {
    const waterNormals = new THREE.TextureLoader().load('/textures/waternormals.jpg')
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

    const geometry = new THREE.PlaneGeometry(terrainX, terrainY)
    const water = new Water(geometry, {
        textureWidth: waterResolution,
        textureHeight: waterResolution,
        waterNormals: waterNormals,
        sunDirection: primaryLight.position.clone().multiplyScalar(10e2).normalize(),
        sunColor: 0xffffff,
        waterColor: 0x3a9ad9,
        distortionScale: 3.7,
        fog: scene.fog !== undefined,
    })

    water.rotation.x = -Math.PI / 2
    scene.add(water)

    return function updateOcean() {
        water.material.uniforms['time'].value += waterMovement
    }
}
