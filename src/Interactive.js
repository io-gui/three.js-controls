/**
 * @author arodic / https://github.com/arodic
 */

import {Object3D} from "../../three.js/build/three.module.js";
import {PointerEvents} from "../lib/PointerEvents.js";
import {IoLiteMixin} from "../lib/IoLiteMixin.js";

// TODO: documentation
/*
 * onKeyDown, onKeyUp require domElement to be focused (set tabindex attribute)
 */

// TODO: implement dom element swap and multiple dom elements

export class Interactive extends IoLiteMixin(Object3D) {
	constructor(domElement) {
		super();

		this.defineProperties({
			domElement: domElement,
			enabled: true,
			active: false,
			enableKeys: true,
			needsUpdate: false,
			_animationActive: false,
			_animationTime: 0,
			_rafID: 0,
			_pointerEvents: new PointerEvents(domElement, {normalized: true})
		});

		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerHover = this.onPointerHover.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onContextmenu = this.onContextmenu.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onBlur = this.onBlur.bind(this);

		this._addEvents();
		this.needsUpdate = true;
	}
	dispose() {
		this._removeEvents();
		this._pointerEvents.dispose();
		this.stopAnimation();
	}
	_addEvents() {
		this._pointerEvents.addEventListener('pointerdown', this.onPointerDown);
		this._pointerEvents.addEventListener('pointerhover', this.onPointerHover);
		this._pointerEvents.addEventListener('pointermove', this.onPointerMove);
		this._pointerEvents.addEventListener('pointerup', this.onPointerUp);
		this._pointerEvents.addEventListener('keydown', this.onKeyDown);
		this._pointerEvents.addEventListener('keyup', this.onKeyUp);
		this._pointerEvents.addEventListener('wheel', this.onWheel);
		this._pointerEvents.addEventListener('contextmenu', this.onContextmenu);
		this._pointerEvents.addEventListener('focus', this.onFocus);
		this._pointerEvents.addEventListener('blur', this.onBlur);
	}
	_removeEvents() {
		this._pointerEvents.removeEventListener('pointerdown', this.onPointerDown);
		this._pointerEvents.removeEventListener('pointerhover', this.onPointerHover);
		this._pointerEvents.removeEventListener('pointermove', this.onPointerMove);
		this._pointerEvents.removeEventListener('pointerup', this.onPointerUp);
		this._pointerEvents.removeEventListener('keydown', this.onKeyDown);
		this._pointerEvents.removeEventListener('keyup', this.onKeyUp);
		this._pointerEvents.removeEventListener('wheel', this.onWheel);
		this._pointerEvents.removeEventListener('contextmenu', this.onContextmenu);
		this._pointerEvents.removeEventListener('focus', this.onFocus);
		this._pointerEvents.removeEventListener('blur', this.onBlur);
	}
	needsUpdateChanged(value) {
		if (value) this.startAnimation();
	}
	enabledChanged(value) {
		if (value) {
			this._addEvents();
			this.startAnimation();
		} else {
			this._removeEvents();
			this.stopAnimation();
		}
	}
	// Optional animation methods
	startAnimation() {
		if (!this._animationActive) {
			this._animationActive = true;
			this._animationTime = performance.now();
			this._rafID = requestAnimationFrame(() => {
				const time = performance.now();
				this.animate(time - this._animationTime);
				this._animationTime = time;
			});
		}
	}
	animate(timestep) {
		if (this._animationActive) this._rafID = requestAnimationFrame(() => {
			const time = performance.now();
			timestep = time - this._animationTime;
			this.animate(timestep);
			this._animationTime = time;
		});
		this.update(timestep);
	}
	stopAnimation() {
		this._animationActive = false;
		cancelAnimationFrame(this._rafID);
	}
	update(timestep) {
		if (timestep === undefined) console.log('Control: update function requires timestep parameter!');
		this.stopAnimation();
		this.needsUpdate = false;
	}
	// Control methods. Implement in subclass!
	onContextmenu() {} // event
	onPointerHover() {} // pointer
	onPointerDown() {} // pointer
	onPointerMove() {} // pointer
	onPointerUp() {} // pointer
	onPointerLeave() {} // pointer
	onKeyDown() {} // event
	onKeyUp() {} // event
	onWheel() {} // event
	onFocus() {} // event
	onBlur() {} // event
}
