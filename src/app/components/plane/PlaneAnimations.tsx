'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'
import { ControlSurface } from './ControlSurface'

export interface PlaneAnimationsParams {
    plane: RenderPlane
}

export class PlaneAnimations {


    private plane: RenderPlane

    private leftElevator: ControlSurface
    private rightElevator: ControlSurface


    constructor(params: PlaneAnimationsParams) {
        this.plane = params.plane

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
    }

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


    // LANDING GEAR

    toggleLandingGear(landingGearDown: boolean) {
        this.playAnimationPart('Geardown', 1, landingGearDown)?.play()
    }

    // WEAPONS BAY

    toggleWeaponsBay(weaponsBayDown: boolean) {
        this.playAnimationPart('Weapons', 1, weaponsBayDown)?.play()
    }

    // LEFT PITCH

    processLPitch(mouseDY: number) {
        this.leftElevator.update(mouseDY)
    }

    // RIGHT PITCH

    processRPitch(mouseDY: number) {
        this.rightElevator.update(mouseDY)
    }

}