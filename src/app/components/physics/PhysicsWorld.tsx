'use client'

import RAPIER from '@dimforge/rapier3d-compat'

let world: RAPIER.World
const FIXED_TIMESTEP = 1 / 120
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

export function createGround(x: number, y: number, z: number) {
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
    const groundBody = world.createRigidBody(groundBodyDesc)
    const groundCollider = RAPIER.ColliderDesc.cuboid(x, y, z)
        .setFriction(1.0)
        .setRestitution(0.2)
    world.createCollider(groundCollider, groundBody)
}