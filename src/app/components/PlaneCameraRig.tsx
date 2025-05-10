'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'

export interface PlaneCameraRigParams {
    plane: RenderPlane
    camera: THREE.Camera
    domElement: HTMLElement
    radius?: number // default to 5m
    sensitivity?: number
}

export class PlaneCameraRig {
    private plane: RenderPlane
    private camera: THREE.Camera
    private domElement: HTMLElement
    private radius: number
    private sensitivity: number
    private theta = 0 // horizontal angle
    private phi = Math.PI / 2 // vertical angle

    constructor(params: PlaneCameraRigParams) {
        this.plane = params.plane
        this.camera = params.camera
        this.domElement = params.domElement
        this.radius = params.radius ?? 5
        this.sensitivity = params.sensitivity ?? 0.002

        this.initMouseListeners()
    }

    private initMouseListeners() {
        let isDragging = false
        let prevX = 0
        let prevY = 0

        this.domElement.addEventListener('mousedown', (e) => {
            isDragging = true
            prevX = e.clientX
            prevY = e.clientY
        })

        window.addEventListener('mouseup', () => {
            isDragging = false
        })

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return
            const dx = e.clientX - prevX
            const dy = e.clientY - prevY
            prevX = e.clientX
            prevY = e.clientY

            this.theta -= dx * this.sensitivity
            this.phi -= dy * this.sensitivity
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi)) // clamp to avoid flipping
        })
    }

    public update() {
        const target = new THREE.Vector3()
        this.plane.wrapper.getWorldPosition(target)

        const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta)
        const y = this.radius * Math.cos(this.phi)
        const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta)

        this.camera.position.set(
            target.x + x,
            target.y + y,
            target.z + z
        )

        this.camera.lookAt(target)
    }
}
