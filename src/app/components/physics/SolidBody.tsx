'use client'

import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { getPhysicsWorld } from './PhysicsWorld'

export interface SolidBodyParams {
    model: THREE.Object3D
    dynamic: boolean
    debug: boolean
}

export class SolidBody {

    private model: THREE.Object3D
    private dynamic: boolean
    private debug: boolean
    private body: RAPIER.RigidBody | undefined
    private colliders: RAPIER.ColliderDesc[] = []

    constructor(params: SolidBodyParams) {
        this.model = params.model
        this.dynamic = params.dynamic
        this.debug = params.debug
        this.createSolid()
    }

    private createSolid() {
        const world = getPhysicsWorld()

        const boundingBox = new THREE.Box3().setFromObject(this.model)
        const dimensions = new THREE.Vector3()
        boundingBox.getSize(dimensions)
        
        const center = new THREE.Vector3()
        boundingBox.getCenter(center)

        const halfExtents = dimensions.clone().multiplyScalar(0.5)
        
        const mainCollider = RAPIER.ColliderDesc
            .cuboid(
                halfExtents.x * 1.05, 
                halfExtents.y * 1.05, 
                halfExtents.z * 1.05
            )
            .setTranslation(
                center.x - this.model.position.x,
                center.y - this.model.position.y,
                center.z - this.model.position.z
            )
            .setFriction(0.7)
            .setRestitution(0.2)
            .setDensity(1)
        
        this.colliders.push(mainCollider)

        if (this.debug) {
            const boxGeometry = new THREE.BoxGeometry(
                halfExtents.x * 2 * 1.05, 
                halfExtents.y * 2 * 1.05, 
                halfExtents.z * 2 * 1.05
            );
            const boxMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            
            const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
            boxMesh.position.copy(center.clone().sub(this.model.position));
            this.model.add(boxMesh);
        }

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
        
        this.colliders.forEach(cd => 
            world.createCollider(cd, this.body)
        );
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

}