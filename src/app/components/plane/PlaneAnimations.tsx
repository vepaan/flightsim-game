'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'

export interface PlaneAnimationsParams {
    plane: RenderPlane
}

export class PlaneAnimations {

    private plane: RenderPlane

    private readonly maxPitchDrag = 20
    private elevatorPosition = 0;
    private pitchInited = false

    private elevatorDown!: THREE.AnimationAction  
    private elevatorUp!:   THREE.AnimationAction  


    constructor(params: PlaneAnimationsParams) {
        this.plane = params.plane
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


    // PITCH ANIMATIONS

    
    private initPitch() {
        const mixer = this.plane.mixer;
        if (!mixer || this.pitchInited) return;
        this.pitchInited = true;

        const downClip = this.plane.animations['Lpitchdown'];
        const upClip   = this.plane.animations['Lpitchup'];
        if (!downClip || !upClip) {
            console.warn('Missing down or up clip');
            return;
        }

        this.elevatorDown = mixer.clipAction(downClip);
        this.elevatorUp   = mixer.clipAction(upClip);

        [this.elevatorDown, this.elevatorUp].forEach(a => {
            a.reset();
            a.setLoop(THREE.LoopOnce, 1);
            a.clampWhenFinished = true;
            a.play();
            a.setEffectiveWeight(0); // mute initially
        });
    }

    processPitch(mouseDY: number) {
        this.initPitch();
        if (!this.elevatorDown || !this.elevatorUp) return;

        const downDur = this.elevatorDown.getClip().duration;
        const upDur   = this.elevatorUp.getClip().duration;

        // integrate mouse-dy into a persistent parameter
        this.elevatorPosition += -mouseDY / this.maxPitchDrag;
        this.elevatorPosition = THREE.MathUtils.clamp(this.elevatorPosition, -1, 1);

        // choose half-clip
        if (this.elevatorPosition < 0) {
            // down-side
            this.elevatorDown.setEffectiveWeight(1);
            this.elevatorUp.setEffectiveWeight(0);
            this.elevatorDown.time = Math.abs(this.elevatorPosition) * downDur;
        } else {
            // up-side
            this.elevatorUp.setEffectiveWeight(1);
            this.elevatorDown.setEffectiveWeight(0);
            this.elevatorUp.time = this.elevatorPosition * upDur;
        }

        // apply pose immediately
        this.plane.mixer?.update(0);
    }

}