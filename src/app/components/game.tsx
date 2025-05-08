'use client'

import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

const Game: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null)
    const waterResolution = 512
    const moonSize = 20

    const timeOfDay = useRef(0)
    
    const sunIntensity = 10
    const moonIntensity = 5

    const sunIntensityFallback = 1
    const moonIntensityFallback = 1

    const sunPosition = skyPosition(timeOfDay.current)

    const moonRef = useRef<THREE.Sprite | null>(null)

    const ambientIntensity = 1
    const skyScale = 10000
    const toneExposure = 0.3
    const oceanMovement = 1 / 200

    const terrainX = 1000
    const terrainY = 1000
    const terrainZ = 1000
    
    useEffect(() => {

        const container = mountRef.current
        if (!container) return

        // game clock
        const clock = new THREE.Clock()

        // scene setup
        const scene = new THREE.Scene()
        scene.background = null

        // camera setup
        const camera = new THREE.PerspectiveCamera(
            50,
            container.clientWidth / container.clientHeight,
            0.1,
            1000   
        )
        camera.position.set(0, 0.6, 2.8)

        // renderer setup
        
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        container.appendChild(renderer.domElement)

        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = toneExposure

        // LIGHTING
        
        // ambient light

        const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity)
        scene.add(ambient)

        // sun setup

        const sunLight = new THREE.DirectionalLight(0xffffaa, sunIntensity)
        sunLight.castShadow = true
        sunLight.position.copy(sunPosition.clone().multiplyScalar(10e2))
        scene.add(sunLight)

        // moon setup

        const moonTexture = new THREE.TextureLoader().load('/textures/moon.png')
        const moonMaterial = new THREE.SpriteMaterial({ 
            map: moonTexture, 
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        })
        const moon = new THREE.Sprite(moonMaterial)
        const moonLight = new THREE.DirectionalLight(0x8899ff, moonIntensity)
        moonLight.castShadow = false

        scene.add(moon)
        scene.add(moonLight)
        moonRef.current = moon
        moon.scale.set(moonSize, moonSize, 1)

        // stars steup

        const starCount = 1000
        const starGeometry = new THREE.BufferGeometry();
        const starVertices = [];

        for (let i = 0; i < starCount; i++) {
            const x = THREE.MathUtils.randFloatSpread(2000);
            const y = THREE.MathUtils.randFloatSpread(2000);
            const z = THREE.MathUtils.randFloatSpread(2000);
            
            const safeX = Math.abs(x) < 1000 ? x + 100 * Math.sign(x || 1) : x;
            const safeY = Math.abs(y) < 1000 ? y + 100 * Math.sign(y || 1) : y;
            const safeZ = Math.abs(z) < 1000 ? z + 100 * Math.sign(z || 1) : z;
            
            starVertices.push(safeX, safeY, safeZ);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);


        // controls setup

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.target.set(0, 0.6, 0)
        controls.enableZoom = true
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.enablePan = true

        // terrain loader setup

        const loader = new GLTFLoader()
        loader.load(
            '/models/programmer.glb',
            (gltf: any) => {
                const model = gltf.scene
                model.scale.setScalar(0.13)
                scene.add(model)
            },
            (event: ProgressEvent<EventTarget>) => {
                const loaded = event.loaded
                const total = event.total ?? loaded
                console.log(`Model ${((loaded / total) * 100).toFixed(1)}% loaded`)
            },
            (error: ErrorEvent) => {
                console.error('GLTF load error:', error.message)
            }
        )

        // water setup

        const waterNormals = new THREE.TextureLoader().load('/textures/waternormals.jpg')
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

        const waterGeometry = new THREE.PlaneGeometry(terrainX, terrainY)

        const water = new Water(waterGeometry, {
            textureWidth: waterResolution,
            textureHeight: waterResolution,
            waterNormals: waterNormals,
            sunDirection: sunLight.position.clone().normalize(),
            sunColor: 0xffffff,
            waterColor: 0x3a9ad9,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        })

        water.rotation.x = -Math.PI / 2
        scene.add(water)

        // sky setup

        const sky = new Sky()
        sky.scale.setScalar(skyScale)
        scene.add(sky)

        const uniforms = sky.material.uniforms
        uniforms['turbidity'].value = 4 // cloudiness of sunrays (no light chantge)
        uniforms['rayleigh'].value = 1.0 // sky become sbluer when decreased (redder sunsets)
        uniforms['mieCoefficient'].value = 0.001 // bloom increase to make sky whiter
        uniforms['mieDirectionalG'].value = 0.8
        uniforms['sunPosition'].value.copy(sunPosition)


        // rendering our scene

        const animate = () => {
            requestAnimationFrame(animate)

            // animate water time
            water.material.uniforms['time'].value += oceanMovement

            // animate stars
            stars.rotation.x += 0.0002;

            const sunPos = skyPosition(timeOfDay.current)
            sunLight.position.copy(sunPos.clone())
            uniforms['sunPosition'].value.copy(sunPos)
            
            sunLight.intensity = getIntensity(timeOfDay.current, sunIntensity, sunIntensityFallback, true)
            moonLight.intensity = getIntensity(timeOfDay.current, moonIntensity, moonIntensityFallback, false)

            if (moonRef.current) {
                const moonPos = sunPos.clone().multiplyScalar(-600) // close to the edge of sky
                moonRef.current.position.copy(camera.position.clone().add(moonPos))
                moonLight.position.copy(camera.position.clone().add(moonPos))
            }

            controls.update()
            renderer.render(scene, camera)
        }

        animate()

        // resize handler
        const handleResize = () => {
            if (!container) return
            camera.aspect = container.clientWidth / container.clientHeight
            camera.updateProjectionMatrix()
            renderer.setSize(container.clientWidth, container.clientHeight)
        }
        window.addEventListener('resize', handleResize)

        // destroy stuff after ending
        return () => {
            window.removeEventListener('resize', handleResize)
            renderer.dispose()
            controls.dispose()
      
            // dispose geometries & materials
            scene.traverse((obj: Object) => {
                if ((obj as THREE.Mesh).geometry) {
                    ;(obj as THREE.Mesh).geometry.dispose()
                }
                if ((obj as THREE.Mesh).material) {
                    const mat = (obj as THREE.Mesh).material
                    Array.isArray(mat)
                        ? mat.forEach((m) => m.dispose())
                        : mat.dispose()
                    }
            })
      
            container.removeChild(renderer.domElement)
        }

    })

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div
                ref={mountRef}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            />
            <input
                type="range"
                min={0}
                max={360}
                defaultValue={timeOfDay.current}
                onInput={(e) => timeOfDay.current = Number(e.currentTarget.value)}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    zIndex: 10,
                }}
            />
        </div>
    )
}

function skyPosition(timeOfDay: number): THREE.Vector3 {
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
  

export default Game