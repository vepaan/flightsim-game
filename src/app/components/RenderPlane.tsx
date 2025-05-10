import * as THREE from 'three'
import { RenderModel, RenderModelParams } from './RenderModel'

export interface HitboxParams {
    dimensions: { length: number; width: number; height: number }
    position: { x: number; y: number; z: number }
    rotation: { pitch: number; yaw: number; roll: number }
}

export class RenderPlane extends RenderModel {
    public wrapper: THREE.Group
    private helper: THREE.BoxHelper
    private axes: THREE.AxesHelper
    private hitboxConfigured: boolean = false

    constructor(params: RenderModelParams) {
        super(params)
        this.wrapper = new THREE.Group()

        this.axes = new THREE.AxesHelper(2)
        this.wrapper.add(this.axes)

        this.helper = new THREE.BoxHelper(this.wrapper, 0xffff00)

        params.scene.add(this.wrapper)
        params.scene.add(this.helper)
    }

    async load(): Promise<THREE.Group> {
        this.model = await super.load()
        return this.model
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

        this.wrapper.parent?.attach(this.model)
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

    moveForward(distance: number) {
        const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.wrapper.quaternion)
        this.wrapper.position.add(dir.multiplyScalar(distance))
        this.helper.update()
    }

    moveBackward(distance: number) {
        const dir = new THREE.Vector3(-1, 0, 0).applyQuaternion(this.wrapper.quaternion)
        this.wrapper.position.add(dir.multiplyScalar(distance))
        this.helper.update()
    }

    updateVisuals() {
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
}