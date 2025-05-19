'use client'

import * as THREE from 'three'

export interface SolidBodyParams {
    model: THREE.Group
}

export class SolidBody {

    private model: THREE.Group

    constructor(params: SolidBodyParams) {
        this.model = params.model
    }

}