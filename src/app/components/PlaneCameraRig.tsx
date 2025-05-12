'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'

export interface PlaneCameraRigParams {
    plane: RenderPlane
    camera: THREE.Camera
    domElement: HTMLElement
    sensitivity?: number
    defaultOffset: THREE.Vector3
}

export class PlaneCameraRig {
    private plane: RenderPlane
    private camera: THREE.Camera
    private domElement: HTMLElement
    private sensitivity: number
    
    private prevX = 0
    private prevY = 0
    private isDragging = false

    private accumulatedYaw = 0
    private accumulatedPitch = 0
    private accumulatedRoll = 0

    private defaultOffset: THREE.Vector3


    constructor(params: PlaneCameraRigParams) {
        this.plane = params.plane
        this.camera = params.camera
        this.domElement = params.domElement
        this.sensitivity = params.sensitivity ?? 0.002
        this.defaultOffset = params.defaultOffset

        this.initMouseListeners()
    }

    isDraggingMouse() {
        return this.isDragging
    }

    private initMouseListeners() {
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

    updateCamera() {
        const planePosition = new THREE.Vector3();
        this.plane.wrapper.getWorldPosition(planePosition);

        const planeQuaternion = new THREE.Quaternion();
        this.plane.wrapper.getWorldQuaternion(planeQuaternion);

        // Apply accumulated yaw/pitch/roll for free-look
        const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.accumulatedYaw
        );
        const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            this.accumulatedPitch
        );
        const rollQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            this.accumulatedRoll
        );

        const combinedQuaternion = new THREE.Quaternion()
            .copy(planeQuaternion)
            .multiply(yawQuaternion)
            .multiply(pitchQuaternion)
            .multiply(rollQuaternion);

        // default offset instead of fixed radius
        const offset = this.defaultOffset.clone().applyQuaternion(combinedQuaternion);

        this.camera.position.copy(planePosition).add(offset);
        this.camera.lookAt(planePosition);
    }

    accumulateCameraRotation(dx: number, dy: number, dz: number) {
        this.accumulatedYaw += dx * this.sensitivity
        this.accumulatedPitch += dy * this.sensitivity
        this.accumulatedRoll += dz * this.sensitivity
    }

    getSensitivity() {
        return this.sensitivity
    }

}
