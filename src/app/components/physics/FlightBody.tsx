'use client'

import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { SolidBody, SolidBodyParams } from './SolidBody'

export interface FlightBodyParams extends SolidBodyParams {
    helper: THREE.BoxHelper
    info: string | undefined
}

export interface FlightInputs {
    throttle: number
    pitch: number
    roll: number
    yaw: number
}

export class FlightBody extends SolidBody {

    private plane: THREE.Object3D
    private helper: THREE.BoxHelper
    private wingArea!: number
    private liftCoefficient!: number
    private dragCoefficient!: number
    private thrustStrength!: number
    private torqueStrength!: number

    constructor(params: FlightBodyParams) {
        super(params)
        this.plane = params.model
        this.helper = params.helper
        
        if (!params.info) {
            console.error("Flight info not supplied in FlightBody constructor")
            return
        }

        this.fetchFlightSpecs(params.info)
            .then(res => {
                this.wingArea = res.wingArea
                this.liftCoefficient = res.liftCoefficient
                this.dragCoefficient = res.dragCoefficient
                this.thrustStrength = res.thrustStrength
                this.torqueStrength = res.torqueStrength
            })
        }

    async fetchFlightSpecs(info: string): Promise<{
        wingArea: number,
        liftCoefficient: number,
        dragCoefficient: number,
        thrustStrength: number,
        torqueStrength: number
    }> {
        try {
            const res = await fetch(info);
            if (!res.ok) throw new Error(res.statusText);
            return await res.json();
        } catch (err) {
            console.error("Failed to load info");
            return {
                wingArea: 10,
                liftCoefficient: 0.5,
                dragCoefficient: 0.02,
                thrustStrength: 10,
                torqueStrength: 1
            };
        }
    }

    moveForward() {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.plane.quaternion)
        this.applyImpulse(dir.multiplyScalar(this.thrustStrength))
        this.helper.update()
    }

    moveBackward() {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.plane.quaternion)
        this.applyImpulse(dir.multiplyScalar(this.thrustStrength))
        this.helper.update()
    }

}