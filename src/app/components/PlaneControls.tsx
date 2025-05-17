'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'
import { PlaneCameraRig } from './PlaneCameraRig'
import { PlaneAnimations } from './PlaneAnimations'

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

    private animator: PlaneAnimations

    private landingGearDown = true
    private weaponsBayDown = false

    
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

        this.animator = new PlaneAnimations({
            plane: this.plane
        })

        this.bindInput()
    }

    private bindInput() {
        window.addEventListener('keydown', (e) => {
            this.keysPressed.add(e.key.toLowerCase());

            if(e.key.toLowerCase() == 'c') {
                this.planeCamera.flipCamera(true)
            }
        })

        window.addEventListener('keyup', (e) => {
            this.keysPressed.delete(e.key.toLowerCase())

            if(e.key.toLowerCase() == 'c') {
                this.planeCamera.flipCamera(false)
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

    // PLANE ANIMATION CONTROL

    // This is the bread and butter that allows me to play any animation when any other animation is configured
    private playAnimationPart(
        clipName: string,
        speed: number,
        reverse: boolean,
    ) {
        const mixer = this.plane.mixer
        const clip = this.plane.animations[clipName]

        if (!mixer || !clip) return

        const action = mixer.clipAction(clip)

        action.stop()
        action.reset()
        action.setLoop(THREE.LoopOnce, 1)
        action.clampWhenFinished = true

        if (reverse) {
            action.time = clip.duration
            action.setEffectiveTimeScale(-speed)
        } else {
            action.setEffectiveTimeScale(speed)
        }

        return action
    }


    private toggleLandingGear() {
        this.playAnimationPart('Geardown', 1, this.landingGearDown)?.play()
        this.landingGearDown = !this.landingGearDown
    }

    private toggleWeaponsBay() {
        this.playAnimationPart('Weapons', 1, this.weaponsBayDown)?.play()
        this.weaponsBayDown = !this.weaponsBayDown
    }

    private processPitch() {
        this.animator.processPitch(this.mouseDelta.dy)
        this.mouseDelta.dy = 0 // to pause curr anim if mouse stops moving
    }

    
    // TICK/UPDATE FUNCTION

    update(delta: number) {
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


        if (this.keysPressed.has('g')) {
            this.toggleLandingGear()
            this.keysPressed.delete('g')
        }

        if (this.keysPressed.has('x')) {
            this.toggleWeaponsBay()
            this.keysPressed.delete('x')
        }

        this.processPitch()

        this.plane.mixer?.update(delta)
        this.updateCamera()
    }
}

