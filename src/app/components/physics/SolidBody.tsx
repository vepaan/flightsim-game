'use client'

import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { getPhysicsWorld } from './PhysicsWorld'

export interface SolidBodyParams {
    model: THREE.Group
    dynamic: boolean
}

export class SolidBody {

    private model: THREE.Group
    private dynamic: boolean
    private body: RAPIER.RigidBody | undefined
    private colliders: RAPIER.ColliderDesc[] = []

    constructor(params: SolidBodyParams) {
        this.model = params.model
        this.dynamic = params.dynamic
        this.createSolid()
    }

    private createSolid() {

        const world = getPhysicsWorld()

        this.model.traverse(child => {
            if (child instanceof THREE.Mesh) {

                child.geometry.computeBoundingBox()
                const bbox = child.geometry.boundingBox!
                const size = new THREE.Vector3();
                bbox.getSize(size) // size = max - min

                const halfExtents = size.multiplyScalar(0.5)

                const center = new THREE.Vector3()
                bbox.getCenter(center)

                // account for scaling
                halfExtents.x *= child.scale.x
                halfExtents.y *= child.scale.y
                halfExtents.z *= child.scale.z
                center.multiply(child.scale)

                const colliderDesc = RAPIER.ColliderDesc
                    .cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
                    .setTranslation(center.x, center.y, center.z)

                this.colliders.push(colliderDesc)
            }
        })

        this.model.updateWorldMatrix(true, false)

        const worldPos = new THREE.Vector3()
        const worldQuat = new THREE.Quaternion()

        this.model.getWorldPosition(worldPos)
        this.model.getWorldQuaternion(worldQuat)

        let bodyDesc = null

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

        this.body = world.createRigidBody(bodyDesc)
        this.colliders.forEach(cd => 
            world.createCollider(cd, this.body)
        )

        console.log("Solid ready")
    }

    updatePhysics() {
        if (!this.body) return
        
        const t = this.body.translation()
        const r = this.body.rotation()

        this.model.position.set(t.x, t.y, t.z)
        this.model.quaternion.set(r.x, r.y, r.z, r.w)
    }

}