'use client'

import * as THREE from 'three'
import { SolidBody } from './physics/SolidBody'

export interface RenderModelParams {
    scene: THREE.Scene
    loader: THREE.Loader
    url: string
    scale?: number
    position?: THREE.Vector3
    rotation?: { x?: number; y?: number; z?: number } // in degrees
    isSolid: boolean
    dynamic: boolean
}

export class RenderModel {

    public model!: THREE.Group
    public mixer?: THREE.AnimationMixer
    public solid?: SolidBody
    public animations: Record<string, THREE.AnimationClip> = {}

    constructor(public params: RenderModelParams) {}

    async load(): Promise<THREE.Group> {
        const {
            scene,
            loader,
            url,
            scale = 1,
            position = new THREE.Vector3(),
            rotation = { x: 0, y: 0, z: 0 },
            isSolid,
            dynamic
        } = this.params

        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf: any) => {
                    const model = gltf.scene
                    model.scale.setScalar(scale)
                    model.position.copy(position)

                    const toRad = THREE.MathUtils.degToRad
                    model.rotation.set(
                        toRad(rotation.x ?? 0),
                        toRad(rotation.y ?? 0),
                        toRad(rotation.z ?? 0)
                    )

                    const mixer = new THREE.AnimationMixer(model)

                    this.model = model
                    this.mixer = mixer
                    
                    gltf.animations.forEach((clip: THREE.AnimationClip) => {
                        this.animations[clip.name] = clip
                    })

                    scene.add(model)
                    this.model = model

                    if (this.params.isSolid) {
                        this.solid = new SolidBody({
                            model: this.model,
                            dynamic: this.params.dynamic
                        })
                    }

                    resolve(model)
                },
                (event: ProgressEvent<EventTarget>) => {
                    const loaded = event.loaded
                    const total = event.total ?? loaded
                    console.log(`Model ${((loaded / total) * 100).toFixed(1)}% loaded`)
                },
                (error) => {
                    console.error('GLTF load error')
                    reject(error)
                }
            )
        })
    }

    unload() {
        if (!this.model) return;

        this.params.scene.remove(this.model);

        // Dispose of geometries, materials, and textures
        this.model.traverse((child) => {
            if ((child as THREE.Mesh).geometry) {
                (child as THREE.Mesh).geometry.dispose();
            }

            const material = (child as THREE.Mesh).material;
            if (material) {
                if (Array.isArray(material)) {
                    material.forEach((mat) => {
                        this.disposeMaterial(mat);
                    });
                } else {
                    this.disposeMaterial(material);
                }
            }
        });

        this.model = undefined!;
    }

    disposeMaterial(material: THREE.Material) {
        // Dispose textures
        for (const key in material) {
            const value = (material as any)[key];
            if (value instanceof THREE.Texture) {
                value.dispose();
            }
        }
        material.dispose();
    }

    playAnimation(name: string, speed: number = 1) {
        if (!this.mixer || !this.animations[name]) return

        this.mixer.stopAllAction()
        const action = this.mixer.clipAction(this.animations[name])

        console.log('Available animations:', Object.keys(this.animations));
        
        action.setLoop(THREE.LoopOnce, 10)
        action.clampWhenFinished = true
        action.reset()
        action.setEffectiveTimeScale(speed)
        action.play()
    }
}
