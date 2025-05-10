'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'

export interface PlaneCameraRigParams {
    plane: RenderPlane
    camera: THREE.Camera
    domElement: HTMLElement
    radius?: number // default to 5m
    sensitivity?: number
    phi?: number
    theta?: number
}

export class PlaneCameraRig {
    private plane: RenderPlane
    private camera: THREE.Camera
    private domElement: HTMLElement
    private radius: number
    private sensitivity: number
    private theta: number // horizontal angle
    private phi: number // vertical angle
    private prevX = 0
    private prevY = 0
    private initialized = false
    private isDragging = false

    constructor(params: PlaneCameraRigParams) {
        this.plane = params.plane
        this.camera = params.camera
        this.domElement = params.domElement
        this.radius = params.radius ?? 5
        this.sensitivity = params.sensitivity ?? 0.002

        // this setups initial cam pos
        this.phi = params.phi ?? 1.4
        this.theta = params.theta ?? Math.PI + 0.2

        this.initMouseListeners()
        //this.initMouseTracking()
    }

    private initMouseListeners() {
        this.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true
            this.prevX = e.clientX
            this.prevY = e.clientY
        })

        window.addEventListener('mouseup', () => {
            this.isDragging = false
        })

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return
            const dx = e.clientX - this.prevX
            const dy = e.clientY - this.prevY
            this.prevX = e.clientX
            this.prevY = e.clientY

            this.theta -= dx * this.sensitivity
            this.phi -= dy * this.sensitivity
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi)) // clamp to avoid flipping
        })
    }

    private initMouseTracking() {
        this.domElement.addEventListener('mousemove', (e) => {
            if (!this.initialized) {
                this.prevX = e.clientX
                this.prevY = e.clientY
                this.initialized = true
                return
            }

            const dx = e.clientX - this.prevX
            const dy = e.clientY - this.prevY
            this.prevX = e.clientX
            this.prevY = e.clientY

            this.theta -= dx * this.sensitivity
            this.phi -= dy * this.sensitivity
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi)) // clamp to prevent flipping
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
