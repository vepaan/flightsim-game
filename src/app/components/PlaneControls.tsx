'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'
import { PlaneCameraRig } from './PlaneCameraRig'

export interface PlaneControlsParams {
    plane: RenderPlane
    camera: THREE.Camera
    domElement: HTMLElement
    camSensitivity: number
    camDefaultOffset: THREE.Vector3
}

export class PlaneControls {
    private plane: RenderPlane
    private camera: THREE.Camera
    private domElement: HTMLElement
    private speed = 0.5

    private planeCamera: PlaneCameraRig

    constructor(params: PlaneControlsParams) {
        this.plane = params.plane
        this.camera = params.camera
        this.domElement = params.domElement

        this.planeCamera = new PlaneCameraRig({
            plane: this.plane,
            camera: this.camera,
            domElement: this.domElement,
            sensitivity: params.camSensitivity,
            defaultOffset: params.camDefaultOffset
        })

        this.bindInput()
    }

    private bindInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.key.toLowerCase()) {
                case 'w':
                    this.plane.moveForward(this.speed)
                    break
                case 's':
                    this.plane.moveBackward(this.speed)
                    break
                case 'a':
                    this.rotateYaw(-2)
                    break
                case 'd':
                    this.rotateYaw(2)
                    break

                case 'p':
                    this.rotatePitch(2)
                    break
                case 'r':
                    this.rotateRoll(2)
                    break
                case 'y':
                    this.rotateYaw(2)
                    break
            }
        })

        this.controlNose()
    }

    private controlNose() {
        // mouse input
        let prevX = 0
        let prevY = 0
        let initialized = false

        window.addEventListener('mouseup', () => {
            initialized = false //reset the nose controller 
        })

        window.addEventListener('mousemove', (e) => {
            if (this.planeCamera.isDraggingMouse()) return

            if (!initialized) {
                prevX = e.clientX
                prevY = e.clientY
                initialized = true
                return
            }

            const dx = e.clientX - prevX
            const dy = e.clientY - prevY
            prevX = e.clientX
            prevY = e.clientY

            const deltaRoll = dx * this.planeCamera.getSensitivity()
            const deltaPitch = dy * this.planeCamera.getSensitivity()
            const deltaYaw = 0

            this.plane.applyRotation(deltaPitch, deltaYaw, deltaRoll)
            
            this.planeCamera.updateCamera()
        }
        )
    }

    // FUNDAMENTAL AXES CONTROLS

    private rotatePitch(degrees: number) {
        const delta = THREE.MathUtils.degToRad(degrees)
        this.plane.applyRotation(delta, 0, 0) // pitch = x
        this.planeCamera.accumulateCameraRotation(0, 0, delta)
    }

    private rotateYaw(degrees: number) {
        const delta = THREE.MathUtils.degToRad(degrees)
        this.plane.applyRotation(0, delta, 0) // yaw = y
        this.planeCamera.accumulateCameraRotation(delta, 0, 0)
    }

    private rotateRoll(degrees: number) {
        const delta = THREE.MathUtils.degToRad(degrees)
        this.plane.applyRotation(0, 0, delta) // roll = z
        this.planeCamera.accumulateCameraRotation(0, delta, 0)
    }



    public updateCameraFollow() {
        this.planeCamera.updateCamera()
    }
}

