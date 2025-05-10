'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { setupRenderSky } from './RenderSky'
import { setupRenderOcean } from './RenderOcean'
import { RenderModel } from './RenderModel'
import { RenderPlane } from './RenderPlane'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { PlaneControls } from './PlaneControls'
import { PlaneCameraRig } from './PlaneCameraRig'

const toneExposure = 0.3

const Game: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null)
    const timeOfDay = useRef(90)

    const mig29Ref = useRef<THREE.Group | null>(null)
    const aircraftCarrierRef = useRef<THREE.Group | null>(null)

    useEffect(() => {
        const container = mountRef.current
        if (!container) return

        const scene = new THREE.Scene()
        scene.background = null

        const camera = new THREE.PerspectiveCamera(
            50,
            container.clientWidth / container.clientHeight,
            0.1,
            1000   
        )
        camera.position.set(33.37, 10.81, 66.12)

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        container.appendChild(renderer.domElement)

        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = toneExposure

        const orbitControls = new OrbitControls(camera, renderer.domElement)
        orbitControls.target.set(0, 0.6, 0)
        orbitControls.enableDamping = true

        orbitControls.addEventListener('change', () => {
            console.clear()
            console.log(`Camera Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
        })

        // transform controls setup

        const transformControls = new TransformControls(camera, renderer.domElement)
        
        // we need to disable orbitcontrols when transform controls are in play
        transformControls.addEventListener('dragging-changed', (event: any) => {
            orbitControls.enabled = !event.value
        })
        transformControls.addEventListener('objectChange', () => {
            const obj = transformControls.object
            if (obj) {
                console.clear()

                const pos = obj.position
                const rot = obj.rotation
                const scale = obj.scale

                const toDeg = THREE.MathUtils.radToDeg

                console.log(`Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`)
                console.log(`Rotation (deg): (${toDeg(rot.x).toFixed(2)}, ${toDeg(rot.y).toFixed(2)}, ${toDeg(rot.z).toFixed(2)})`)
                console.log(`Scale: (${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`)
            }
        })

        window.addEventListener('keydown', (e: any) => {
            switch (e.key.toLowerCase()) {
                case 't':
                    transformControls.setMode('translate')
                    break
                case 'r':
                    transformControls.setMode('rotate')
                    break
                case 's':
                    transformControls.setMode('scale')
                    break
            }
        })

        scene.add(transformControls.getHelper())

        // model loader

        const loader = new GLTFLoader()

        const mig29 = new RenderPlane({
            scene: scene,
            loader: loader,
            url: '/models/mig29.glb',
            scale: 0.05,
            position: new THREE.Vector3(30.49, 6.61, 49.27),
            rotation: {x: -175.72, y: 79.67, z: 177.61}
        })

        mig29.load().then(() => {
            mig29.setHitbox({
                dimensions: { length: 1, width: 2, height: 0.3 },
                position: { x: 30.5, y: 6.6, z: 49.2 },
                rotation: { pitch: -175.72, yaw: 79.67, roll: 177.61 }
            })
            mig29.lockHitbox()
            mig29.toggleHitboxVisibility(false)
            mig29Ref.current = mig29.wrapper
        })

        const aircraftCarrier = new RenderModel({
            scene: scene,
            loader: loader,
            url: '/models/aircraft_carrier.glb',
            scale: 0.1,
            position: new THREE.Vector3(28, -4, 11),
            rotation: {x: 0, y: 0, z: 0}
        })
        
        aircraftCarrier.load().then((model) => {
            aircraftCarrierRef.current = model
        })

        // plane controls

        const planeControls = new PlaneControls({
            plane: mig29,
            camera: camera,
            domElement: container,
            scene: scene
        })
        const cameraRig = new PlaneCameraRig({
            plane: mig29,
            camera,
            domElement: container, // your canvas container div
            radius: 5,              // or 1 for 1m sphere as you said
            sensitivity: 0.003
        })


        const skySystem = setupRenderSky(scene, camera, timeOfDay)
        const updateOcean = setupRenderOcean(scene, skySystem.primaryLight)

        const animate = () => {
            requestAnimationFrame(animate)

            skySystem.updateSky()
            updateOcean()
            
            mig29.updateVisuals()
            planeControls.updateCameraFollow()
            cameraRig.update()

            //orbitControls.update()
            //transformControls.update()
            renderer.render(scene, camera)
        }
        animate()

        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight
            camera.updateProjectionMatrix()
            renderer.setSize(container.clientWidth, container.clientHeight)
        })

        return () => {
            renderer.dispose()
            orbitControls.dispose()
            container.removeChild(renderer.domElement)
        }
    }, [])

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            <input
            type="range"
            min={0}
            max={360}
            defaultValue={timeOfDay.current}
            onInput={(e) => (timeOfDay.current = Number(e.currentTarget.value))}
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

export default Game
