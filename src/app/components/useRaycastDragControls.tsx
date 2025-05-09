import * as THREE from 'three'

export function useRaycastDragControls(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    objects: THREE.Object3D[]
) {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersectPoint = new THREE.Vector3()
    let selected: THREE.Object3D | null = null

    function onMouseDown(event: MouseEvent) {
        updateMouse(event)
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(objects)
        if (hits.length) selected = hits[0].object
    }

    function onMouseMove(event: MouseEvent) {
        if (!selected) return
        updateMouse(event)
        raycaster.setFromCamera(mouse, camera)
        raycaster.ray.intersectPlane(plane, intersectPoint)
        selected.position.copy(intersectPoint)
        console.log(`(${intersectPoint.x.toFixed(2)}, ${intersectPoint.y.toFixed(2)}, ${intersectPoint.z.toFixed(2)})`)
    }

    function onMouseUp() {
        selected = null
    }

    function updateMouse(event: MouseEvent) {
        const rect = renderer.domElement.getBoundingClientRect()
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    function enable() {
        window.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    function disable() {
        window.removeEventListener('mousedown', onMouseDown)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }

    return { enable, disable }
}
