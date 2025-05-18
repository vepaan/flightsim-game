'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'
import { ControlSurface } from './ControlSurface'

export interface PlaneAnimationsParams {
    plane: RenderPlane
}

export class PlaneAnimations {

    private plane: RenderPlane

    public leftElevator: ControlSurface
    public rightElevator: ControlSurface

    public leftAlieron: ControlSurface
    public rightAlieron: ControlSurface

    public rudder: ControlSurface


    constructor(params: PlaneAnimationsParams) {
        this.plane = params.plane

        // ELEVATORS

        this.leftElevator = new ControlSurface({
            plane: this.plane,
            positiveClip: 'Lpitchup',
            negativeClip: 'Lpitchdown',
            dragMax: 20
        })

        this.rightElevator = new ControlSurface({
            plane: this.plane,
            positiveClip: 'Rpitchup',
            negativeClip: 'Rpitchdown',
            dragMax: 20
        })

        // ALIERONS

        this.leftAlieron = new ControlSurface({
            plane: this.plane,
            positiveClip: 'Lwingup',
            negativeClip: 'Lwingdown',
            dragMax: 20
        })

        this.rightAlieron = new ControlSurface({
            plane: this.plane,
            positiveClip: 'Rwingup',
            negativeClip: 'Rwingdown',
            dragMax: 20
        })

        // RUDDER

        this.rudder = new ControlSurface({
            plane: this.plane,
            positiveClip: 'Rudderright',
            negativeClip: 'Rudderleft',
            dragMax: 20
        })
    }

    playAnimationPart(
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


    // LANDING GEAR

    toggleLandingGear(landingGearDown: boolean) {
        this.playAnimationPart('Geardown', 1, landingGearDown)?.play()
    }

    // WEAPONS BAY

    toggleWeaponsBay(weaponsBayDown: boolean) {
        this.playAnimationPart('Weapons', 1, weaponsBayDown)?.play()
    }

    // LEFT ELEVATOR

    processLeftElevator(mouseDY: number) {
        this.leftElevator.update(mouseDY)
    }

    // RIGHT ELEVATOR

    processRightElevator(mouseDY: number) {
        this.rightElevator.update(mouseDY)
    }

    // LEFT AILERON

    processLeftAlieron(mouseDX: number) {
        this.leftAlieron.update(mouseDX)
    }

    // RIGHT ALIERON

    processRightAlieron(mouseDX: number) {
        this.rightAlieron.update(mouseDX)
    }

    // RUDDER

    processRudder(delta: number) {
        this.rudder.update(delta)
    }

}