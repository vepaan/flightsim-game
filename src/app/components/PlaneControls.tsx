import * as THREE from 'three'
import { RenderPlane } from './RenderPlane'

export interface PlaneControlsParams {
    plane: RenderPlane
    camera: THREE.Camera
    domElement: HTMLElement
    scene: THREE.Scene
}

export class PlaneControls {
    private plane: RenderPlane
    private camera: THREE.Camera
    private domElement: HTMLElement
    private scene: THREE.Scene
    private speed = 0.5

    constructor(params: PlaneControlsParams) {
        this.plane = params.plane
        this.camera = params.camera
        this.domElement = params.domElement
        this.scene = params.scene

        this.bindInput()
    }

    private bindInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.key.toLowerCase()) {
                case 'w':
                    this.plane.moveForward(this.speed)
                    break
                case 's':
                    this.plane.moveBackward(this.speed)
                    break
                case 'a':
                    this.rotateYaw(2)
                    break
                case 'd':
                    this.rotateYaw(-2)
                    break
            }
        })
    }

    private rotateYaw(degrees: number) {
        const currentRot = this.plane.rotation
        const toRad = THREE.MathUtils.degToRad
        this.plane.setOrientation(
            THREE.MathUtils.radToDeg(currentRot.x),
            THREE.MathUtils.radToDeg(currentRot.y + toRad(degrees)),
            THREE.MathUtils.radToDeg(currentRot.z)
        )
    }

    public updateCameraFollow(offset = new THREE.Vector3(-5, 2, 0)) {
        const worldPos = new THREE.Vector3()
        this.plane.wrapper.getWorldPosition(worldPos)

        const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(this.plane.quaternion)
        const cameraPos = worldPos.clone().add(direction.multiplyScalar(offset.x))
        cameraPos.y += offset.y
        cameraPos.z += offset.z

        this.camera.position.lerp(cameraPos, 0.1) // smooth follow
        this.camera.lookAt(worldPos)
    }
}

