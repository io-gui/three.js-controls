/**
 * @author arodic / https://github.com/arodic
 */

import {Line} from "../../../three.js/build/three.module.js";
import {Helper} from "../Helper.js";
import {TransformHelper, Material} from "./TransformHelper.js";

export class SelectionHelper extends Helper {
	constructor(props) {
		super(props);
		const axis = new TransformHelper();
		axis.size = 0.05;
		this.add(axis);
		if (props.object && props.object.geometry) {
			this.add(new Line(props.object.geometry, new Material(0xffff99, 0.5)));
		}
	}
}
