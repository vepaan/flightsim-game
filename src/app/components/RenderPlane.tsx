import * as THREE from 'three'
import { RenderModel, RenderModelParams } from './RenderModel'

export class RenderPlane extends RenderModel {
    public wrapper: THREE.Group
    private helper: THREE.BoxHelper
    private axes: THREE.AxesHelper

    constructor(params: RenderModelParams) {
        super(params)
        this.wrapper = new THREE.Group()

        //hitbox
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.3, 2),
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                opacity: 0.4,
                transparent: true
            })
        )

        this.wrapper.add(cube)

        this.axes = new THREE.AxesHelper(2)
        this.wrapper.add(this.axes)

        this.helper = new THREE.BoxHelper(this.wrapper, 0xffff00)

        params.scene.add(this.wrapper)
        params.scene.add(this.helper)
    }

    async load(): Promise<THREE.Group> {
        this.model = await super.load()
        return this.wrapper
    }

    lockHitbox() {
        if (!this.model) return

        this.wrapper.position.copy(this.model.position)
        this.wrapper.quaternion.copy(this.model.quaternion)
        this.model.position.set(0, 0, 0)
        this.model.rotation.set(0, 0, 0)
        
        this.wrapper.add(this.model)
    }

    setOrientation(pitch: number, yaw: number, roll: number) {
        const toRad = THREE.MathUtils.degToRad

        const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), toRad(pitch))
        const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), toRad(yaw))
        const qRoll  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), toRad(roll))

        const combined = new THREE.Quaternion()
        combined.multiplyQuaternions(qYaw, qPitch).multiply(qRoll)

        this.wrapper.setRotationFromQuaternion(combined)
    }

    setPosition(pos: THREE.Vector3) {
        this.wrapper.position.copy(pos)
    }

    setScale(scale: number) {
        this.wrapper.scale.setScalar(scale)
    }

    moveForward(distance: number) {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.wrapper.quaternion)
        this.wrapper.position.add(dir.multiplyScalar(distance))
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
}