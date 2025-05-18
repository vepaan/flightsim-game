'use client'

import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'

export interface ControlSurfaceParams {
    plane: RenderPlane
    positiveClip: string
    negativeClip: string
    dragMax: number
}

export class ControlSurface {
    private plane: RenderPlane
    private pos = 0 // between -1 and 1
    private readonly dragMax: number
    private negative: THREE.AnimationAction
    private positive: THREE.AnimationAction
    private mixer: THREE.AnimationMixer

    constructor(params: ControlSurfaceParams) {
        this.plane = params.plane
        this.mixer = this.plane.mixer!
        this.dragMax = params.dragMax

        const positiveClip = this.plane.animations[params.positiveClip]
        const negativeClip = this.plane.animations[params.negativeClip]

        if (!positiveClip || !negativeClip) {
            throw new Error("Missing clips")
        }

        this.positive = this.mixer.clipAction(positiveClip)
        this.negative = this.mixer.clipAction(negativeClip)

        ;[this.positive, this.negative].forEach(a => {
            a.reset()
            a.setLoop(THREE.LoopOnce, 1)
            a.clampWhenFinished = true
            a.play()
            a.setEffectiveWeight(0) // mute initially
        })
    }

    update(deltaMouse: number) {
        const negDur = this.negative.getClip().duration
        const posDur = this.positive.getClip().duration

        this.pos += -deltaMouse / this.dragMax
        this.pos = THREE.MathUtils.clamp(this.pos, -1, 1)

        if (this.pos > 0) {
            this.positive.setEffectiveWeight(1);
            this.negative.setEffectiveWeight(0);
            this.positive.time = this.pos * posDur;
        }
        else if (this.pos < 0) {
            this.negative.setEffectiveWeight(1);
            this.positive.setEffectiveWeight(0);
            this.negative.time = -this.pos * negDur;
        }
        else {
            this.positive.setEffectiveWeight(0);
            this.negative.setEffectiveWeight(0);
        }

        //this.mixer.update(0)
    }

    getPosition() {
        return this.pos
    }

    getDragMax() {
        return this.dragMax
    }
}