'use client'

import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { SolidBody, SolidBodyParams } from './SolidBody'
import { getPhysicsWorld } from './PhysicsWorld'

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

    private _halfExtents: THREE.Vector3 | null = null;
    private _bottomLocalY: number | null   = null;

    constructor(params: FlightBodyParams) {
        super(params)

        this.plane = params.model
        
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
                this.yawStrength = res.yawStrength
            })
            .catch(() => {})
        }

    async fetchFlightSpecs(info: string): Promise<{
        wingArea: number,
        liftCoefficient: number,
        dragCoefficient: number,
        thrustStrength: number,
        torqueStrength: number,
        yawStrength: number
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
                torqueStrength: 1,
                yawStrength: 2,
            };
        }
    }

    adjustColliderBottom(value: number) {
        if (!this.body) return;
        const world = getPhysicsWorld();

        if (this._halfExtents === null) {
            const bbox = new THREE.Box3().setFromObject(this.plane);
            const size = bbox.getSize(new THREE.Vector3());
            this._halfExtents = size.multiplyScalar(0.5);

            const worldCenter = bbox.getCenter(new THREE.Vector3());
            const localCenter = worldCenter.clone();
            this.plane.worldToLocal(localCenter);

            this._bottomLocalY = localCenter.y - this._halfExtents.y;
        }

        this._bottomLocalY! -= value

        const newCenterY = this._bottomLocalY! + this._halfExtents!.y;

        world.removeRigidBody(this.body);
        this.body = undefined;
        for (const c of (this as any)._colliders as RAPIER.Collider[]) {
            world.removeCollider(c, true);
        }
        (this as any)._colliders = [];

        const worldPos  = new THREE.Vector3();
        const worldQuat= new THREE.Quaternion();
        this.plane.getWorldPosition(worldPos);
        this.plane.getWorldQuaternion(worldQuat);

        const rbDesc = this.dynamic
            ? RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true)
            : RAPIER.RigidBodyDesc.fixed();
        rbDesc
            .setTranslation(worldPos.x, worldPos.y, worldPos.z)
            .setRotation({x:worldQuat.x, y:worldQuat.y, z:worldQuat.z, w:worldQuat.w})
            .setLinearDamping(0.1)
            .setAngularDamping(0.1);

        this.body = world.createRigidBody(rbDesc);

        const cd = RAPIER.ColliderDesc.cuboid(
            this._halfExtents!.x,
            this._halfExtents!.y,
            this._halfExtents!.z
        )
            .setTranslation(0, newCenterY, 0)
            .setFriction(0.7)
            .setRestitution(0.2)
            .setDensity(1);

        const newCol = world.createCollider(cd, this.body);
        (this as any)._colliders.push(newCol);
    }

    // CONTROLS

    moveForward() {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.plane.quaternion)
        console.log(dir)
        this.applyImpulse(dir.multiplyScalar(this.thrustStrength))
    }

    moveBackward() {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.plane.quaternion)
        this.applyImpulse(dir.multiplyScalar(this.thrustStrength))
    }

    applyYaw(input: number) {
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.plane.quaternion)
        const mag = this.yawStrength * input
        this.body?.applyTorqueImpulse(
            { x: up.x * mag,
            y: up.y * mag,
            z: up.z * mag },
            true 
        )
    }

    processPitch(input: number) {

        const pitchAxis = new THREE.Vector3(-1, 0, 0)
            .applyQuaternion(this.plane.quaternion)

        const mag = 1000000 * this.torqueStrength * input
        console.log("magnitue is ", mag, input)

        this.applyTorqueImpulse(
            new THREE.Vector3(
                pitchAxis.x * mag,
                pitchAxis.y * mag,
                pitchAxis.z * mag )
        )
    }
}