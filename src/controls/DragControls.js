/**
 * @author arodic / https://github.com/arodic
 */

import {TransformControlsMixin} from "./TransformControlsMixin.js";

export class DragControls extends TransformControlsMixin(TransformHelper) {
	transform(space) {
		if (space === 'local') {
			this.object.position.copy(this.pointEnd).sub(this.pointStart).applyQuaternion(this.quaternionStart);
		} else {
			this.object.position.copy(this.pointEnd).sub(this.pointStart);
		}
		this.object.position.add(this.positionStart);
	}
}
