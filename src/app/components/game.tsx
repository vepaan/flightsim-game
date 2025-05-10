'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { setupRenderSky } from './RenderSky'
import { setupRenderOcean } from './RenderOcean'
import { RenderModel } from './RenderModel'
import { RenderPlane } from './RenderPlane'
import { OrbitControlsManager, TransformControlManager } from './ControlsManager'
import { PlaneControls } from './PlaneControls'
import { PlaneCameraRig } from './PlaneCameraRig'

const toneExposure = 0.3
const IS_DEV_MODE = false

const Game: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null)
    const timeOfDay = useRef(90)

    const mig29Ref = useRef<THREE.Group | null>(null)
    const aircraftCarrierRef = useRef<THREE.Group | null>(null)

    useEffect(() => {
        const container = mountRef.current
        if (!container) return

        // SCENE
        const scene = new THREE.Scene()
        scene.background = null

        // CAMERA
        const camera = new THREE.PerspectiveCamera(
            50,
            container.clientWidth / container.clientHeight,
            0.1,
            1000   
        )
        camera.position.set(33.37, 10.81, 66.12)

        // RENDERER
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        container.appendChild(renderer.domElement)

        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = toneExposure



        // CONTROLS
        let transformControls: any
        let orbitControls: any

        if (IS_DEV_MODE) {
            orbitControls = new OrbitControlsManager(
                camera,
                renderer.domElement
            )

            transformControls = new TransformControlManager(
                camera,
                renderer.domElement,
                scene,
                orbitControls.controls
            )
        }

        

        // MODEL LOADER
        const loader = new GLTFLoader()



        // AIRCRAFT CARRIER
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
        

        
        // PLANE
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

        // plane controls
        const planeControls = new PlaneControls({
            plane: mig29,
            camera: camera,
            domElement: container,
            scene: scene
        })

        // plane cam
        const cameraRig = new PlaneCameraRig({
            plane: mig29,
            camera,
            domElement: container,
            radius: 12,
            sensitivity: 0.003,
            theta: Math.PI / 2 - 0.17,
            phi: Math.PI / 2 - 0.17,
        })



        // ENVIRONMENT
        const skySystem = setupRenderSky(scene, camera, timeOfDay)
        const updateOcean = setupRenderOcean(scene, skySystem.primaryLight)



        // ANIMATION LOOP
        const animate = () => {
            requestAnimationFrame(animate)

            skySystem.updateSky()
            updateOcean()
            mig29.updateVisuals()

            if (IS_DEV_MODE) {
                orbitControls?.update()
                transformControls?.update()
            } else {
                planeControls.updateCameraFollow()
                cameraRig.update()
            }
            
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
