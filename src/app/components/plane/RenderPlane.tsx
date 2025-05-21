'use client'

import * as THREE from 'three'
import { RenderModel, RenderModelParams } from '../RenderModel'
import { FlightBody } from '../physics/FlightBody';

export class RenderPlane extends RenderModel {
    public ready: Promise<void>
    public solidReady: Promise<void>
    public wrapper: THREE.Group
    private visual: THREE.Group
    private hitboxMesh?: THREE.LineSegments
    private axes: THREE.AxesHelper
    
    private resolveReady!: () => void
    private resolveSolidReady!: () => void

    constructor(params: RenderModelParams) {
        super(params)
        this.info = params.info

        this.wrapper = new THREE.Group()
        if (params?.position) this.wrapper.position.copy(params.position)
            if (params?.rotation) {
            this.wrapper.rotation.set(
                THREE.MathUtils.degToRad(params.rotation?.x ?? 0),
                THREE.MathUtils.degToRad(params.rotation.y ?? 0),
                THREE.MathUtils.degToRad(params.rotation.z ?? 0)
            )
        }
        params.scene.add(this.wrapper)

        this.visual = new THREE.Group()
        this.wrapper.add(this.visual)

        this.axes = new THREE.AxesHelper(2)
        this.visual.add(this.axes)

        this.ready = new Promise(res => { this.resolveReady = res })
        this.solidReady = new Promise(res => { this.resolveSolidReady = res })
    }

    async load(): Promise<THREE.Group> {
        this.model = await super.load()

        this.params.scene.remove(this.model)

        this.model.position.set(0,0,0)
        this.model.quaternion.set(0,0,0,1)

        this.visual.add(this.model)

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

        this.resolveReady()
        return this.model
    }

    makeSolid(dynamic: boolean, debug: boolean) {
        if (this.solid) return;
        this.wrapper.updateWorldMatrix(true, false)

        this.solid = new FlightBody({
            model: this.wrapper,
            info: this.info,
            dynamic: dynamic,
            debug: debug
        })

        this.resolveSolidReady()
    }

    setHitbox() {
        if (this.hitboxMesh) {
            this.visual.remove(this.hitboxMesh)
            this.hitboxMesh.geometry.dispose()
            if (Array.isArray(this.hitboxMesh.material)) {
                this.hitboxMesh.material.forEach(mat => mat.dispose());
            } else {
                this.hitboxMesh.material.dispose();
            }
        }

        const bbox = new THREE.Box3().setFromObject(this.model)
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3())

        const geo  = new THREE.BoxGeometry(size.x, size.y, size.z)
        const edges = new THREE.EdgesGeometry(geo)
        geo.dispose()
        const mat = new THREE.LineBasicMaterial({ color: 0xffff00 })
        const box = new THREE.LineSegments(edges, mat)
        edges.dispose()

        this.visual.worldToLocal(center)
        box.position.copy(center)

        this.visual.add(box)
        this.hitboxMesh = box
    }


    setOrientation(pitch: number, yaw: number, roll: number) {
        const toRad = THREE.MathUtils.degToRad
        this.wrapper.rotation.set(
            toRad(pitch),
            toRad(yaw),
            toRad(roll)
        )
    }

    setPosition(pos: THREE.Vector3) {
        this.wrapper.position.copy(pos)
    }

    update(delta: number) {
        this.mixer?.update(delta)
    }

    updatePhysics() {
        this.solid?.updatePhysics()
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

    toggleHitboxVisibility(visible = false) {
        if (!this.hitboxMesh) return
        this.hitboxMesh.visible = visible
        this.axes.visible = visible
    }

    applyRotation(deltaPitch: number, deltaYaw: number, deltaRoll: number) {
        // Yaw around world up
        this.wrapper.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaYaw)

        // Pitch around local right (Y points right when forward is +X)
        this.wrapper.rotateOnAxis(new THREE.Vector3(0, 0, 1), deltaPitch)

        // Roll around actual forward vector (+X)
        this.wrapper.rotateOnAxis(new THREE.Vector3(1, 0, 0), deltaRoll)
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