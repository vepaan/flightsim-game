'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'
import { PlaneCameraRig } from './PlaneCameraRig'
import { PlaneAnimations } from './PlaneAnimations'
import { FlightBody } from '../physics/FlightBody'

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
    private planeBody: FlightBody | undefined
    private camera: THREE.Camera
    private domElement: HTMLElement

    private planeCamera: PlaneCameraRig

    private keysPressed = new Set<string>()

    private mouseDelta = new MouseDelta()

    private animator: PlaneAnimations | undefined

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

        this.plane.ready.then(() => {
            this.animator = new PlaneAnimations({
                plane: this.plane
            })
        })

        this.plane.solidReady.then(() => {
            this.planeBody = this.plane.solid as FlightBody
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



    public updateCamera() {
        this.planeCamera.updateCamera()
    }


    // CONTROL SURFACES

    private toggleLandingGear() {
        this.animator?.toggleLandingGear(this.landingGearDown)
        this.landingGearDown = !this.landingGearDown
    }

    private toggleWeaponsBay() {
        this.animator?.toggleWeaponsBay(this.weaponsBayDown)
        this.weaponsBayDown = !this.weaponsBayDown
    }

    private processPitch(delta: number) {
        const input = this.mouseDelta.dy

        this.planeBody?.processPitch(input, delta)

        this.animator?.processLeftElevator(input)
        this.animator?.processRightElevator(input)
        this.mouseDelta.dy = 0
    }

    private processYaw(delta: number) {
        let rudderDelta = 0

        if (this.keysPressed.has('a')) {
            this.planeBody?.processYaw(1, delta)
            if (this.animator) rudderDelta = this.animator?.rudder.getDragMax()
        } else if (this.keysPressed.has('d')) {
            this.planeBody?.processYaw(-1, delta)
            if (this.animator) rudderDelta = -this.animator?.rudder.getDragMax()
        } else {
            if (!this.animator) return
            const pos = this.animator?.rudder.getPosition()
            rudderDelta = pos * this.animator.rudder.getDragMax()
        }

        this.animator?.processRudder(rudderDelta)
    }

    private processRoll(delta: number) {
        const input = this.mouseDelta.dx

        this.planeBody?.processRoll(input, delta)

        this.animator?.processLeftAlieron(input)
        this.animator?.processRightAlieron(-input)
        this.mouseDelta.dx = 0 // pause if mouse stops moving
    }

    
    // TICK/UPDATE FUNCTION

    update(delta: number) {
        const sensitivity = this.planeCamera.getSensitivity()
        const deltaRoll = this.mouseDelta.dx * sensitivity
        const deltaPitch = this.mouseDelta.dy * sensitivity

        if (!this.planeCamera.isDraggingMouse()) {
            //this.plane.applyRotation(deltaPitch, 0, deltaRoll)
            this.processPitch(delta); 
            this.processRoll(delta)
        }

        if (this.keysPressed.has('w')) this.moveForward()
        if (this.keysPressed.has('s')) this.moveBackward()


        // executes for a or d is pressed
        this.processYaw(delta)


        if (this.keysPressed.has('g')) {
            this.toggleLandingGear()
            this.keysPressed.delete('g')
        }

        if (this.keysPressed.has('x')) {
            this.toggleWeaponsBay()
            this.keysPressed.delete('x')
        }

        this.planeBody?.updateAerodynamics(delta)
        this.plane.mixer?.update(delta)
        this.updateCamera()
    }

    // CONTROLS

    moveForward() {
        if (this.planeBody) {
            this.planeBody.moveForward()
        } else {
            console.log("not working")
        }
    }

    moveBackward() {
        if (this.planeBody) {
            this.planeBody.moveBackward()
        } else {
            console.log("not working")
        }
    }
}

