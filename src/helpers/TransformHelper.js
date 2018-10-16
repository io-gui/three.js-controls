import {Vector3} from "../../lib/three.module.js";
import {Helper} from "../Helper.js";
import {HelperMesh} from "./HelperMesh.js";
import {HelperGeometry} from "./HelperGeometry.js";
import {Corner3Geometry} from "./HelperGeometries.js";
import {Animation} from "../../lib/Animation.js";

// Reusable utility variables
const AXIS_HIDE_TRESHOLD = 0.99;
const PLANE_HIDE_TRESHOLD = 0.1;
const AXIS_FLIP_TRESHOLD = 0;

function hasAxisAny(str, chars) {
	let has = true;
	str.split('').some(a => { if (chars.indexOf(a) === -1) has = false; });
	return has;
}

class HelperMeshes extends Array {
	constructor(groupDef) {
		super();
		for (let name in groupDef) {
			const mesh = new HelperMesh(groupDef[name]);
			mesh.name = name;
			this.push(mesh);
			this[name] = mesh;
		}
	}
}

const handleGeometry = {
	XYZ: new Corner3Geometry()
};

export class TransformHelper extends Helper {
	get handleGeometry() {
		return handleGeometry;
	}
	get pickerGeometry() {
		return {};
	}
	get guideGeometry() {
		return {};
	}
	constructor(props) {
		super(props);

		this.defineProperties({
			showX: {value: true, observer: 'paramChanged'},
			showY: {value: true, observer: 'paramChanged'},
			showZ: {value: true, observer: 'paramChanged'},
			axis: null,
			active: false,
			doHide: true,
			doFlip: true,
			hideX: { value: false, observer: 'paramChanged' },
			hideY: { value: false, observer: 'paramChanged' },
			hideZ: { value: false, observer: 'paramChanged' },
			hideXY: { value: false, observer: 'paramChanged' },
			hideYZ: { value: false, observer: 'paramChanged' },
			hideXZ: { value: false, observer: 'paramChanged' },
			flipX: { value: false, observer: 'paramChanged' },
			flipY: { value: false, observer: 'paramChanged' },
			flipZ: { value: false, observer: 'paramChanged' },
		});

		this.worldX = new Vector3();
		this.worldY = new Vector3();
		this.worldZ = new Vector3();
		this.axisDotEye = new Vector3();
		this.size = 0.05;

		this.handles = new HelperMeshes(this.handleGeometry);
		this.pickers = new HelperMeshes(this.pickerGeometry);
		this.guides = new HelperMeshes(this.guideGeometry);

		if (this.handles.length) this.add(...this.handles);
		if (this.pickers.length) this.add(...this.pickers);
		if (this.guides.length) this.add(...this.guides);

		// Hide pickers
		for (let i = 0; i < this.pickers.length; i++) this.pickers[i].material.visible = false;
		// for (let i = 0; i < this.guides.length; i++) this.guides[i].material.visible = false;

		// TODO: unhack
		for (let i = 0; i < this.guides.length; i++) {
			this.guides[i].isGuide = true; this.guides[i].highlight = -2;
		}

		this.animation = new Animation();

		this.animation.addEventListener('update', () => {
			this.dispatchEvent({type: 'change'});
		});
	}
	traverseAxis(callback) {
		for (let i = this.handles.length; i--;) callback(this.handles[i]);
		for (let i = this.pickers.length; i--;) callback(this.pickers[i]);
		for (let i = this.guides.length; i--;) callback(this.guides[i]);
	}
	spaceChanged() {
		super.spaceChanged();
		this.paramChanged();
		this.animateScaleUp();
	}
	objectChanged() {
		super.objectChanged();
		this.hideX = false;
		this.hideY = false;
		this.hideZ = false;
		this.hideXY = false;
		this.hideYZ = false;
		this.hideXZ = false;
		this.flipX = false;
		this.flipY = false;
		this.flipZ = false;
		this.animateScaleUp();
	}
	animateScaleUp() {
		this.traverseAxis(axis => {
			axis.scale.set(0.0001, 0.0001, 0.0001);
			axis.scaleTarget.set(1, 1, 1);
		});
		this.animation.startAnimation(0.5);
	}
	axisChanged() {
		this.traverseAxis(axis => {
			// Hide guides when not active axis
			axis.highlight = axis.isGuide ? -2 : 0;
			if (this.axis) {
				if (axis.isGuide) {
					axis.highlight = hasAxisAny(axis.name, this.axis) ? 0 : -2;
				} else {
					axis.highlight = hasAxisAny(axis.name, this.axis) ? 1 : -0.75;
				}
			}
		});
		this.animation.startAnimation(0.5);
	}
	paramChanged() {
		this.traverseAxis(axis => {
			axis.hidden = false;
			const name = axis.name.split('_').pop() || null;

			// Hide by show[axis] parameter
			if (this.doHide) {
				if (name.indexOf('X') !== -1 && !this.showX) axis.hidden = true;
				if (name.indexOf('Y') !== -1 && !this.showY) axis.hidden = true;
				if (name.indexOf('Z') !== -1 && !this.showZ) axis.hidden = true;
				if (name.indexOf('E') !== -1 && (!this.showX || !this.showY || !this.showZ)) axis.hidden = true;
				// Hide axis facing the camera
				if ((name == 'X' || name == 'XYZ') && this.hideX) axis.hidden = true;
				if ((name == 'Y' || name == 'XYZ') && this.hideY) axis.hidden = true;
				if ((name == 'Z' || name == 'XYZ') && this.hideZ) axis.hidden = true;
				if (name == 'XY' && this.hideXY) axis.hidden = true;
				if (name == 'YZ' && this.hideYZ) axis.hidden = true;
				if (name == 'XZ' && this.hideXZ) axis.hidden = true;
			}
			// Flip axis
			if (this.doFlip) {
				if (name.indexOf('X') !== -1 || axis.name.indexOf('R') !== -1) axis.scaleTarget.x = this.flipX ? -1 : 1;
				if (name.indexOf('Y') !== -1 || axis.name.indexOf('R') !== -1) axis.scaleTarget.y = this.flipY ? -1 : 1;
				if (name.indexOf('Z') !== -1 || axis.name.indexOf('R') !== -1) axis.scaleTarget.z = this.flipZ ? -1 : 1;
			}
		});
		this.animation.startAnimation(0.5);
	}
	updateHelperMatrix() {
		super.updateHelperMatrix();
		this.worldX.set(1, 0, 0).applyQuaternion(this.quaternion);
		this.worldY.set(0, 1, 0).applyQuaternion(this.quaternion);
		this.worldZ.set(0, 0, 1).applyQuaternion(this.quaternion);
		this.axisDotEye.set(this.worldX.dot(this.eye), this.worldY.dot(this.eye), this.worldZ.dot(this.eye));

		const xDotE = this.axisDotEye.x;
		const yDotE = this.axisDotEye.y;
		const zDotE = this.axisDotEye.z;

		// Hide axis facing the camera
		if (!this.active) {
			this.hideX = Math.abs(xDotE) > AXIS_HIDE_TRESHOLD;
			this.hideY = Math.abs(yDotE) > AXIS_HIDE_TRESHOLD;
			this.hideZ = Math.abs(zDotE) > AXIS_HIDE_TRESHOLD;
			this.hideXY = Math.abs(zDotE) < PLANE_HIDE_TRESHOLD;
			this.hideYZ = Math.abs(xDotE) < PLANE_HIDE_TRESHOLD;
			this.hideXZ = Math.abs(yDotE) < PLANE_HIDE_TRESHOLD;
			this.flipX = xDotE < AXIS_FLIP_TRESHOLD;
			this.flipY = yDotE < AXIS_FLIP_TRESHOLD;
			this.flipZ = zDotE < AXIS_FLIP_TRESHOLD;
		}

		this.traverseAxis(axis => this.updateAxis(axis));
	}
	// TODO: optimize, make less ugly and framerate independent!
	updateAxis(axis) {
		axis.visible = true;
		const highlight = axis.hidden ? -2 : axis.highlight || 0;
		axis.material.highlight = (4 * axis.material.highlight + highlight) / 5;
		if (axis.material.highlight < -1.99) axis.visible = false;
		axis.scale.multiplyScalar(5).add(axis.scaleTarget).divideScalar(6);
	}
}
