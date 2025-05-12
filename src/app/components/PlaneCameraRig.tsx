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
    private isDragging = false

    private initialPhi: number
    private initialTheta: number

    private accumulatedYaw = 0
    private accumulatedPitch = 0


    constructor(params: PlaneCameraRigParams) {
        this.plane = params.plane
        this.camera = params.camera
        this.domElement = params.domElement
        this.radius = params.radius ?? 5
        this.sensitivity = params.sensitivity ?? 0.002

        // this setups initial cam pos
        this.phi = params.phi ?? 1.4
        this.theta = params.theta ?? Math.PI + 0.2

        this.initialPhi = this.phi
        this.initialTheta = this.theta
    }

    isDraggingMouse() {
        return this.isDragging
    }

    initMouseListeners() {
        window.addEventListener('mousedown', (e) => {
            if (e.button == 2) {
                this.isDragging = true
                this.prevX = e.clientX
                this.prevY = e.clientY
            }
        })

        window.addEventListener('contextmenu', (e) => e.preventDefault())

        window.addEventListener('mouseup', () => {
            this.isDragging = false
            // now i need to return cam to initial pos
            this.accumulatedPitch = 0
            this.accumulatedYaw = 0

            const rot = this.plane.wrapper.rotation

        // ✅ Correct orbit angles relative to current plane orientation
        this.initialTheta = rot.y + Math.PI
        this.initialPhi = Math.PI / 2 - rot.x + 0.17
            
        })

        // for dragging 360 cam
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return

            const dx = e.clientX - this.prevX
            const dy = e.clientY - this.prevY
            this.prevX = e.clientX
            this.prevY = e.clientY

            this.accumulatedYaw += dx * this.sensitivity
            this.accumulatedPitch += -dy * this.sensitivity

            //this.theta -= dx * this.sensitivity
            //this.phi -= dy * this.sensitivity
            //this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi)) // clamp to avoid flipping
        })
    }

    update360Cam() {
        //const phi = THREE.MathUtils.clamp(this.initialPhi + this.accumulatedPitch, 0.1, Math.PI - 0.1)
        const phi = this.initialPhi + this.accumulatedPitch
        const theta = this.initialTheta + this.accumulatedYaw

        const target = new THREE.Vector3()
        this.plane.wrapper.getWorldPosition(target)

        const x = this.radius * Math.sin(phi) * Math.cos(theta)
        const y = this.radius * Math.cos(phi)
        const z = this.radius * Math.sin(phi) * Math.sin(theta)

        this.camera.position.set(
            target.x + x,
            target.y + y,
            target.z + z
        )

        this.camera.lookAt(target)
    }

    updatePlaneCam() {
        // clamp phi because this is vertical angle and can cause cam to flip
        //const phi = THREE.MathUtils.clamp(this.initialPhi + this.accumulatedPitch, 0, Math.PI - 0)
        const phi = this.initialPhi + this.accumulatedPitch
        const theta = this.initialTheta + this.accumulatedYaw

        const target = new THREE.Vector3()
        this.plane.wrapper.getWorldPosition(target)

        const x = this.radius * Math.sin(phi) * Math.cos(theta)
        const y = this.radius * Math.cos(phi)
        const z = this.radius * Math.sin(phi) * Math.sin(theta)

        this.camera.position.set(
            target.x + x,
            target.y + y,
            target.z + z
        )

        this.camera.lookAt(target)
    }

    accumulateCameraRotation(dx: number, dy: number) {
        this.accumulatedYaw += dx * this.sensitivity
        this.accumulatedPitch += -dy * this.sensitivity
    }

    getSensitivity() {
        return this.sensitivity
    }

}
