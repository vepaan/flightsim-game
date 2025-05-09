import * as THREE from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'

const waterResolution = 256
const waterMovement = 1/200
const terrainX = 1000
const terrainY = 1000

export function setupRenderOcean(
    scene: THREE.Scene,
    primaryLightRef: { current: THREE.DirectionalLight}
) {
    const primaryLight = primaryLightRef.current

    const waterNormals = new THREE.TextureLoader().load('/textures/waternormals2.jpg')
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

    const geometry = new THREE.PlaneGeometry(terrainX, terrainY)
    const water = new Water(geometry, {
        textureWidth: waterResolution,
        textureHeight: waterResolution,
        waterNormals: waterNormals,
        sunDirection: primaryLight.position.clone().multiplyScalar(primaryLight.intensity).normalize(),
        sunColor: primaryLight.color,
        waterColor: 0x1565C0,
        distortionScale: 3.7,
        fog: scene.fog !== undefined,
    })

    water.rotation.x = -Math.PI / 2
    scene.add(water)

    return function updateOcean() {
        const primaryLight = primaryLightRef.current
        water.material.uniforms['sunDirection'].value.copy(primaryLight.position).multiplyScalar(primaryLight.intensity).normalize()
        water.material.uniforms['time'].value += waterMovement
    }
}
