'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { setupRenderSky } from './environment/RenderSky'
import { setupRenderOcean } from './environment/RenderOcean'
import { RenderModel } from './RenderModel'
import { RenderPlane } from './plane/RenderPlane'
import { OrbitControlsManager, TransformControlManager } from './ControlsManager'
import { PlaneControls } from './plane/PlaneControls'
import { createGround, initPhysics, stepPhysics } from './physics/PhysicsWorld'

const toneExposure = 0.3
const IS_DEV_MODE = false

const Game: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null)
    const timeOfDay = useRef(90)

    const mig29Ref = useRef<THREE.Group | null>(null)
    const f22Ref = useRef<THREE.Group | null>(null)
    const aircraftCarrierRef = useRef<THREE.Group | null>(null)

    async function bootstrapScene(container: HTMLDivElement) {
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


        // GAME CLOCK
        const clock = new THREE.Clock()


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


        // PHYSICS
        await initPhysics()
        createGround({
            x: 2000,
            y: 0.1,
            z: 2000,
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            scene: scene,
            debug: false
        })


        // MODEL LOADER
        const loader = new GLTFLoader()


        // AIRCRAFT CARRIER
        const aircraftCarrier = new RenderModel({
            scene: scene,
            loader: loader,
            url: '/models/aircraft_carrier.glb',
            scale: 0.1,
            position: new THREE.Vector3(28, -4, 11), // -4 for 10
            rotation: {x: 0, y: 0, z: 0},
        })
        
        aircraftCarrier.load().then((model) => {
            aircraftCarrierRef.current = model
            createGround({
                x: 12,
                y: 0.05,
                z: 52,
                position: new THREE.Vector3(28, 5.6, 5),
                rotation: new THREE.Euler(0, 0, 0),
                scene: scene,
                debug: false
            })
        })
        

        // PLANE
        const mig29 = new RenderPlane({
            scene: scene,
            loader: loader,
            url: '/models/mig29.glb',
            scale: 0.05,
            position: new THREE.Vector3(30.49, 6.61, 49.27),
            rotation: {x: -175.72, y: 79.67, z: 177.61},
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
            mig29.unload()
        })


        const f22 = new RenderPlane({
            scene: scene,
            loader: loader,
            url: '/models/f22.glb',
            scale: 2.5,
            position: new THREE.Vector3(30.5, 6.05, 49.3),
            rotation: {x: -180, y: 79.5, z: -180},
        })

        f22.load().then(() => {
            f22.setHitbox({
                dimensions: { length: 1, width: 2, height: 0.3 },
                position: { x: 30.5, y: 7, z: 49.3 },
                rotation: { pitch: -180, yaw: -10.5, roll: 180 }
            })
            f22.lockHitbox()
            f22.toggleHitboxVisibility(false)
            f22.makeSolid(true, false)
            f22Ref.current = f22.wrapper
        })


        // plane controls
        const f22Controls = new PlaneControls({
            plane: f22,
            camera: camera,
            domElement: container,
            camSensitivity: 0.002,
            //camDefaultOffset: new THREE.Vector3(-20, 2, 0)
            camDefaultOffset: new THREE.Vector3(0, 2, -15)
        })


        // ENVIRONMENT
        const skySystem = setupRenderSky(scene, camera, timeOfDay)
        const updateOcean = setupRenderOcean(scene, skySystem.primaryLight)


        // ANIMATION LOOP
        const animate = () => {
            requestAnimationFrame(animate)

            skySystem.updateSky()
            updateOcean()

            const delta = clock.getDelta()

            stepPhysics(delta)
            f22.updatePhysics()
            aircraftCarrier.updatePhysics()

            if (IS_DEV_MODE) {
                orbitControls?.update()
                transformControls?.update()
            } else {
                f22.update(delta)
                f22Controls.update(delta)
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
    }

    useEffect(() => {
        const container = mountRef.current
        if (!container) return
        bootstrapScene(container)        
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
