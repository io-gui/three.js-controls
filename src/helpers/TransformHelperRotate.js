import {Vector3, Matrix4, Quaternion} from "../../lib/three.module.js";
import {TransformHelper} from "./TransformHelper.js";
import {rotateHandleGeometry, rotatePickerGeometry, ringGeometry, ringPickerGeometry, circleGeometry} from "./HelperGeometries.js";

// Reusable utility variables
const tempVector = new Vector3(0, 0, 0);
const alignVector = new Vector3(0, 1, 0);
const zeroVector = new Vector3(0, 0, 0);
const lookAtMatrix = new Matrix4();
const tempQuaternion = new Quaternion();
const identityQuaternion = new Quaternion();

const unitX = new Vector3(1, 0, 0);
const unitY = new Vector3(0, 1, 0);
const unitZ = new Vector3(0, 0, 1);

export class TransformHelperRotate extends TransformHelper {
	get handlesGroup() {
		return {
			X: [{geometry: rotateHandleGeometry, color: [1, 0.3, 0.3], rotation: [Math.PI / 2, Math.PI / 2, 0]}],
			Y: [{geometry: rotateHandleGeometry, color: [0.3, 1, 0.3], rotation: [Math.PI / 2, 0, 0]}],
			Z: [{geometry: rotateHandleGeometry, color: [0.3, 0.3, 1], rotation: [0, 0, -Math.PI / 2]}],
			E: [{geometry: ringGeometry, color: [1, 1, 0.5], rotation: [Math.PI / 2, Math.PI / 2, 0], scale: 1.2}],
			XYZ: [
				{geometry: ringGeometry, color: [0.5, 0.5, 0.5], rotation: [Math.PI / 2, Math.PI / 2, 0]},
				{geometry: circleGeometry, color: [0.5, 0.5, 0.5, 0.1], rotation: [Math.PI / 2, Math.PI / 2, 0], scale: 0.25}
			],
		};
	}
	get pickersGroup() {
		return {
			X: [{geometry: rotatePickerGeometry, color: [1, 0, 0], rotation: [Math.PI / 2, Math.PI / 2, 0]}],
			Y: [{geometry: rotatePickerGeometry, color: [0, 1, 0], rotation: [Math.PI / 2, 0, 0]}],
			Z: [{geometry: rotatePickerGeometry, color: [0, 0, 1], rotation: [0, 0, -Math.PI / 2]}],
			E: [{geometry: ringPickerGeometry, rotation: [Math.PI / 2, Math.PI / 2, 0], scale: 1.2}],
			XYZ: [{geometry: circleGeometry, rotation: [Math.PI / 2, Math.PI / 2, 0], scale: 0.35}],
		};
	}
	updateAxis(axis){
		super.updateAxis(axis);
		axis.quaternion.copy(identityQuaternion);
		if (axis.has("E") || axis.has("XYZ")) {
			axis.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(alignVector, zeroVector, tempVector));
		}
		if (axis.is('X')) {
			tempQuaternion.setFromAxisAngle(unitX, Math.atan2(-alignVector.y, alignVector.z));
			tempQuaternion.multiplyQuaternions(identityQuaternion, tempQuaternion);
			axis.quaternion.copy(tempQuaternion);
		}
		if (axis.is('Y')) {
			tempQuaternion.setFromAxisAngle(unitY, Math.atan2(alignVector.x, alignVector.z));
			tempQuaternion.multiplyQuaternions(identityQuaternion, tempQuaternion);
			axis.quaternion.copy(tempQuaternion);
		}
		if (axis.is('Z')) {
			tempQuaternion.setFromAxisAngle(unitZ, Math.atan2(alignVector.y, alignVector.x));
			tempQuaternion.multiplyQuaternions(identityQuaternion, tempQuaternion);
			axis.quaternion.copy(tempQuaternion);
		}
	}
	updateHelperMatrix() {
		// TODO: simplify rotation handle logic
		const quaternion = this.space === "local" ? this.worldQuaternion : identityQuaternion;
		// Align handles to current local or world rotation
		tempQuaternion.copy(quaternion).inverse();
		alignVector.copy(this.eye).applyQuaternion(tempQuaternion);
		tempVector.copy(unitY).applyQuaternion(tempQuaternion);
		super.updateHelperMatrix();
	}
}
