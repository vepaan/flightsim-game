'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { setupRenderSky } from './RenderSky'
import { setupRenderOcean } from './RenderOcean'
import { RenderModel } from './RenderModel'

const toneExposure = 0.3

const Game: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null)
    const timeOfDay = useRef(0)
    const coderRef = useRef<THREE.Group | null>(null)

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

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.target.set(0, 0.6, 0)
        controls.enableDamping = true

        const loader = new GLTFLoader()

        RenderModel({
            scene: scene,
            loader: loader,
            url: '/models/programmer.glb',
            scale: 0.3,
            position: new THREE.Vector3(0, 0, 0)
        }).then((m) => {coderRef.current = m})

        const skySystem = setupRenderSky(scene, camera, timeOfDay)
        const updateOcean = setupRenderOcean(scene, skySystem.primaryLight)

        const animate = () => {
            requestAnimationFrame(animate)

            skySystem.updateSky()
            updateOcean()
            
            controls.update()
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
            controls.dispose()
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
