'use client'

import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

let world: RAPIER.World
const FIXED_TIMESTEP = 1 / 60
let accumulator = 0

export async function initPhysics() {
    await RAPIER.init()
    world = new RAPIER.World({x: 0, y: -9.8, z: 0})
    return world
}

export function stepPhysics(delta: number) {
    accumulator += delta
    while (accumulator >= FIXED_TIMESTEP) {
        world.step()
        accumulator -= FIXED_TIMESTEP
    }
}

export function getPhysicsWorld() {
    return world
}

export interface CreateGroundParams {
    x: number
    y: number
    z: number
    position: THREE.Vector3
    rotation: THREE.Euler
    debug: boolean
    scene: THREE.Scene
}

export function createGround(params: CreateGroundParams) {
    const { x, y, z, position, rotation, debug, scene } = params
    const world = getPhysicsWorld()

    const quat = new THREE.Quaternion().setFromEuler(rotation)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(position.x, position.y, position.z)
        .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })

    const groundBody = world.createRigidBody(bodyDesc)

    const groundCollider = RAPIER.ColliderDesc.cuboid(x, y, z)
        .setFriction(1.0)
        .setRestitution(0.2)

    world.createCollider(groundCollider, groundBody)

    if (debug) {
        const geo = new THREE.BoxGeometry(x * 2, y * 2, z * 2)
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            depthTest: false,
            transparent: true,
            opacity: 0.5,
        })

        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.copy(position)
        mesh.rotation.copy(rotation)
        scene.add(mesh)
    }
}
