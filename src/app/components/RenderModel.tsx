import * as THREE from 'three'

export interface RenderModelParams {
    scene: THREE.Scene
    loader: THREE.Loader
    url: string
    scale?: number
    position?: THREE.Vector3
    rotation?: {x?: number; y?: number; z?: number}
}

export function RenderModel({
    scene,
    loader,
    url,
    scale = 1,
    position = new THREE.Vector3,
    rotation = {x: 0, y:0, z: 0}
}: RenderModelParams) : Promise<THREE.Group> {

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

                scene.add(model)
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