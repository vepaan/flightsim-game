'use client'

import * as THREE from 'three'
import { RenderModel, RenderModelParams } from '../RenderModel'
import { SolidBody } from '../physics/SolidBody';

export interface HitboxParams {
    dimensions: { length: number; width: number; height: number }
    position: { x: number; y: number; z: number }
    rotation: { pitch: number; yaw: number; roll: number }
}

export class RenderPlane extends RenderModel {
    public ready: Promise<void>
    public wrapper: THREE.Group
    private helper: THREE.BoxHelper
    private axes: THREE.AxesHelper
    private hitboxConfigured: boolean = false

    private resolveReady!: () => void

    constructor(params: RenderModelParams) {
        super(params)
        this.wrapper = new THREE.Group()

        this.axes = new THREE.AxesHelper(2)
        this.wrapper.add(this.axes)

        this.helper = new THREE.BoxHelper(this.wrapper, 0xffff00)

        params.scene.add(this.wrapper)
        params.scene.add(this.helper)

        this.ready = new Promise(res => { this.resolveReady = res })
    }

    async load(): Promise<THREE.Group> {
        this.model = await super.load()

        this.resolveReady()

        // if not alr in geardown, make it geardown
        if (this.mixer) {
            const key = Object.keys(this.animations)
                .find(n => n.toLowerCase() === 'geardown')
            if (key) {
                const clip = this.animations[key]
                const action = this.mixer.clipAction(clip)
                action.play()
                action.time = clip.duration
                this.mixer.update(0)
                action.paused = true
            }
        }

        return this.model
    }

    makeSolid(dynamic: boolean, debug: boolean) {
        if (this.solid) return;
        this.wrapper.updateWorldMatrix(true, false)

        this.solid = new SolidBody({
            model: this.wrapper,
            dynamic: dynamic,
            debug: debug
        })
    }

    setHitbox(params: HitboxParams) {
        const { length, width, height } = params.dimensions
        const { x, y, z } = params.position
        const { pitch, yaw, roll } = params.rotation

        this.wrapper.clear()

        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(length, height, width),
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                opacity: 0.4,
                transparent: true
            })
        )

        this.wrapper.add(cube)
        this.wrapper.add(this.axes)

        this.wrapper.position.set(x, y, z)
        this.wrapper.rotation.set(
            THREE.MathUtils.degToRad(pitch),
            THREE.MathUtils.degToRad(yaw),
            THREE.MathUtils.degToRad(roll)
        )

        this.helper.update()
        this.hitboxConfigured = true
    }

    lockHitbox() {
        if (!this.model || !this.hitboxConfigured) return

        this.params.scene.attach(this.model)
        this.wrapper.attach(this.model)

        this.model.position.set(0, 0, 0)
        this.model.rotation.set(0, 0, 0)
        this.helper.update()
    }

    setOrientation(pitch: number, yaw: number, roll: number) {
        const toRad = THREE.MathUtils.degToRad
        this.wrapper.rotation.set(
            toRad(pitch),
            toRad(yaw),
            toRad(roll)
        )
        this.helper.update()
    }

    setPosition(pos: THREE.Vector3) {
        this.wrapper.position.copy(pos)
        this.helper.update()
    }

    moveForward(thrust: number) {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.wrapper.quaternion)
        this.solid?.applyImpulse(dir.multiplyScalar(thrust))
        this.helper.update()
    }

    moveBackward(thrust: number) {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.wrapper.quaternion)
        this.solid?.applyImpulse(dir.multiplyScalar(thrust))
        this.helper.update()
    }

    update(delta: number) {
        this.mixer?.update(delta)
        this.helper?.update()
    }

    updatePhysics() {
        this.solid?.updatePhysics()
        this.helper.update()
    }

    get position() {
        return this.wrapper.position
    }

    get rotation() {
        return this.wrapper.rotation
    }

    get quaternion() {
        return this.wrapper.quaternion
    }

    toggleHitboxVisibility(visible?: boolean) {
        if (typeof visible === 'boolean') {
            this.hitboxConfigured = visible
        } else {
            this.hitboxConfigured = !this.hitboxConfigured
        }

        this.wrapper.children.forEach(child => {
            if (child instanceof THREE.Mesh || child instanceof THREE.AxesHelper) {
                child.visible = this.hitboxConfigured
            }
        })

        this.helper.visible = this.hitboxConfigured
    }

    applyRotation(deltaPitch: number, deltaYaw: number, deltaRoll: number) {
        // Yaw around world up
        this.wrapper.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaYaw)

        // Pitch around local right (Y points right when forward is +X)
        this.wrapper.rotateOnAxis(new THREE.Vector3(0, 0, 1), deltaPitch)

        // Roll around actual forward vector (+X)
        this.wrapper.rotateOnAxis(new THREE.Vector3(1, 0, 0), deltaRoll)

        this.helper.update()
    }

    unload() {
        if (this.wrapper) {
            this.params.scene.remove(this.wrapper);

            this.wrapper.traverse((child) => {
                if ((child as THREE.Mesh).geometry) {
                    (child as THREE.Mesh).geometry.dispose();
                }
                const material = (child as THREE.Mesh).material;
                if (material) {
                    if (Array.isArray(material)) {
                    material.forEach((mat) => this.disposeMaterial(mat));
                    } else {
                    this.disposeMaterial(material);
                    }
                }
            });

            this.wrapper = undefined!;
            this.model = undefined!;

        } else if (this.model) {
            this.params.scene.remove(this.model);
            this.model.traverse((child) => {
                if ((child as THREE.Mesh).geometry) {
                    (child as THREE.Mesh).geometry.dispose();
                }
                const material = (child as THREE.Mesh).material;
                if (material) {
                    if (Array.isArray(material)) {
                    material.forEach((mat) => this.disposeMaterial(mat));
                    } else {
                    this.disposeMaterial(material);
                    }
                }
            })
            this.model = undefined!;
        }
    }

}