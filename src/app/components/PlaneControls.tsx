'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'
import { PlaneCameraRig } from './PlaneCameraRig'

export interface PlaneControlsParams {
    plane: RenderPlane
    camera: THREE.Camera
    domElement: HTMLElement
    scene: THREE.Scene
    camRadius: number
    camSensitivity: number
    camTheta: number
    camPhi: number
}

export class PlaneControls {
    private plane: RenderPlane
    private camera: THREE.Camera
    private domElement: HTMLElement
    private scene: THREE.Scene
    private speed = 0.5

    private planeCamera: PlaneCameraRig

    constructor(params: PlaneControlsParams) {
        this.plane = params.plane
        this.camera = params.camera
        this.domElement = params.domElement
        this.scene = params.scene

        this.planeCamera = new PlaneCameraRig({
            plane: this.plane,
            camera: this.camera,
            domElement: this.domElement,
            radius: params.camRadius,
            sensitivity: params.camSensitivity,
            theta: params.camTheta,
            phi: params.camPhi
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
            }
        })

        this.planeCamera.initMouseListeners()
        this.controlNose()
    }

    private controlNose() {
        // mouse input
        let prevX = 0
        let prevY = 0
        let initialized = false

        this.domElement.addEventListener('mousemove', (e) => {
            if (this.planeCamera.isDraggingMouse()) return

            if (!initialized) {
                prevX = e.clientX
                prevY = e.clientY
                initialized = true
                return
            }

            const now = performance.now() / 1000
            if (now - this.planeCamera.timeOf360CamStop < 0.15) return

            const dx = e.clientX - prevX
            const dy = e.clientY - prevY
            prevX = e.clientX
            prevY = e.clientY

            const sensitivity = 0.002
            const deltaYaw = dx * sensitivity
            const deltaPitch = -dy * sensitivity

            this.plane.applyRotation(deltaPitch, deltaYaw)
            this.planeCamera.accumulateCameraRotation(dx, dy)
        }
        )
    }

    private rotateYaw(degrees: number) {
        const currentRot = this.plane.rotation
        const toRad = THREE.MathUtils.degToRad
        const deltaYaw = toRad(degrees)

        this.plane.setOrientation(
            THREE.MathUtils.radToDeg(currentRot.x),
            THREE.MathUtils.radToDeg(currentRot.y + toRad(degrees)),
            THREE.MathUtils.radToDeg(currentRot.z)
        )
        
        const dx = deltaYaw / this.planeCamera.getSensitivity()
        this.planeCamera.accumulateCameraRotation(dx, 0)
    }

    public updateCameraFollow(offset = new THREE.Vector3(-5, 2, 0)) {
        const worldPos = new THREE.Vector3()
        this.plane.wrapper.getWorldPosition(worldPos)

        const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(this.plane.quaternion)
        const cameraPos = worldPos.clone().add(direction.multiplyScalar(offset.x))
        cameraPos.y += offset.y
        cameraPos.z += offset.z

        this.camera.position.lerp(cameraPos, 0.1) // smooth follow
        this.camera.lookAt(worldPos)
        
        if (this.planeCamera.isDraggingMouse()) {
            this.planeCamera.update360Cam()
        } else {
            this.planeCamera.updatePlaneCam()
        }
    }
}

