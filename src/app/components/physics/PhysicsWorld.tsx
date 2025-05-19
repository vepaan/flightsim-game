'use client'

import RAPIER from '@dimforge/rapier3d-compat'

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