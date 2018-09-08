/**
 * @author arodic / https://github.com/arodic
 */

import {Raycaster, Vector3, Quaternion, Plane} from "../../lib/three.module.js";
import {InteractiveMixin} from "../Interactive.js";

// Reusable utility variables
const ray = new Raycaster();
const rayTarget = new Vector3();
const tempVector = new Vector3();

// events
const changeEvent = { type: "change" };

export const TransformControlsMixin = (superclass) => class extends InteractiveMixin(superclass) {
	constructor(props) {
		super(props);

		this.visible = false;

		this.defineProperties({
			axis: null,
			active: false,
			pointStart: new Vector3(),
			pointEnd: new Vector3(),
			worldPositionStart: new Vector3(),
			worldQuaternionStart: new Quaternion(),
			worldScaleStart: new Vector3(), // TODO: remove
			positionStart: new Vector3(),
			quaternionStart: new Quaternion(),
			scaleStart: new Vector3(),
			plane: new Plane()
		});
	}
	// TODO: document
	hasAxis(str) {
		let has = true;
		str.split('').some(a => { if (this.axis.indexOf(a) === -1) has = false; });
		return has;
	}
	objectChanged(value) {
		let hasObject = value ? true : false;
		this.visible = hasObject;
		if (!hasObject) {
			this.active = false;
			this.axis = null;
		}
	}
	updateHelperMatrix() {
		if (this.object) {
			this.object.updateMatrixWorld();
			this.object.matrixWorld.decompose(this.worldPosition, this.worldQuaternion, this.worldScale);
		}
		this.camera.updateMatrixWorld();
		this.camera.matrixWorld.decompose(this.cameraPosition, this.cameraQuaternion, this.cameraScale);
		if (this.camera.isPerspectiveCamera) {
			this.eye.copy(this.cameraPosition).sub(this.worldPosition).normalize();
		} else if (this.camera.isOrthographicCamera) {
			this.eye.copy(this.cameraPosition).normalize();
		}
		super.updateHelperMatrix();
		this.updatePlane();
	}
	onPointerHover(pointers) {
		if (!this.object || this.active === true) return;
		ray.setFromCamera(pointers[0].position, this.camera); //TODO: unhack

		const intersect = ray.intersectObjects(this.pickers, true)[0] || false;
		if (intersect) {
			this.axis = intersect.object.name;
		} else {
			this.axis = null;
		}
		this.dispatchEvent({type:'change'})
	}
	onPointerDown(pointers) {
		if (this.axis === null || !this.object || this.active === true || pointers[0].button !== 0) return;
		ray.setFromCamera(pointers[0].position, this.camera);
		const planeIntersect = ray.ray.intersectPlane(this.plane, rayTarget);
		let space = (this.axis === 'E' || this.axis === 'XYZ') ? 'world' : this.space;
		if (planeIntersect) {
			this.object.updateMatrixWorld();
			if (this.object.parent) {
				this.object.parent.updateMatrixWorld();
			}
			this.positionStart.copy(this.object.position);
			this.quaternionStart.copy(this.object.quaternion);
			this.scaleStart.copy(this.object.scale);
			this.object.matrixWorld.decompose(this.worldPositionStart, this.worldQuaternionStart, this.worldScaleStart);
			this.pointStart.copy(planeIntersect).sub(this.worldPositionStart);
			if (space === 'local') this.pointStart.applyQuaternion(this.worldQuaternionStart.clone().inverse());
			this.active = true;
		}
	}
	onPointerMove(pointers) {
		let axis = this.axis;
		let object = this.object;
		let space = (axis === 'E' || axis === 'XYZ') ? 'world' : this.space;

		if (object === undefined || axis === null || this.active === false || pointers[0].button !== 0) return;

		ray.setFromCamera(pointers[0].position, this.camera);

		const planeIntersect = ray.ray.intersectPlane(this.plane, tempVector);

		if (!planeIntersect) return;

		this.pointEnd.copy(planeIntersect).sub(this.worldPositionStart);

		if (space === 'local') this.pointEnd.applyQuaternion(this.worldQuaternionStart.clone().inverse());

		this.transform(space);

		this.object.updateMatrixWorld();
		this.dispatchEvent(changeEvent);
	}
	onPointerUp(pointers) {
		if (pointers.length === 0) {
			this.active = false;
			if (pointers.removed[0].pointerType === 'touch') this.axis = null;
		} else {
			if (pointers[0].button === -1) this.axis = null;
		}
	}
	transform() {
		// TODO:
		return;
	}
	updateAxis(axis) {
		super.updateAxis(axis);
		this.highlightAxis(axis, this.axis);
	}
	highlightAxis(child, axis) {
		if (child.material) {
			const h = child.material.highlight;
			if (!this.enabled) {
				child.material.highlight = (15 * h -1) / 16;
				return;
			}
			if (axis) {
				if (this.hasAxis(child.name)) {
					child.material.highlight = (15 * h + 1) / 16;
					return;
				}
				child.material.highlight = (15 * h -1) / 16;
				return;
			}
			child.material.highlight = (15 * h) / 16;
		}
	}
	updatePlane() {
		const axis = this.axis;
		const normal = this.plane.normal;

		if (axis === 'X') normal.copy(this.worldX).cross(tempVector.copy(this.eye).cross(this.worldX));
		if (axis === 'Y') normal.copy(this.worldY).cross(tempVector.copy(this.eye).cross(this.worldY));
		if (axis === 'Z') normal.copy(this.worldZ).cross(tempVector.copy(this.eye).cross(this.worldZ));
		if (axis === 'XY') normal.copy(this.worldZ);
		if (axis === 'YZ') normal.copy(this.worldX);
		if (axis === 'XZ') normal.copy(this.worldY);
		if (axis === 'XYZ' || axis === 'E') this.camera.getWorldDirection(normal);

		this.plane.setFromNormalAndCoplanarPoint(normal, this.worldPosition);
	}
};
