'use client'

import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

const Game: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null)
    const waterResolution = 16
    const sunIntensity = 10
    const ambientIntensity = 1
    const sunPosition = getSunPosition(40)
    const skyScale = 10000
    const toneExposure = 0.3
    
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

        const waterGeometry = new THREE.PlaneGeometry(1000, 1000)

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
        uniforms['rayleigh'].value = 1.2 // sky become sbluer when decreased (redder sunsets)
        uniforms['mieCoefficient'].value = 0.001 // bloom increase to make sky whiter
        uniforms['mieDirectionalG'].value = 0.8
        uniforms['sunPosition'].value.copy(sunPosition)


        // rendering our scene

        const animate = () => {
            requestAnimationFrame(animate)

            // animate water time
            water.material.uniforms['time'].value += 1.0 / 60.0

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
        <div 
            ref={mountRef}
            style={{
                width: '100vw',
                height: '100vh'}}
         />
    )
}

function getSunPosition(timeOfDay: number): THREE.Vector3 {
    const phi = THREE.MathUtils.degToRad(90 - 10) // altitude of sun above horizon
    const theta = THREE.MathUtils.degToRad(timeOfDay) // azimuth (0 = east, 180 = west)
    const distance = 1 // unit direction vector

    return new THREE.Vector3(
        distance * Math.cos(theta) * Math.sin(phi),
        distance * Math.sin(theta) * Math.sin(phi),
        distance * Math.cos(phi) + 1
    )
  }
  

export default Game