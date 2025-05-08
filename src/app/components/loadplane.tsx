'use client'

import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const LoadPlane: React.FC = () => {
    const [lamp, setLamp] = useState(1)
  const lampRef = useRef<THREE.PointLight | null>(null)
  const intensityStep = 0.3

  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 7.5)
    scene.add(dirLight)

    // adding lamp light
    const lampGeo = new THREE.SphereGeometry(0.05, 32, 32)
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 10
    })
    lampMat.transparent = true

    const lampMesh = new THREE.Mesh(lampGeo, lampMat)
    lampMesh.position.set(0.26, 0.95, 0.53)

    const lampLight = new THREE.PointLight(0xffffaa, 1, 2, 2)
    lampLight.position.copy(lampMesh.position)
    lampRef.current = lampLight // stash into my ref
    scene.add(lampLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.6, 0)
    controls.enableZoom = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = false

    const loader = new GLTFLoader()
    loader.load(
      '/models/programmer.glb',
      (gltf: any) => {
        const model = gltf.scene
        model.scale.setScalar(0.13)
        scene.add(model)
        // only load light mesh after model
        scene.add(lampMesh)
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

    const clock = new THREE.Clock()
    const animate = () => {
      requestAnimationFrame(animate)
      const delta = clock.getDelta()
      scene.rotation.y += delta * 0.1
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()

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
  }, [])

  useEffect(() => {
    if (lampRef.current) {
      lampRef.current.intensity = lamp
    }
  }, [lamp])

  return (
    <div
      ref={mountRef}
      style={{
        width: '500px',
        height: '500px',
        borderRadius: '8px',
        borderStyle: 'dashed',
        borderColor: 'white',
        //borderWidth: '2px',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        aria-label="Decrease X"
        onClick={() => {setLamp(lamp - intensityStep)}}
        style={{
          width: '32px',
          height: '32px',
          fontSize: '20px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          background: 'blue',
          cursor: 'pointer'
        }}
      >
        –
      </button>

      <button
        type="button"
        aria-label="Increase X"
        onClick={() => {setLamp(lamp + intensityStep)}}
        style={{
          width: '32px',
          height: '32px',
          fontSize: '20px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          background: 'blue',
          cursor: 'pointer'
        }}
      >
        +
      </button>
    </div>
  )
}

export default LoadPlane