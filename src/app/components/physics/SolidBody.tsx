'use client'

import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { getPhysicsWorld } from './PhysicsWorld'

export interface SolidBodyParams {
    model: THREE.Object3D
    mass?: number
    dynamic: boolean
    debug: boolean
}

export class SolidBody {

    public model: THREE.Object3D
    public mass?: number
    public dynamic: boolean
    private debug: boolean
    public body: RAPIER.RigidBody | undefined
    public simpleColliders: RAPIER.ColliderDesc[] = []

    private _colliders: RAPIER.Collider[] = []

    constructor(params: SolidBodyParams) {
        this.model = params.model
        this.mass = params.mass
        this.dynamic = params.dynamic
        this.debug = params.debug
    }

    createSimpleSolid() {
        const world = getPhysicsWorld()
        this.simpleColliders = []

        const boundingBox = new THREE.Box3().setFromObject(this.model)
        const dimensions = new THREE.Vector3()
        boundingBox.getSize(dimensions)
        
        const worldCenter = new THREE.Vector3()
        boundingBox.getCenter(worldCenter)

        const localCenter = worldCenter.clone()
        this.model.worldToLocal(localCenter)

        const halfExtents = dimensions.clone().multiplyScalar(0.5)
        const volume = halfExtents.x * halfExtents.y * halfExtents.z * 8

        const scale = new THREE.Vector3()
        this.model.getWorldScale(scale)

        const density = this.mass ? (this.mass * scale.x * scale.y * scale.z) / volume : 1
        
        console.log("density is", density)

        const mainCollider = RAPIER.ColliderDesc
            .cuboid(
                halfExtents.x * 1.05, 
                halfExtents.y * 1.05, 
                halfExtents.z * 1.05
            )
            .setTranslation(
                localCenter.x,
                localCenter.y,
                localCenter.z
            )
            .setFriction(0.7)
            .setRestitution(0.2)
            .setDensity(density)
        
        this.simpleColliders.push(mainCollider)

        this.model.updateWorldMatrix(true, true)

        const worldPos = new THREE.Vector3()
        const worldQuat = new THREE.Quaternion()

        this.model.getWorldPosition(worldPos)
        this.model.getWorldQuaternion(worldQuat)

        let bodyDesc;
        if (this.dynamic) {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        } else {
            bodyDesc = RAPIER.RigidBodyDesc.fixed()
        }

        bodyDesc.setTranslation(worldPos.x, worldPos.y, worldPos.z)
            .setRotation({
                x: worldQuat.x,
                y: worldQuat.y,
                z: worldQuat.z,
                w: worldQuat.w
            })
            .setLinearDamping(0.1)  // Add damping to make movement more stable
            .setAngularDamping(0.1) // Reduce spinning
            .setCcdEnabled(true)

        this.body = world.createRigidBody(bodyDesc)
        
        this.simpleColliders.forEach(cd => {
            const c = world.createCollider(cd, this.body)
            this._colliders.push(c)
        })
    }

    updatePhysics() {
        if (!this.body) return
        
        const t = this.body.translation()
        const r = this.body.rotation()

        this.model.position.set(t.x, t.y, t.z)
        this.model.quaternion.set(r.x, r.y, r.z, r.w)
    }

    applyImpulse(force: THREE.Vector3) {
        if (!this.body || !this.dynamic) return
        this.body.applyImpulse(
            {x: force.x, y: force.y, z: force.z},
            true
        )
    }

    applyTorqueImpulse(torque: THREE.Vector3) {
        if (!this.body || !this.dynamic) return;
        this.body.applyTorqueImpulse(
            {x:torque.x, y:torque.y, z:torque.z},
            true
        )
    }

}