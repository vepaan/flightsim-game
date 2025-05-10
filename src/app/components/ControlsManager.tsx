'use client'

import * as THREE from 'three'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export class TransformControlManager {
    public controls: InstanceType<typeof TransformControls>

    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement,
        scene: THREE.Scene,
        linkedOrbitControls?: { enabled: boolean }
    ) {
        this.controls = new TransformControls(camera, domElement)

        scene.add(this.controls.getHelper())

        this.controls.addEventListener('dragging-changed', (event: any) => {
            if (linkedOrbitControls) {
                linkedOrbitControls.enabled = !event.value
            }
        })

        this.controls.addEventListener('objectChange', () => {
            const obj = this.controls.object
            if (obj) {
                console.clear()
                const pos = obj.position
                const rot = obj.rotation
                const scale = obj.scale

                const toDeg = THREE.MathUtils.radToDeg
                console.log(`Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`)
                console.log(`Rotation (deg): (${toDeg(rot.x).toFixed(2)}, ${toDeg(rot.y).toFixed(2)}, ${toDeg(rot.z).toFixed(2)})`)
                console.log(`Scale: (${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`)
            }
        })

        window.addEventListener('keydown', (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case 't':
                    this.controls.setMode('translate')
                    break
                case 'r':
                    this.controls.setMode('rotate')
                    break
                case 's':
                    this.controls.setMode('scale')
                    break
            }
        })
    }

    attach(object: THREE.Object3D) {
        this.controls.attach(object)
    }

    detach() {
        this.controls.detach()
    }

    update() {
        this.controls.update()
    }
}

export class OrbitControlsManager {
    public controls: InstanceType<typeof OrbitControls>

    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement
    ) {
        this.controls = new OrbitControls(camera, domElement)
        this.controls.target.set(0, 0.6, 0)
        this.controls.enableDamping = true

        this.controls.addEventListener('change', () => {
            console.clear()
            console.log(`Camera Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
        })       
    }

    update() {
        this.controls.update()
    }

    enable() {
        this.controls.enabled = true
    }

    disable() {
        this.controls.enabled = false
    }

    setTarget(target: THREE.Vector3) {
        this.controls.target.copy(target)
    }
}
