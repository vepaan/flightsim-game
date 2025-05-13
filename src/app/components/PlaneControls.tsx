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

class MouseDelta {
    public dx: number = 0
    public dy: number = 0
}

export class PlaneControls {
    private plane: RenderPlane
    private camera: THREE.Camera
    private domElement: HTMLElement
    private speed = 0.5

    private planeCamera: PlaneCameraRig

    private keysPressed = new Set<string>()

    private mouseDelta = new MouseDelta()

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
            this.keysPressed.add(e.key.toLowerCase());
        })

        window.addEventListener('keyup', (e) => {
            this.keysPressed.delete(e.key.toLowerCase())
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
            this.mouseDelta.dx = 0
            this.mouseDelta.dy = 0
        })

        window.addEventListener('mousemove', (e) => {
            if (this.planeCamera.isDraggingMouse()) return

            if (!initialized) {
                prevX = e.clientX
                prevY = e.clientY
                initialized = true
                return
            }

            this.mouseDelta.dx = e.clientX - prevX
            this.mouseDelta.dy = e.clientY - prevY
            prevX = e.clientX
            prevY = e.clientY
        })
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



    public updateCamera() {
        this.planeCamera.updateCamera()
    }

    public tick() {
        const move = this.speed
        const sensitivity = this.planeCamera.getSensitivity()
        const deltaRoll = this.mouseDelta.dx * sensitivity
        const deltaPitch = this.mouseDelta.dy * sensitivity

        if (!this.planeCamera.isDraggingMouse()) {
            this.plane.applyRotation(deltaPitch, 0, deltaRoll)
        }

        if (this.keysPressed.has('w')) this.plane.moveForward(move)
        if (this.keysPressed.has('s')) this.plane.moveBackward(move)
        if (this.keysPressed.has('a')) this.rotateYaw(1)
        if (this.keysPressed.has('d')) this.rotateYaw(-1)

        if (this.keysPressed.has('p')) this.rotatePitch(2)
        if (this.keysPressed.has('r')) this.rotateRoll(2)
        if (this.keysPressed.has('y')) this.rotateYaw(2)

        this.updateCamera()
    }
}

