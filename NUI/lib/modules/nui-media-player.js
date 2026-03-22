import { nui } from '../../nui.js';

class NuiMediaPlayer extends HTMLElement {
	connectedCallback() {
		if (this.hasAttribute('data-initialized')) return;
		this.setAttribute('data-initialized', 'true');
		this._cleanup = this._initPlayer();
	}

	disconnectedCallback() {
		if (this._cleanup) this._cleanup();
	}

	_initPlayer() {
		const element = this;
		
		const domCreate = (tag, attrs = {}) => {
			const el = document.createElement(tag);
			if (attrs.class) el.className = attrs.class;
			if (attrs.target) attrs.target.appendChild(el);
			return el;
		};

		let media = element.querySelector('video, audio');
		if (!media) {
			const type = element.getAttribute('type') || 'video';
			media = document.createElement(type);
			const src = element.getAttribute('src');
			if (src) {
				media.src = src;
			}
			element.appendChild(media);
		}

		const media_type = media.tagName.toLowerCase();
		element.setAttribute('type', media_type);

		let duration = 0;
		let isVisible = false;
		let registeredEvents = [];
		let isStream = false;
		let dragCleanupTs = null;
		let dragCleanupVs = null;
		let animationFrameId = null;

		const wrap = domCreate('div', { class: 'wrap', target: element });
		const info = domCreate('div', { class: 'info', target: wrap });
		info.innerHTML = '<nui-icon name="sync"></nui-icon>';
		
		const fullscreen = domCreate('div', { class: 'fullscreen', target: wrap });
		fullscreen.innerHTML = '<nui-icon name="fullscreen"></nui-icon>';
		
		const widget = domCreate('div', { class: 'widget', target: wrap });
		widget.innerText = '0:00';
		
		const controls = domCreate('div', { class: 'controls', target: wrap });
		const bottom = domCreate('div', { class: 'bottom', target: controls });
		
		const playpause = domCreate('div', { class: 'playpause', target: bottom });
		playpause.innerHTML = '<nui-icon name="play" class="icon-play"></nui-icon><nui-icon name="pause" class="icon-pause"></nui-icon>';
		
		const timeline = domCreate('div', { class: 'timeline', target: bottom });
		const timeline_bar = domCreate('div', { class: 'bar', target: timeline });
		const timeline_proz = domCreate('div', { class: 'proz', target: timeline_bar });
		
		const time = domCreate('div', { class: 'time', target: bottom });
		time.innerText = '0:00';
		const durationElem = domCreate('div', { class: 'duration', target: bottom });
		durationElem.innerText = '0:00';
		
		const volume = domCreate('div', { class: 'volume', target: bottom });
		const volume_bar = domCreate('div', { class: 'bar', target: volume });
		const volume_proz = domCreate('div', { class: 'proz', target: volume_bar });
		
		const volume_icon = domCreate('div', { class: 'volume_icon', target: bottom });
		volume_icon.innerHTML = '<nui-icon name="volume"></nui-icon>';
		
		const bottom_shade = domCreate('div', { class: 'bottom_shade', target: wrap });
		
		if (media_type === 'audio') {
			bottom_shade.style.display = 'none';
			fullscreen.style.display = 'none';
		}
		
		media.setAttribute('playsinline', 'true');
		media.controls = null;
		
		media.volume = 0.9;
		setTimeout(() => {
			if(media.volume !== 0.9) { element.isIOS = true; media.src = media.currentSrc + '#t=0.001'; }
			media.volume = 1; 
		}, 1);

		let player_observer;
		if (typeof IntersectionObserver !== 'undefined') {
			player_observer = new IntersectionObserver((e) => { 
				isVisible = e[0].isIntersecting; 
				if (isVisible) update(); 
			}, { threshold: 0 });
		} else {
			isVisible = true;
		}

		if (media.readyState < 3) { 
			info.classList.add('loading');
			media.addEventListener('loadedmetadata', mediaLoaded); 
		} else { 
			start(); 
		}

		function mediaLoaded(e) {
			info.classList.remove('loading');
			media.removeEventListener('loadedmetadata', mediaLoaded);
			isStream = !isFinite(media.duration);
			start();
		}

		function playTime(ms) {
			const totalSeconds = Math.floor(ms / 1000);
			const minutes = Math.floor(totalSeconds / 60);
			const seconds = totalSeconds % 60;
			return `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}

		let volume_timeout, widget_timeout, stageclick_timeout, control_timeout;
		let timeline_drag = false, volume_drag = false, isOver = false, muteTouchEnd = false;
		let widget_x = 0, last_widget_x = 0;
		let last_volume_proz = -1, last_time = -1;

		function _event(tgt, evt, fnc, options) {
			registeredEvents.push({ target: tgt, event: evt, fnc: fnc });
			tgt.addEventListener(evt, fnc, options);
		}

		function updateDuration(n = (isFinite(media.duration) ? media.duration : 0)) {
			duration = n;
			durationElem.innerText = playTime(duration * 1000);
		}

		function mediaInfo(e) {
			element.dispatchEvent(new CustomEvent('nui-media-event', { detail: { type: e.type, originalEvent: e }, bubbles: true }));
			if (e.type === 'durationchange') updateDuration();
			if (e.type === 'waiting') info.classList.add('loading');
			if (e.type === 'canplay' || e.type === 'playing' || e.type === 'canplaythrough') info.classList.remove('loading');
		}

		function start() {
			_event(media, 'error', mediaInfo);
			_event(media, 'ended', mediaInfo);
			_event(media, 'waiting', mediaInfo);
			_event(media, 'canplay', mediaInfo);
			_event(media, 'canplaythrough', mediaInfo);
			_event(media, 'playing', mediaInfo);
			_event(media, 'pause', mediaInfo);
			_event(media, 'durationchange', mediaInfo);
			_event(playpause, 'click', togglePlay);
			_event(fullscreen, 'click', toggleFullscreen);

			if (media_type === 'video') {
				_event(window, 'mousemove', () => { document.body.style.cursor = null; });
				_event(element, 'click', stageEvents);
				_event(element, 'dblclick', stageEvents);
				_event(element, 'touchend', stageEvents);
				_event(element, 'touchmove', stageEvents);
				_event(element, 'mousemove', stageEvents);
				_event(element, 'mouseover', stageEvents);
				_event(element, 'mouseleave', stageEvents);
			}
			
			_event(volume_icon, 'mouseover', volumeEvents);
			_event(volume_icon, 'click', volumeEvents);
			_event(volume_icon, 'touchend', volumeEvents);
			_event(durationElem, 'mouseover', volumeLeave);
			_event(bottom, 'mouseleave', volumeLeave);

			if (!isStream || true) {
				_event(timeline, 'mouseover', widgetEvents);
				_event(timeline, 'mouseout', widgetEvents);
				_event(timeline, 'mousemove', widgetEvents);
				
				dragCleanupTs = nui.util.enableDrag(timeline, timelineSlider);
			}
			
			updateDuration();
			setTime(media.currentTime, time);
			if (player_observer) player_observer.observe(element);
			
			dragCleanupVs = nui.util.enableDrag(volume, volumeSlider);
			info.classList.remove('loading');
			element.classList.add('init');
			
			if (element.hasAttribute('muted')) media.muted = true;
			if (element.hasAttribute('loop')) media.loop = true;
			if (element.hasAttribute('autoplay')) media.play();
			
			update();
			hideControls(0);
		}

		function volumeEvents(e) {
			if (e.type === 'touchend') { toggleVolume(); e.stopPropagation(); e.preventDefault(); }
			if (e.type === 'click') toggleVolume();
		}

		function volumeLeave(e) {
			if (!volume_drag) hideVolume(0.5);
		}

		function showVolume() {
			clearTimeout(volume_timeout);
			element.classList.add('volume-show');
		}

		function hideVolume(n = 1) {
			clearTimeout(volume_timeout);
			volume_timeout = setTimeout(() => {
				element.classList.remove('volume-show');
			}, n * 1000);
		}

		function volumeSlider(e) {
			// Always update the volume on any drag event (start, move, end)
			media.volume = e.percentX;
			element.dispatchEvent(new CustomEvent('nui-media-volume', { detail: { value: e.percentX }, bubbles: true }));
			showControls();

			if (e.type === 'start') {
				volume_drag = true;
				showVolume();
			} else if (e.type === 'end') {
				volume_drag = false;
				hideVolume(1);
			} else {
				showVolume();
			}
		}

		let pauseMem = false;
		function timelineSlider(e) {
			if (duration > 0) {
				// Always update position and widget
				media.currentTime = duration * e.percentX;
				widget_x = e.x;

				if (e.type === 'start') {
					timeline_drag = true;
					element.classList.add('widget-show');
					pauseMem = media.paused;
					media.pause();
				} else if (e.type === 'end') {
					timeline_drag = false;
					if (!pauseMem) media.play();
					if (e.isTouch) {
						clearTimeout(widget_timeout);
						widget_timeout = setTimeout(() => { element.classList.remove('widget-show'); }, 1000);
					}
				}
			}
			showControls();
		}

		function widgetEvents(e) {
			if (e.type === 'mouseover') element.classList.add('widget-show');
			else if (e.type === 'mouseout') element.classList.remove('widget-show');
			else if (e.type === 'mousemove') widget_x = e.offsetX;
		}

		function update() {
			if (!isVisible) {
				animationFrameId = requestAnimationFrame(update);
				return;
			}
			if (last_widget_x !== widget_x && !isNaN(widget_x)) {
				setWidget(widget_x);
				last_widget_x = widget_x;
			}
			let vol = media.volume;
			if (last_volume_proz !== vol && !isNaN(vol)) {
				volume_proz.style.width = (vol * 100) + '%';
				last_volume_proz = vol;
			}
			if (media.last_state !== media.paused) {
				media.last_state = media.paused;
				if (media.paused) element.classList.remove('playing');
				else element.classList.add('playing');
			}
			if (last_time !== media.currentTime) {
				setTime(media.currentTime, time);
				timeline_proz.style.width = ((media.currentTime / duration) * 100) + '%';
				last_time = media.currentTime;
			}
			animationFrameId = requestAnimationFrame(update);
		}

		function showControls() {
			element.classList.add('controls-show');
			hideControls(3);
		}

		function hideControls(n = 1) {
			clearTimeout(control_timeout);
			control_timeout = setTimeout(() => {
				if (!media.paused) {
					element.classList.remove('controls-show');
					if (isOver) document.body.style.cursor = 'none';
				} else {
					hideControls(3);
				}
			}, n * 1000);
		}

		function setWidget(x) {
			let val = x + timeline.offsetLeft + bottom.offsetLeft;
			widget.style.left = `${val}px`;
			let percent = x / timeline.offsetWidth;
			if (isNaN(percent) || !isFinite(percent)) percent = 0;
			setTime(percent * duration, widget);
		}

		function setTime(sec, target) {
			if (isNaN(sec) || !isFinite(sec)) return;
			let ptime = playTime(sec * 1000);
			if (target.last_playtime !== ptime) {
				target.last_playtime = ptime;
				target.innerText = ptime;
			}
		}

		let stageclick_mem = false;
		function stageEvents(e) {
			if (e.type === 'touchmove') muteTouchEnd = true;
			if (e.type === 'touchend') {
				if (muteTouchEnd) { muteTouchEnd = false; return; }
				if (e.target !== controls && e.target !== wrap) return;
				e.preventDefault();
				if (element.classList.contains('controls-show')) {
					togglePlay();
					hideControls(1);
				} else {
					showControls();
				}
			}
			if (e.type === 'dblclick') {
				if (e.target !== controls && e.target !== wrap) return;
				clearTimeout(stageclick_timeout);
				if (media.paused !== stageclick_mem) togglePlay(); // Revert unintentional play/pause from the first click
				toggleFullscreen();
			}
			if (e.type === 'click') {
				if ((e.target !== controls && e.target !== wrap) || e.detail > 1) return; // e.detail > 1 means it's part of a double-click
				clearTimeout(stageclick_timeout);
				stageclick_mem = media.paused;
				stageclick_timeout = setTimeout(() => {
					togglePlay();
				}, 250);
			}
			if (e.type === 'mouseover') isOver = true;
			if (e.type === 'mouseleave') {
				isOver = false;
				hideControls(1);
				hideVolume(0.5);
			}
			if (e.type === 'mousemove') {
				isOver = true;
				showControls();
			}
		}

		function toggleFullscreen(e) {
			if (e && e.stopPropagation) e.stopPropagation();
			if (!document.fullscreenElement && !document.webkitFullscreenElement) {
				if (element.requestFullscreen) element.requestFullscreen();
				else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
				else if (media.webkitEnterHeadlessFullscreen) media.webkitEnterHeadlessFullscreen();
			} else {
				if (document.exitFullscreen) document.exitFullscreen();
				else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
			}
		}

		function togglePlay(e) {
			if (e && e.stopPropagation) e.stopPropagation();
			if (media.paused) {
				element.dispatchEvent(new CustomEvent('nui-media-play', { bubbles: true }));
				media.play();
				
				if (element.hasAttribute('pause-others')) {
					document.querySelectorAll('nui-media-player').forEach(player => {
						if (player !== element && player.pause) player.pause();
					});
				}
			} else {
				element.dispatchEvent(new CustomEvent('nui-media-pause', { bubbles: true }));
				media.pause();
			}
		}

		function toggleVolume() { clearTimeout(volume_timeout); element.classList.toggle('volume-show'); }

		element.play = () => media.play();
		element.pause = () => media.pause();
		element.togglePlay = togglePlay;
		element.showControls = showControls;

		return () => {
			isVisible = false;
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			registeredEvents.forEach(evt => evt.target.removeEventListener(evt.event, evt.fnc));
			if (dragCleanupTs) dragCleanupTs();
			if (dragCleanupVs) dragCleanupVs();
			if (player_observer) player_observer.disconnect();
			clearTimeout(widget_timeout);
			clearTimeout(volume_timeout);
			clearTimeout(stageclick_timeout);
			clearTimeout(control_timeout);
			media.controls = true;
			media.pause();
		};
	}
}

if (!customElements.get('nui-media-player')) {
	customElements.define('nui-media-player', NuiMediaPlayer);
}

// Expose programmatic API to global NUI scope if applicable
if (nui) {
	nui.components = nui.components || {};
	nui.components.mediaPlayer = {
		/**
		 * Programmatically inject a media player into a target element.
		 * @param {HTMLElement|string} target - The element or selector to append to.
		 * @param {Object} options - Configuration options for the player.
		 * @returns {HTMLElement} The created nui-media-player instance.
		 */
		create(target, options = {}) {
			if (typeof target === 'string') target = document.querySelector(target);
			if (!target) throw new Error('NUI MediaPlayer: Target element not found.');

			const { url, type = 'video', poster, pauseOthers = true, attributes = {}, playerAttributes = {} } = options;
			
			const player = document.createElement('nui-media-player');
			if (pauseOthers) player.setAttribute('pause-others', '');
			
			// Optional custom attributes directly on the wrapper
			Object.entries(playerAttributes).forEach(([key, val]) => {
				if (val === true) player.setAttribute(key, '');
				else if (val !== false) player.setAttribute(key, val);
			});

			const media = document.createElement(type);
			if (url) media.src = url;
			if (poster && type === 'video') media.setAttribute('poster', poster);
			
			// Media node native attributes (e.g. currentLoop, muted, autoplay, crossorigin)
			Object.entries(attributes).forEach(([key, val]) => {
				if (val === true) media.setAttribute(key, '');
				else if (val !== false) media.setAttribute(key, val);
			});
			
			player.appendChild(media);
			target.appendChild(player);
			
			return player;
		}
	};
}

export { NuiMediaPlayer };
