import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { SolidBody, SolidBodyParams } from './SolidBody'

export interface FlightBodyParams extends SolidBodyParams {
    helper: THREE.BoxHelper
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

    constructor(params: FlightBodyParams) {
        super(params)
        this.plane = params.model
        this.helper = params.helper
    }

    moveForward(thrust: number) {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.plane.quaternion)
        this.applyImpulse(dir.multiplyScalar(thrust))
        this.helper.update()
    }

    moveBackward(thrust: number) {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.plane.quaternion)
        this.applyImpulse(dir.multiplyScalar(thrust))
        this.helper.update()
    }
}