/**
 * NUI Animation Module
 * 
 * A thin wrapper around the Web Animations API with shorthand properties and easing presets.
 * 
 * Usage:
 *   import { initAnimation } from './NUI/lib/modules/nui-animation.js';
 *   initAnimation(nui);
 * 
 * Or auto-initialize if nui is on window:
 *   import './NUI/lib/modules/nui-animation.js';
 * 
 * After initialization:
 *   nui.animate(element, 500, { x: 100, ease: 'expo.out' });
 *   element.ani(500, { x: 100, ease: 'expo.out' });
 */

const easePresets = {
	sine: {
		in: 'cubic-bezier(0.13, 0, 0.39, 0)',
		out: 'cubic-bezier(0.61, 1, 0.87, 1)',
		inOut: 'cubic-bezier(0.36, 0, 0.64, 1)'
	},
	quad: {
		in: 'cubic-bezier(0.11, 0, 0.5, 0)',
		out: 'cubic-bezier(0.5, 1, 0.89, 1)',
		inOut: 'cubic-bezier(0.44, 0, 0.56, 1)'
	},
	cubic: {
		in: 'cubic-bezier(0.32, 0, 0.67, 0)',
		out: 'cubic-bezier(0.33, 1, 0.68, 1)',
		inOut: 'cubic-bezier(0.66, 0, 0.34, 1)'
	},
	quart: {
		in: 'cubic-bezier(0.5, 0, 0.75, 0)',
		out: 'cubic-bezier(0.25, 1, 0.5, 1)',
		inOut: 'cubic-bezier(0.78, 0, 0.22, 1)'
	},
	quint: {
		in: 'cubic-bezier(0.64, 0, 0.78, 0)',
		out: 'cubic-bezier(0.22, 1, 0.36, 1)',
		inOut: 'cubic-bezier(0.86, 0, 0.14, 1)'
	},
	expo: {
		in: 'cubic-bezier(0.7, 0, 0.84, 0)',
		out: 'cubic-bezier(0.16, 1, 0.3, 1)',
		inOut: 'cubic-bezier(0.9, 0, 0.1, 1)'
	},
	circ: {
		in: 'cubic-bezier(0.55, 0, 1, 0.45)',
		out: 'cubic-bezier(0, 0.55, 0.45, 1)',
		inOut: 'cubic-bezier(0.85, 0.09, 0.15, 0.91)'
	},
	back: {
		in: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
		out: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		inOut: 'cubic-bezier(0.8, -0.4, 0.5, 1)'
	}
};

const propTemplates = {
	x: { template: 'translateX', transform: true, defaultMetric: 'px' },
	y: { template: 'translateY', transform: true, defaultMetric: 'px' },
	z: { template: 'translateZ', transform: true, defaultMetric: 'px' },
	scaleX: { template: 'scaleX', transform: true, defaultMetric: false },
	scaleY: { template: 'scaleY', transform: true, defaultMetric: false },
	scale: { template: 'scale', transform: true, defaultMetric: false },
	rotate: { template: 'rotate', transform: true, defaultMetric: 'deg' },
	left: { defaultMetric: 'px' },
	top: { defaultMetric: 'px' },
	right: { defaultMetric: 'px' },
	bottom: { defaultMetric: 'px' },
	width: { defaultMetric: 'px' },
	height: { defaultMetric: 'px' }
};

function addDefaultMetric(metric, value) {
	if (!metric) return value;
	if (isNaN(value)) return value;
	return value.toString() + metric;
}

function getNestedEase(path) {
	if (!path || typeof path !== 'string') return undefined;
	const parts = path.split('.');
	let result = easePresets;
	for (const part of parts) {
		if (result && typeof result === 'object' && part in result) {
			result = result[part];
		} else {
			return undefined;
		}
	}
	return result;
}

function parseAnimationProp(props) {
	const out = { transform: '' };

	for (const key in props) {
		if (key in propTemplates) {
			const tmpl = propTemplates[key];
			if (tmpl.transform) {
				out.transform += tmpl.template + '(' + addDefaultMetric(tmpl.defaultMetric, props[key]) + ') ';
			} else if (tmpl.template) {
				out[tmpl.template] = addDefaultMetric(tmpl.defaultMetric, props[key]);
			} else {
				out[key] = addDefaultMetric(tmpl.defaultMetric, props[key]);
			}
		} else if (key === 'ease' || key === 'easing') {
			out.easing = props[key];
			const preset = getNestedEase(props[key]);
			if (preset !== undefined) {
				out.easing = preset;
			}
		} else {
			if (key === 'transform') props[key] += ' ';
			out[key] = props[key];
		}
	}

	if (out.transform.length < 2) {
		delete out.transform;
	}

	return out;
}

function parseAnimationProps(props) {
	if (!Array.isArray(props)) {
		return parseAnimationProp(props);
	}
	return props.map(p => parseAnimationProp(p));
}

function animate(el, duration, props, options = {}) {
	const defaults = {
		duration: duration || 1000,
		fill: 'forwards',
		composite: 'replace',
		direction: 'normal',
		delay: 0,
		endDelay: 0,
		iterationStart: 0,
		iterations: 1
	};

	const opts = parseAnimationProp({ ...defaults, ...options });

	if (!Array.isArray(props)) {
		props = [{}, props];
		if (props[1].easing) {
			props[0].easing = props[1].easing;
		}
	}

	const keyframes = new KeyframeEffect(el, parseAnimationProps(props), opts);
	const animation = new Animation(keyframes, document.timeline);

	let loopStop = true;

	const ani = {
		animation,
		duration: opts.duration,
		totalDuration: opts.duration + opts.delay + opts.endDelay,
		stops: [],
		lastTime: 0,
		currentTime: 0,
		currentFrame: 0,
		state: 'init',
		lastState: '',
		currentKeyframe: 0,
		progress: 0
	};

	// Calculate keyframe stops
	for (let i = 0; i < props.length; i++) {
		if (!props[i].offset) {
			if (i === 0) props[i].offset = 0;
			else if (i === props.length - 1) props[i].offset = 1;
			else props[i].offset = i / (props.length - 1);
		}
		ani.stops.push((props[i].offset * opts.duration) + opts.delay);
	}
	if (opts.delay) ani.stops.unshift(0);
	if (opts.endDelay) ani.stops.push(ani.totalDuration);

	function fireEvent(type, data) {
		if (opts.events) {
			opts.events({ type, target: ani, ...data });
		}
	}

	function checkKeyframe() {
		let idx = 0;
		for (let i = 0; i < ani.stops.length; i++) {
			if (ani.currentTime >= ani.stops[i]) idx = i;
		}
		return idx;
	}

	function update() {
		if (animation?.currentTime !== ani.lastTime) {
			ani.currentTime = animation.currentTime;
			ani.lastTime = ani.currentTime;
			ani.progress = ani.currentTime / ani.totalDuration;
		}
		if (ani.lastState !== animation.playState) {
			ani.lastState = animation.playState;
			fireEvent(animation.playState);
		}
		const idx = checkKeyframe();
		if (ani.currentKeyframe !== idx) {
			ani.currentKeyframe = idx;
			fireEvent('keyframe', { idx });
		}
		if (opts.update) opts.update(ani);
	}

	function loop() {
		if (animation) update();
		if (!loopStop) requestAnimationFrame(loop);
	}

	ani.play = (time) => {
		fireEvent('start');
		if (time !== undefined) animation.currentTime = time;
		loopStop = false;
		animation.play();
		loop();
	};

	ani.pause = () => {
		fireEvent('pause');
		animation.pause();
	};

	ani.cancel = () => {
		fireEvent('cancel');
		animation.cancel();
	};

	ani.update = update;

	animation.onfinish = () => {
		fireEvent('finished');
		loopStop = true;
		if (opts.cb) opts.cb(ani);
	};

	animation.onremove = () => {
		fireEvent('remove');
		loopStop = true;
	};

	animation.oncancel = () => {
		fireEvent('cancel');
		loopStop = true;
	};

	// Auto-start unless paused
	if (!opts.paused) {
		loop();
		ani.play();
	}

	return ani;
}

/**
 * Initialize animation module on nui object
 * @param {object} nuiObj - The nui object to extend
 */
function initAnimation(nuiObj) {
	if (!nuiObj) {
		console.warn('[NUI Animation] No nui object provided');
		return;
	}

	// Add animate function to nui
	nuiObj.animate = animate;

	// Expose easing presets for inspection/customization
	nuiObj.easePresets = easePresets;

	// Add ani method to Element prototype if not already present
	if (typeof Element !== 'undefined' && !Element.prototype.ani) {
		Element.prototype.ani = function(duration, props, options) {
			return animate(this, duration, props, options);
		};
	}
}

// Auto-initialize when imported (window.nui is set by nui.js)
if (typeof window !== 'undefined' && window.nui) {
	initAnimation(window.nui);
}

// Export for manual initialization if needed
export { animate, easePresets, propTemplates, initAnimation };
