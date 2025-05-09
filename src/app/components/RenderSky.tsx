import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

// size
const skyScale = 10000
const moonScale = 20

// light
const sunIntensity = 10
const moonIntensity = 5
const ambientIntensity = 1
const sunIntensityFallBack = 1
const moonIntensityFallback = 1

// quantity
const starCount = 1000
const starOffset = 100
const moonDistance = 600


export function setupRenderSky(
    scene: THREE.Scene,
    camera: THREE.Camera,
    timeOfDayRef: React.RefObject<number>
) {
    const primaryLight = { current: new THREE.DirectionalLight() }

    const sky = new Sky()
    sky.scale.setScalar(skyScale)
    scene.add(sky)

    const sunLight = new THREE.DirectionalLight(0xffffaa, sunIntensity)
    sunLight.castShadow = true
    scene.add(sunLight)

    const moonLight = new THREE.DirectionalLight(0x8899ff, moonIntensity)
    moonLight.castShadow = true
    scene.add(moonLight)

    const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity)
    scene.add(ambient)

    const moonTexture = new THREE.TextureLoader().load('/textures/moon.png')
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: moonTexture,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    }))
    moon.scale.set(moonScale, moonScale, 1)
    scene.add(moon)

    // Stars
    const starGeometry = new THREE.BufferGeometry()
    const starVertices = []

    for (let i = 0; i < starCount; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000)
        const y = THREE.MathUtils.randFloatSpread(2000)
        const z = THREE.MathUtils.randFloatSpread(2000)

        const safeX = Math.abs(x) < 1000 ? x + starOffset * Math.sign(x || 1) : x;
        const safeY = Math.abs(y) < 1000 ? y + starOffset * Math.sign(y || 1) : y;
        const safeZ = Math.abs(z) < 1000 ? z + starOffset * Math.sign(z || 1) : z;
            
        starVertices.push(safeX, safeY, safeZ);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3))
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, transparent: true, opacity: 0.8 })
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    const uniforms = sky.material.uniforms

    const updateSky = () => {
        const time = timeOfDayRef.current || 0
        const sunPos = getSkyPosition(time)

        uniforms['turbidity'].value = 4 // cloudiness of sunrays (no light chantge)
        uniforms['rayleigh'].value = 1.0 // sky become sbluer when decreased (redder sunsets)
        uniforms['mieCoefficient'].value = 0.001 // bloom increase to make sky whiter
        uniforms['mieDirectionalG'].value = 0.8
        uniforms['sunPosition'].value.copy(sunPos)

        sunLight.position.copy(sunPos.clone().multiplyScalar(1000))
        sunLight.intensity = getIntensity(time, sunIntensity, sunIntensityFallBack, true)

        moonLight.position.copy(camera.position.clone().add(sunPos.clone().multiplyScalar(-600)))
        moonLight.intensity = getIntensity(time, moonIntensity, moonIntensityFallback, false)

        moon.position.copy(camera.position.clone().add(sunPos.clone().multiplyScalar(-moonDistance)))
        stars.rotation.x += 0.0002

        const t = (time % 360) / 360
        const daylight = Math.cos((t - 0.25) * Math.PI * 2)
        primaryLight.current = daylight >= 0 ? sunLight: moonLight
    }

    return {
        updateSky,
        primaryLight
    }
}

// this function gives the sky position based on time of day

function getSkyPosition(timeOfDay: number): THREE.Vector3 {
    const phi = THREE.MathUtils.degToRad(90 - 10) // altitude of sun above horizon
    const theta = THREE.MathUtils.degToRad(timeOfDay) // azimuth (0 = east, 180 = west)
    const distance = 1 // unit direction vector

    return new THREE.Vector3(
        distance * Math.cos(theta) * Math.sin(phi),
        distance * Math.sin(theta) * Math.sin(phi),
        distance * Math.cos(phi) + 1
    )
}

// this function simulates irl intensity change not abrupt

function getIntensity(time: number, max: number, min: number, isSun: boolean): number {
    const angleOffset = (isSun) ? 0.25: 0.75
    const t = (time % 360) / 360 // normalize time of day to [0,1]
    // sun peaks at t=0.25 (90 degrees) and moon peaks at t=0.75 (270 degrees)
    const daylight = Math.cos((t-angleOffset) * Math.PI * 2)
    return THREE.MathUtils.clamp((daylight + 1) / 2, 0, 1) * (max - min) + min
}
  
