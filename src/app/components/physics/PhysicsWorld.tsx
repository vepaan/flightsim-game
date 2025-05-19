import RAPIER from '@dimforge/rapier3d-compat'

let world: RAPIER.World

export async function initPhysics() {
    await RAPIER.init()
    world = new RAPIER.World({x: 0, y: -9.8, z: 0})
    return world
}

export function stepPhysics(delta: number) {
    world.step()
}

export function getPhysicsWorld() {
    return world
}