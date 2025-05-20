'use client'

import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { getPhysicsWorld } from './PhysicsWorld'

export interface SolidBodyParams {
    model: THREE.Object3D
    dynamic: boolean
    debug: boolean
    complex: boolean
}

export class SolidBody {

    private model: THREE.Object3D
    private dynamic: boolean
    private debug: boolean
    private body: RAPIER.RigidBody | undefined
    private simpleColliders: RAPIER.ColliderDesc[] = []
    private complexColliders: RAPIER.Collider[] = []

    constructor(params: SolidBodyParams) {
        this.model = params.model
        this.dynamic = params.dynamic
        this.debug = params.debug
        if (params.complex) {
            this.createComplexSolid()
        } else {
            this.createSimpleSolid()
        }
    }

    private createSimpleSolid() {
        const world = getPhysicsWorld()

        const boundingBox = new THREE.Box3().setFromObject(this.model)
        const dimensions = new THREE.Vector3()
        boundingBox.getSize(dimensions)
        
        const center = new THREE.Vector3()
        boundingBox.getCenter(center)

        const halfExtents = dimensions.clone().multiplyScalar(0.5)
        
        const mainCollider = RAPIER.ColliderDesc
            .cuboid(
                halfExtents.x * 1.05, 
                halfExtents.y * 1.05, 
                halfExtents.z * 1.05
            )
            .setTranslation(
                center.x - this.model.position.x,
                center.y - this.model.position.y,
                center.z - this.model.position.z
            )
            .setFriction(0.7)
            .setRestitution(0.2)
            .setDensity(1)
        
        this.simpleColliders.push(mainCollider)

        if (this.debug) {
            const boxGeometry = new THREE.BoxGeometry(
                halfExtents.x * 2 * 1.05, 
                halfExtents.y * 2 * 1.05, 
                halfExtents.z * 2 * 1.05
            );
            const boxMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            
            const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
            boxMesh.position.copy(center.clone().sub(this.model.position));
            this.model.add(boxMesh);
        }

        this.model.updateWorldMatrix(true, true)

        const worldPos = new THREE.Vector3()
        const worldQuat = new THREE.Quaternion()

        this.model.getWorldPosition(worldPos)
        this.model.getWorldQuaternion(worldQuat)

        let bodyDesc;
        if (this.dynamic) {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        } else {
            bodyDesc = RAPIER.RigidBodyDesc.fixed()
        }

        bodyDesc.setTranslation(worldPos.x, worldPos.y, worldPos.z)
            .setRotation({
                x: worldQuat.x,
                y: worldQuat.y,
                z: worldQuat.z,
                w: worldQuat.w
            })
            .setLinearDamping(0.1)  // Add damping to make movement more stable
            .setAngularDamping(0.1) // Reduce spinning
            .setCcdEnabled(true)

        this.body = world.createRigidBody(bodyDesc)
        
        this.simpleColliders.forEach(cd => 
            world.createCollider(cd, this.body)
        );
    }

    private createComplexSolid() {
        const world = getPhysicsWorld()
        
        // First create the rigid body
        this.model.updateWorldMatrix(true, true)
        const worldPos = new THREE.Vector3()
        const worldQuat = new THREE.Quaternion()
        this.model.getWorldPosition(worldPos)
        this.model.getWorldQuaternion(worldQuat)

        let bodyDesc
        if (this.dynamic) {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setCcdEnabled(true)
                .setLinearDamping(0.1)
                .setAngularDamping(0.1)
        } else {
            bodyDesc = RAPIER.RigidBodyDesc.fixed()
        }

        bodyDesc.setTranslation(worldPos.x, worldPos.y, worldPos.z)
            .setRotation({
                x: worldQuat.x,
                y: worldQuat.y,
                z: worldQuat.z,
                w: worldQuat.w
            })

        this.body = world.createRigidBody(bodyDesc)

        // Store all vertices and indices for debugging purposes
        const allVertices: number[] = []
        const allIndices: number[] = []
        let vertexOffset = 0
        
        // Track all mesh colliders for debugging
        const meshColliders: THREE.Mesh[] = []

        // Process all meshes in the model to create triangle mesh colliders
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Get the geometry
                const geometry = child.geometry
                
                // Force the geometry to be a BufferGeometry
                const bufferGeometry = child.geometry as THREE.BufferGeometry
                
                // Make sure geometry has been processed for rendering
                bufferGeometry.computeVertexNormals()
                
                // Get position attributes and indices
                const positionAttribute = bufferGeometry.getAttribute('position')
                let indices = bufferGeometry.getIndex()
                
                // Create vertices array in local space
                const vertices: number[] = []
                const tempVec = new THREE.Vector3()
                
                // Get transformation matrix
                child.updateWorldMatrix(true, false)
                const matrix = child.matrixWorld.clone()
                
                // Calculate the model's inverse matrix to convert to model space
                const modelInverseMatrix = new THREE.Matrix4().copy(this.model.matrixWorld).invert()
                
                // Combine matrices to transform vertices from local mesh space to body space
                const transformMatrix = new THREE.Matrix4().multiplyMatrices(modelInverseMatrix, matrix)
                
                // Extract vertices in the correct space
                for (let i = 0; i < positionAttribute.count; i++) {
                    tempVec.fromBufferAttribute(positionAttribute, i)
                    // Apply the mesh's world matrix and then the inverse of the model's world matrix
                    tempVec.applyMatrix4(transformMatrix)
                    vertices.push(tempVec.x, tempVec.y, tempVec.z)
                }

                // If no indices are present, create them (assuming triangle vertices)
                let indicesArray: number[] = []
                if (!indices) {
                    indicesArray = []
                    for (let i = 0; i < positionAttribute.count; i++) {
                        indicesArray.push(i)
                    }
                } else {
                    // Convert TypedArray to regular array
                    indicesArray = Array.from(indices.array)
                }
                
                // Store for debugging
                allVertices.push(...vertices)
                
                // Adjust indices to account for vertex offsets across multiple meshes
                const adjustedIndices = indicesArray.map(i => i + vertexOffset)
                allIndices.push(...adjustedIndices)
                vertexOffset += positionAttribute.count
                
                // Skip creating colliders for very complex meshes if dynamic
                // This is to avoid performance issues
                if (this.dynamic && indicesArray.length > 10000) {
                    console.warn("Skipping complex mesh collider for dynamic object:", indicesArray.length, "indices")
                    return
                }
                
                // Create trimesh collider
                try {
                    // For dynamic bodies, we use convex hull decomposition (which is more limited)
                    if (this.dynamic) {
                        // Create a simplified convex hull for dynamic objects
                        const colliderDesc = RAPIER.ColliderDesc.convexHull(
                            new Float32Array(vertices)
                        )
                        
                        if (colliderDesc) {
                            colliderDesc.setFriction(0.7)
                                .setRestitution(0.2)
                                .setDensity(1.0)

                            const collider = world.createCollider(colliderDesc, this.body)
                            this.complexColliders.push(collider)
                            
                            if (this.debug) {
                                this.createConvexHullDebugMesh(vertices)
                            }
                        }
                    } else {
                        // For static bodies, we can use more detailed triangle meshes
                        const colliderDesc = RAPIER.ColliderDesc.trimesh(
                            new Float32Array(vertices),
                            new Uint32Array(indicesArray)
                        )
                        
                        colliderDesc.setFriction(0.7)
                            .setRestitution(0.2)
                        
                        const collider = world.createCollider(colliderDesc, this.body)
                        this.complexColliders.push(collider)
                        
                        if (this.debug) {
                            // For static objects, we can just use the original mesh for visualization
                            const debugMaterial = new THREE.MeshBasicMaterial({
                                color: 0xff0000,
                                wireframe: true,
                                transparent: true,
                                opacity: 0.3
                            })
                            
                            const debugMesh = new THREE.Mesh(
                                bufferGeometry.clone(),
                                debugMaterial
                            )
                            debugMesh.matrix.copy(transformMatrix)
                            debugMesh.matrixAutoUpdate = false
                            this.model.add(debugMesh)
                            meshColliders.push(debugMesh)
                        }
                    }
                } catch (e) {
                    console.error("Failed to create triangle mesh collider:", e)
                    
                    // Fallback to a bounding box collider
                    const bbox = new THREE.Box3().setFromObject(child)
                    const size = new THREE.Vector3()
                    bbox.getSize(size)
                    const center = new THREE.Vector3()
                    bbox.getCenter(center)
                    
                    // Transform center to model space
                    center.applyMatrix4(transformMatrix)
                    
                    const colliderDesc = RAPIER.ColliderDesc.cuboid(
                        size.x * 0.5,
                        size.y * 0.5,
                        size.z * 0.5
                    ).setTranslation(
                        center.x,
                        center.y,
                        center.z
                    ).setFriction(0.7)
                    .setRestitution(0.2)
                    
                    const collider = world.createCollider(colliderDesc, this.body)
                    this.complexColliders.push(collider)
                    
                    if (this.debug) {
                        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z)
                        const boxMaterial = new THREE.MeshBasicMaterial({
                            color: 0x00ff00,
                            wireframe: true,
                            transparent: true,
                            opacity: 0.3
                        })
                        
                        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial)
                        boxMesh.position.copy(center)
                        this.model.add(boxMesh)
                    }
                }
            }
        })
        
        if (this.debug && allVertices.length > 0 && !this.dynamic) {
            console.log(`Created physics body with ${this.complexColliders.length} colliders, ${allVertices.length / 3} vertices, ${allIndices.length / 3} triangles`)
        }
    }

    private createConvexHullDebugMesh(vertices: number[]) {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        
        const material = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        })
        
        const debugMesh = new THREE.Mesh(geometry, material)
        this.model.add(debugMesh)
    }

    updatePhysics() {
        if (!this.body) return
        
        const t = this.body.translation()
        const r = this.body.rotation()

        this.model.position.set(t.x, t.y, t.z)
        this.model.quaternion.set(r.x, r.y, r.z, r.w)
    }

    applyImpulse(force: THREE.Vector3) {
        if (!this.body || !this.dynamic) return
        this.body.applyImpulse(
            {x: force.x, y: force.y, z: force.z},
            true
        )
    }

    applyTorqueImpulse(torque: THREE.Vector3) {
        if (!this.body || !this.dynamic) return;
        this.body.applyTorqueImpulse(
            {x:torque.x, y:torque.y, z:torque.z},
            true
        )
    }

}