'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { setupRenderSky } from './RenderSky'
import { setupRenderOcean } from './RenderOcean'
import { RenderModel } from './RenderModel'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'

const toneExposure = 0.3

const Game: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null)
    const timeOfDay = useRef(0)

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
        camera.position.set(0, 0.6, 2.8)

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        container.appendChild(renderer.domElement)

        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = toneExposure

        const orbitControls = new OrbitControls(camera, renderer.domElement)
        orbitControls.target.set(0, 0.6, 0)
        orbitControls.enableDamping = true

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
                console.log(`Position: (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`)
            }
        })

        scene.add(transformControls.getHelper())

        // model loader

        const loader = new GLTFLoader()

        RenderModel({
            scene: scene,
            loader: loader,
            url: '/models/mig29.glb',
            scale: 0.1,
            position: new THREE.Vector3(0, 6, 0)
        }).then((m) => {
            mig29Ref.current = m
            transformControls.attach(m)
        })

        RenderModel({
            scene: scene,
            loader: loader,
            url: '/models/aircraft_carrier.glb',
            scale: 0.1,
            position: new THREE.Vector3(15, 10, 40)
        }).then((m) => {
            aircraftCarrierRef.current = m
            transformControls.attach(m)
        })

        const skySystem = setupRenderSky(scene, camera, timeOfDay)
        const updateOcean = setupRenderOcean(scene, skySystem.primaryLight)

        const animate = () => {
            requestAnimationFrame(animate)

            skySystem.updateSky()
            updateOcean()
            
            orbitControls.update()
            transformControls.update()
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
