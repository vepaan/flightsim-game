'use client'

import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { SolidBody, SolidBodyParams } from './SolidBody'

export interface FlightBodyParams extends SolidBodyParams {
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
    private wingArea: number = 10

    private liftCoefficient: number = 0.5
    private dragCoefficient: number = 0.02

    private thrustStrength: number = 10
    private torqueStrength: number = 1
    private yawStrength: number = 2

    private maxPitch: number = 20
    private maxRoll: number = 30

    private rudderArea: number = 1.2
    private yawCoeff: number = 0.8
    private yawDampingCoeff: number = 0.5

    private airDensity: number = 1.225

    constructor(params: FlightBodyParams) {
        super(params)

        this.plane = params.model

        const scale = new THREE.Vector3()
        this.plane.getWorldScale(scale)
        const factor = (scale.x * scale.y * scale.z) ** (1/3)
        
        if (!params.info) {
            console.error("Flight info not supplied in FlightBody constructor")
            return
        }

        this.fetchFlightSpecs(params.info)
            .then(res => {
                this.mass = res.mass * factor
                this.wingArea = res.wingArea * factor
                this.liftCoefficient = res.liftCoefficient
                this.dragCoefficient = res.dragCoefficient
                this.thrustStrength = res.thrustStrength * factor
                this.torqueStrength = res.torqueStrength * factor
                this.yawStrength = res.yawStrength * factor
                this.maxPitch = THREE.MathUtils.degToRad(res.maxPitchDeg)
                this.maxRoll = THREE.MathUtils.degToRad(res.maxRollDeg)
                this.rudderArea = res.rudderArea * factor
                this.yawCoeff = res.yawCoeff
                this.yawDampingCoeff = res.yawDampingCoeff
            })
            .catch(() => {})
            .finally(() => {
                this.createSimpleSolid()
            })
    }

    async fetchFlightSpecs(info: string): Promise<{
        mass: number,
        wingArea: number,
        liftCoefficient: number,
        dragCoefficient: number,
        thrustStrength: number,
        torqueStrength: number,
        yawStrength: number,
        maxPitchDeg: number,
        maxRollDeg: number,
        rudderArea: number,
        yawCoeff: number,
        yawDampingCoeff: number
    }> {
        try {
            const res = await fetch(info);
            if (!res.ok) throw new Error(res.statusText);
            return await res.json();
        } catch (err) {
            console.error("Failed to load info");
            return {
                mass: 10,
                wingArea: 10,
                liftCoefficient: 0.5,
                dragCoefficient: 0.02,
                thrustStrength: 10,
                torqueStrength: 1,
                yawStrength: 2,
                maxPitchDeg: 20,
                maxRollDeg: 30,
                rudderArea: 1.2,
                yawCoeff: 0.8,
                yawDampingCoeff: 0.5
            };
        }
    }


    // CONTROLS

    updateAerodynamics(delta: number) {
        if (!this.body) return

        // velocity and pressure
        const lv = this.body.linvel()
        const vel = new THREE.Vector3(lv.x, lv.y, lv.z)
        const speed = vel.length()

        if (speed < 0.1) return // neglect at low airspeed

        const vHat = vel.clone().normalize()
        const q = 0.5 * this.airDensity * speed * speed

        // lift
        const liftMag = q * this.wingArea * this.liftCoefficient
        const planeUp = new THREE.Vector3(0,1,0).applyQuaternion(this.plane.quaternion)
        const liftDir = planeUp.clone()
                        .sub(vHat.clone().multiplyScalar(planeUp.dot(vHat)))
                        .normalize()
        const lift = liftDir.multiplyScalar(liftMag)

        // drag
        const dragMag = q * this.wingArea * this.dragCoefficient
        const drag = vHat.clone().multiplyScalar(-dragMag)

        // yaw rate damping
        const av = this.body.angvel()
        const yawRate = new THREE.Vector3(av.x, av.y, av.z)
                        .dot(new THREE.Vector3(0, 1, 0).applyQuaternion(this.plane.quaternion))
        const dampMoment = -this.yawDampingCoeff * yawRate
        const upAxis = new THREE.Vector3(0,1,0).applyQuaternion(this.plane.quaternion)

        // impulses
        this.applyImpulse(lift.multiplyScalar(delta))
        this.applyImpulse(drag.multiplyScalar(delta))
        this.body.applyTorqueImpulse(upAxis.multiplyScalar(dampMoment * delta), true)
    }


    moveForward() {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.plane.quaternion)
        this.applyImpulse(dir.multiplyScalar(this.thrustStrength))
    }

    moveBackward() {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.plane.quaternion)
        this.applyImpulse(dir.multiplyScalar(this.thrustStrength))
    }

    processYaw(input: number, delta: number) {
        if (!this.body) return

        const lv = this.body.linvel()
        const vel = new THREE.Vector3(lv.x, lv.y, lv.z)
        const speed = vel.length()
        if (speed < 0.5) return
        const q = 0.5 * this.airDensity * speed * speed

        // rudder moment
        const defl = THREE.MathUtils.clamp(input, -1, 1)
        const moment = q * this.rudderArea * this.yawCoeff * defl

        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.plane.quaternion)
        const mag = moment * delta
        this.body?.applyTorqueImpulse(up.multiplyScalar(mag), true)
    }

    processPitch(input: number, delta: number) {
        if (!this.body) return

        const e = new THREE.Euler().setFromQuaternion(this.plane.quaternion, 'YXZ')
        const cur = e.x

        if ((input > 0 && cur >= this.maxPitch) ||
            (input < 0 && cur <= -this.maxPitch)) return


        const pitchAxis = new THREE.Vector3(-1, 0, 0)
            .applyQuaternion(this.plane.quaternion)

        const mag = this.torqueStrength * input * delta
        console.log("pitch magnitue is ", mag, input)

        this.applyTorqueImpulse(pitchAxis.multiplyScalar(mag))
    }

    processRoll(input: number, delta: number) {
        if (!this.body) return

        const e = new THREE.Euler().setFromQuaternion(this.plane.quaternion, 'ZYX')
        const cur = e.z

        if ((input > 0 && cur >= this.maxRoll) ||
            (input < 0 && cur <= -this.maxRoll)) return


        const rollAxis = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(this.plane.quaternion)

        const mag = this.torqueStrength * input * delta
        console.log("roll magnitue is ", mag, input)

        this.applyTorqueImpulse(rollAxis.multiplyScalar(mag))
    }
}