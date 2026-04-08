let ut = {};

document.addEventListener('DOMContentLoaded', () => {
	ut.nui_init();
});

ut.nui_init = function () {
	   console.log(window.nui_components);
	   // Detect preferred color scheme
	   const html = document.documentElement;
	   const body = document.body;
	   let prefersDark = false;
	   if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			   prefersDark = true;
	   }
	   if (prefersDark) {
			   html.style.colorScheme = 'dark';
			   body.classList.add('dark');
	   } else {
			   html.style.colorScheme = 'light';
			   body.classList.remove('dark');
	   }
};

ut.nui_init_component = function (component, tagName, style) {
	window.nui_components = window.nui_components || {};
	window.nui_components[tagName] = window.nui_components[tagName] || {};
	component.id = ut.id();
	window.nui_components[tagName][component.id] = component;

	if (style && !window.nui_components[tagName].styles) {
		window.nui_components[tagName].styles = true;
		ut.headImport({ type: 'css', url: '', inline: style, tagName: tagName });
		ut.log(tagName + ' initialized');
	}
};

ut.baseActions = function (action, target) {
	if (action == 'toggleMenu') {
		ut.toggleClass(document.body, 'nui-side-menu-state-open');
		return true;
	}
	   if (action == "toggleTheme") {
			   const html = document.documentElement;
			   const body = document.body;
			   const isDark = body.classList.contains('dark');
			   if (isDark) {
					   body.classList.remove('dark');
					   html.style.colorScheme = 'light';
			   } else {
					   body.classList.add('dark');
					   html.style.colorScheme = 'dark';
			   }
			   return true;
	   }
	return false
};

ut.icon_shapes = {
	add:'<path d="M0 0h24v24H0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>',
	add_circle:'<path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>',
	analytics:'<g><rect fill="none" height="24" width="24"/><g><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"/><rect height="5" width="2" x="7" y="12"/><rect height="10" width="2" x="15" y="7"/><rect height="3" width="2" x="11" y="14"/><rect height="2" width="2" x="11" y="10"/></g></g>',
	arrow: '<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/>',
	article:'<g><path d="M19,5v14H5V5H19 M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3L19,3z"/></g><path d="M14,17H7v-2h7V17z M17,13H7v-2h10V13z M17,9H7V7h10V9z"/></g>',
	assessment:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>',
	brightness: '<path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zm-2 5.79V18h-3.52L12 20.48 9.52 18H6v-3.52L3.52 12 6 9.52V6h3.52L12 3.52 14.48 6H18v3.52L20.48 12 18 14.48zM12 6.5v11c3.03 0 5.5-2.47 5.5-5.5S15.03 6.5 12 6.5z"/>',
	calendar:'<g><rect fill="none" height="24" width="24"/></g><g><path d="M19,4h-1V2h-2v2H8V2H6v2H5C3.89,4,3.01,4.9,3.01,6L3,20c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V6C21,4.9,20.1,4,19,4z M19,20 H5V10h14V20z M19,8H5V6h14V8z M9,14H7v-2h2V14z M13,14h-2v-2h2V14z M17,14h-2v-2h2V14z M9,18H7v-2h2V18z M13,18h-2v-2h2V18z M17,18 h-2v-2h2V18z"/></g>',
	close:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>',
	delete:'<path d="M0 0h24v24H0z" fill="none"/><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
	done:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>',
	drag_handle:'<g><rect fill="none" height="24" width="24"/></g><g><g><g><path d="M20,9H4v2h16V9z M4,15h16v-2H4V15z"/></g></g></g>',
	drag_indicator:'<path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>',
	edit: '<path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>',
	edit_note:'<rect fill="none" height="24" width="24"/><path d="M3,10h11v2H3V10z M3,8h11V6H3V8z M3,16h7v-2H3V16z M18.01,12.87l0.71-0.71c0.39-0.39,1.02-0.39,1.41,0l0.71,0.71 c0.39,0.39,0.39,1.02,0,1.41l-0.71,0.71L18.01,12.87z M17.3,13.58l-5.3,5.3V21h2.12l5.3-5.3L17.3,13.58z"/>',
	folder:'<path d="M0 0h24v24H0z" fill="none"/><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>',
	fullscreen: '<path d="M0 0h24v24H0z" fill="none"/><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
	info:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>',
	image:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>',
	invert_colors:'<g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M12,4.81L12,19c-3.31,0-6-2.63-6-5.87c0-1.56,0.62-3.03,1.75-4.14L12,4.81 M12,2L6.35,7.56l0,0C4.9,8.99,4,10.96,4,13.13 C4,17.48,7.58,21,12,21c4.42,0,8-3.52,8-7.87c0-2.17-0.9-4.14-2.35-5.57l0,0L12,2z"/></g>',
	label:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16zM16 17H5V7h11l3.55 5L16 17z"/>',
	layers:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16zm0-11.47L17.74 9 12 13.47 6.26 9 12 4.53z"/>',
	media_folder:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M2 6H0v5h.01L0 20c0 1.1.9 2 2 2h18v-2H2V6zm5 9h14l-3.5-4.5-2.5 3.01L11.5 9zM22 4h-8l-2-2H6c-1.1 0-1.99.9-1.99 2L4 16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 12H6V4h5.17l1.41 1.41.59.59H22v10z"/>',
	menu:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>',
	more:'<path d="M0 0h24v24H0z" fill="none"/><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>',
	pause: '<path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
	person:'<path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
	play : '<path d="M0 0h24v24H0z" fill="none"/><path d="M8 5v14l11-7z"/>',
	search: '<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
	settings:'<path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c.04.32.07.65.07.98 0 .33-.03.66-.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>',
	sticky_note:'<path d="M19,5v9l-5,0l0,5H5V5H19 M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h10l6-6V5C21,3.9,20.1,3,19,3z M12,14H7v-2h5V14z M17,10H7V8h10V10z"/>',
	sync: '<path d="M.01 0h24v24h-24V0z" fill="none"/><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>',
	upload: '<g><rect fill="none" height="24" width="24"/></g><g><path d="M18,15v3H6v-3H4v3c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-3H18z M7,9l1.41,1.41L11,7.83V16h2V7.83l2.59,2.58L17,9l-5-5L7,9z"/></g>',
	volume: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
	volume_off: '<path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>',
	volume_mute: '<path d="M7 9v6h4l5 5V4l-5 5H7z"/>',
	warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
	wysiwyg:'<g><rect fill="none" height="24" width="24"/><path d="M19,3H5C3.89,3,3,3.9,3,5v14c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.11,3,19,3z M19,19H5V7h14V19z M17,12H7v-2 h10V12z M13,16H7v-2h6V16z"/></g>',
	star: '<path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>',
	radio: '<path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z"/>',
	mouse: '<path d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"/>',
	cancel: '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>',
	play_circle: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.5 16.5v-9l7 4.5-7 4.5z"/>',
	pause_circle: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>',
	stop_circle: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 14H8V8h8v8z"/>',
	shuffle:'<path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>',
	skip_next: '<path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z"/>',
	skip_previous: '<path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>',
}

ut.icon = function(id, wrap_in_container, return_as_element){
	let svg = `<svg class="nui-icon ii_${id}" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">${ut.icon_shapes[id]}</svg>`;
	let out = svg;
	if(wrap_in_container) { out = `<div class="nui-icon-container">${svg}</div>`}
	if(return_as_element) { out = ut.htmlObject(out)}
	return out;
}



ut.deep_get = function(obj, path){
	try {
		let split = path.split('.');
		if(split.length == 1) { return obj[path] ;}
		if(split.length == 2) { return obj[split[0]][split[1]] ;}
		if(split.length == 3) { return obj[split[0]][split[1]][split[2]] ;}
		if(split.length == 4) { return obj[split[0]][split[1]][split[2]][split[3]] ;}
		if(split.length == 5) { return obj[split[0]][split[1]][split[2]][split[3]][split[4]] ;}
		if(split.length == 6) { return obj[split[0]][split[1]][split[2]][split[3]][split[4]][split[5]] ;}
		if(split.length == 7) { return obj[split[0]][split[1]][split[2]][split[3]][split[4]][split[5]][split[6]] ;}
		if(split.length == 8) { return obj[split[0]][split[1]][split[2]][split[3]][split[4]][split[5]][split[6]][split[7]] ;}
		if(split.length == 9) { return obj[split[0]][split[1]][split[2]][split[3]][split[4]][split[5]][split[6]][split[7]][split[8]] ;}
		if(split.length > 9){
			let oobj = obj;
			for (var i=0; i<split.length; i++){
				oobj = oobj[split[i]];
			};
			return oobj;
		}
	}
	catch(e){
		return undefined;
	}
}



ut.deep_set = function (obj, path, value) {
	let keys = path.split('.');
	let lastKey = keys.pop();
	let target = keys.reduce((acc, key) => acc[key] = acc[key] || {}, obj);
	target[lastKey] = value;
}


ut.deep_includes = function (ar, path, compare) {
	return ar.some(item => ut.deep_get(item, path) === compare);
};

ut.id = function() {
	return crypto.randomUUID();
}

ut.lz = function (num, size = 2) {
	return num.toString().padStart(size, '0');;
}

ut.slugify = function(str) {
	if (!str) return false;
	return str
		.trim()
		.toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/-+/g, '-'); // Collapse multiple hyphens
};

ut.killKids = function (_el) {
	_el = ut.el(_el);
	while (_el?.firstChild) {
		_el.removeChild(_el.firstChild);
	}
}

ut.killMe = function (_el) {
	_el = ut.el(_el);
	if(_el?.parentNode){
		_el.parentNode.removeChild(_el);
	}
}

ut.el = function (s, context=document) {
	if (s instanceof Element) { return s; } else { return context.querySelector(s); }
}

ut.els = function (s, context=document) {
	return context.querySelectorAll(s);;
}

ut.addStyle = function (q, cs) {
	let el = ut.el(q);
	for (let key in cs) {
		el.style.setProperty(key, cs[key]);
	}
}

ut.removeStyle = function (q, cs) {
	let el = ut.el(q);
	for (let key in cs) {
		el.style[key] = null;
	}
}

ut.addClass = function(_el, _classNames) {
	let el = ut.el(_el);
	let classNames = Array.isArray(_classNames) ? _classNames : _classNames.split(' ');
	classNames.forEach(className => el.classList.add(className));
};

ut.removeClass = function (_el, _classNames) {
	let el = ut.el(_el);
	let classNames = _classNames;
	if (typeof _classNames != 'array') {
		classNames = _classNames.split(' ');
	}
	for (let i = 0; i < classNames.length; i++) {
		el.classList.remove(classNames[i]);
	}
}

ut.toggleClass = function(_el, _className){
	let el = ut.el(_el);
	el.classList.toggle(_className);
}

ut.hasClass = function (_el, className) {
	let el = ut.el(_el);
	return el.classList.contains(className);
}

ut.createElement = function (type, options){
	let el = document.createElement(type);
	if(options){
		if(options.id) { el.id = options.id }
		if(options.classes) { ut.addClass(el, options.classes) };
		if(options.class) { ut.addClass(el, options.class) };
		if(options.style) { ut.css(el, options.style)};
		if(options.events) { ut.addEvents(el, options.events )};
		if(options.inner) { 
			if(options.inner instanceof Element){
				el.appendChild(options.inner);
			}
			else {
				el.innerHTML = options.inner;
			}
		}
		if(options.target) { options.target.appendChild(el); }
		if(options.attributes) { ut.setAttributes(el, options.attributes)}
		if(options.dataset) {
			for(let key in options.dataset){
				el.dataset[key] = options.dataset[key];
			}
		}
	}
	return el; 
}

ut.setAttributes = function(_el, attributes) {
    const el = ut.el(_el);
    if (!el || !attributes) return;

    const toKebabCase = (str) => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

    for (const key in attributes) {
        const value = attributes[key];

        if (key === 'data' && typeof value === 'object' && value !== null) {
            for (const dataKey in value) {
                if (value[dataKey] !== null && value[dataKey] !== undefined) {
                    el.dataset[dataKey] = value[dataKey];
                } else {
					delete el.dataset[dataKey];
				}
            }
        } else if (key === 'style' && typeof value === 'object' && value !== null) {
            for (const styleKey in value) {
                el.style[styleKey] = value[styleKey];
            }
        } else {
            const attributeName = toKebabCase(key);
            if (typeof value === 'boolean') {
                if (value) {
                    el.setAttribute(attributeName, '');
                } else {
                    el.removeAttribute(attributeName);
                }
            } else if (value !== null && value !== undefined) {
                el.setAttribute(attributeName, value);
            } else {
                el.removeAttribute(attributeName);
            }
        }
    }
};

ut.getAttributes = function(_el, literal = false) {
    const el = ut.el(_el);
    if (!el) return {};

    const attrs = {};
    const booleanAttributes = [
        'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
        'default', 'defer', 'disabled', 'formnovalidate', 'inert', 'ismap',
        'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate',
        'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected'
    ];

    // Helper to convert strings to boolean, number, or return as is.
    const convertValue = (value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        // Check if it's a non-empty string that can be converted to a finite number.
        if (value !== null && value.trim() !== '' && isFinite(value)) {
            return Number(value);
        }
        return value;
    };

    const toCamelCase = (str) => str.replace(/-([a-z])/g, g => g[1].toUpperCase());

    for (const attr of el.attributes) {
        const name = attr.name;
        const value = attr.value;

        if (name.startsWith('data-')) {
            if (literal) {
                if (!attrs.data) attrs.data = {};
                const dataKey = name.substring(5);
                attrs.data[dataKey] = convertValue(value);
            }
            continue; 
        }

        const keyName = literal ? name : toCamelCase(name);

        if (booleanAttributes.includes(name)) {
            attrs[keyName] = true;
        } else {
            attrs[keyName] = convertValue(value);
        }
    }

    if (!literal && Object.keys(el.dataset).length > 0) {
        attrs.data = {};
        for (const key in el.dataset) {
            attrs.data[key] = convertValue(el.dataset[key]);
        }
    }

    return attrs;
};

ut.htmlObject = function(s){
	let hdoc = document.createRange().createContextualFragment(s);
	if(hdoc.children.length > 1){ hdoc = document.createRange().createContextualFragment('<div>' + s +'</div>'); }
	return hdoc.firstElementChild;
}

ut.locationHash = function(hash_string){
	let out = {};
	if(!hash_string){
		hash_string = window.location.hash;
	}
	if(hash_string.includes('#')){
		let hash = hash_string.split('#')[1].split('&');
		hash.forEach(item => { 
			let temp = item.split('=');
			if(temp[0]){
				out[temp[0]] = temp[1];
			}
		})
	}
	return out;
}

ut.locationSearch = function(search_string){
	let out = {};
	if(!search_string){
		search_string = window.location.search;
	}
	if(search_string.includes('?')){
		let search = search_string.split('?')[1].split('&');
		search.forEach(item => { 
			let temp = item.split('=');
			if(temp[0]){
				out[temp[0]] = temp[1];
			}
		})
	}
	return out;
}

ut.average = function(ar){
	return (ar.reduce((a,b) => { return a+b }, 0))/ar.length;
}

ut.medianAverage = function(ring){
	let sum = 0;
	if(ring.length > 3) {
		let ar = [...ring];
		ar.sort(function(a,b) { return a - b;});
		ar = ar.slice(1,ar.length-1);
		sum = ar.reduce(function(a, b) { return a + b}) / ar.length;
	}
	return sum;
}

ut.awaitMs = function(ms){
	return new Promise((resolve, reject) => {
		setTimeout(resolve, ms)
	})
}

ut.awaitEvent = function(el, event, time = 100000) {
	if (!el) return Promise.reject('Element not found');
	return new Promise((resolve, reject) => {
		el.addEventListener(event, done);
		let to = setTimeout(done, time);
		function done(e) {
			clearTimeout(to);
			el.removeEventListener(event, done);
			resolve(e || 'timeout');
		}
	});
};


ut.headImport = function(options){
	if(Array.isArray(options)){
		let promises = [];
		for(let i=0; i<options.length; i++){
			promises.push(ut.headImport(options[i]))
		}
		return Promise.allSettled(promises);
	}
	return addHeadImport(options);
}

function addHeadImport(options){
	   return new Promise((resolve, reject) => {
			   let el;
			   if(options.type === 'js') {
					   el = document.createElement('script');
					   el.type = 'text/javascript';
					   el.src = options.url;
			   } else if(options.type === 'esm') {
					   el = document.createElement('script');
					   el.type = 'module';
					   el.src = options.url;
			   } else if(options.type === 'css') {
					   if(options.inline) {
							   el = document.createElement('style');
							   el.type = 'text/css';
							   el.textContent = options.inline;
							   document.getElementsByTagName('head')[0].appendChild(el);
							   resolve();
							   return;
					   } else {
							   el = document.createElement('link');
							   el.type = 'text/css';
							   el.rel = 'stylesheet';
							   el.href = options.url;
					   }
			   }
			   if(el) {
					   if(options.url && (el.tagName === 'LINK' || el.tagName === 'SCRIPT')) {
							   el.href = options.url;
							   el.src = options.url;
					   }
					   el.addEventListener('error', (e) => { console.log(e) });
					   el.addEventListener('load', resolve, {once:true});
					   document.getElementsByTagName('head')[0].appendChild(el);
			   }
	   })
}

ut.getCssVars = function(el = document.styleSheets) {
	let out = {};
	let names = getCssVarNames(el);
	for (let i = 0; i < names.length; i++) {
		out[names[i]] = ut.getCssVar(names[i]);
	}
	return out;
}

ut.getCssVar = function(prop, el) {
	if (!el) { el = document.body }
	let s = getComputedStyle(el).getPropertyValue(prop).trim();
	return ut.parseCssUnit(s, el);
}

ut.parseCssUnit = function(s, el) {
	let unit = false;
	let value = s;
	let computed = false;
	let absolute_units = ['cm', 'mm', 'Q', 'in', 'pc', 'pt', 'px'];
	let relative_units = ['%', 'rem', 'em', 'ex', 'ch', 'lh', 'rlh', 'svw', 'svh', 'dvw', 'dvh', 'lvw', 'lvh', 'vw', 'vh', 'vmin', 'vmax', 'vb', 'vi'];
	let isAbsolute = false;

	if (!isNaN(s)) { return { value: Number(s), unit: 'number', absolute: true, computed: Number(s) } }

	for (let i = 0; i < absolute_units.length; i++) {
		let item = absolute_units[i];
		if (s.substr(s.length - item.length, item.length) == item && !s.includes('vmin')) {
			let t = Number(s.substr(0, s.length - item.length));
			if (!isNaN(t)) {
				value = t;
				computed = value;
				unit = item;
				isAbsolute = true;
				break;
			}
		}
	}
	if (!isAbsolute) {
		for (let i = 0; i < relative_units.length; i++) {
			let item = relative_units[i];
			if (s.substr(s.length - item.length, item.length) == item) {
				value = Number(s.substr(0, s.length - item.length));
				unit = item;
				if (item == 'em' || item == 'rem') {
					let base = ut.getCssVar('font-size', el).value;
					computed = Math.round(value * base);
				}
				else if (item == 'vw' || item == '%') {
					value = value / 100;
					computed = Math.round(value * window.innerWidth);
				}
				else if (item == 'vh') {
					value = value / 100;
					computed = Math.round(value * window.innerHeight);
				}
				else if (item == 'vmin' || item == 'vmax') {
					value = value / 100;
					let side = window.innerWidth;
					if (window.innerHeight > window.innerWidth) {
						side = window.innerHeight;
					}
					computed = Math.round(value * side);
				}
				break;
			}
		}
	}
	if (!unit) {
		let c = parseCSSColor(s);
		if (c) {
			unit = 'rgba';
			isAbsolute = true;
			computed = c;
		}
	}
	return { value: value, unit: unit, absolute: isAbsolute, computed: computed };
}

ut.setCssVar = function(varName, value, el = document.documentElement) {
	el.style.setProperty(varName, value);
}


ut.cssColorString = function(ar) {
	if (ar.length > 3) {
		return `rgba(${ar[0]},${ar[1]},${ar[2]},${ar[3]})`
	}
	return `rgb(${ar[0]},${ar[1]},${ar[2]})`
}

function getCssVarNames(el = document.styleSheets) {
	var cssVars = [];
	for (var i = 0; i < el.length; i++) {
		try {
			for (var j = 0; j < el[i].cssRules.length; j++) {
				try {
					for (var k = 0; k < el[i].cssRules[j].style.length; k++) {
						let name = el[i].cssRules[j].style[k];
						if (name.startsWith('--') && cssVars.indexOf(name) == -1) {
							cssVars.push(name);
						}
					}
				} catch (error) { }
			}
		} catch (error) { }
	}
	return cssVars;
}

function parseCSSColor(color) {
	var cache,
		p = parseInt,
		color = color.replace(/\s/g, '');
	if (cache = /#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(color))
		cache = [p(cache[1], 16), p(cache[2], 16), p(cache[3], 16)];
	else if (cache = /#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(color))
		cache = [p(cache[1], 16) * 17, p(cache[2], 16) * 17, p(cache[3], 16) * 17];
	else if (cache = /rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(color))
		cache = [+cache[1], +cache[2], +cache[3], +cache[4]];
	else if (cache = /rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(color))
		cache = [+cache[1], +cache[2], +cache[3]];
	else return false;

	isNaN(cache[3]) && (cache[3] = 1);
	return cache;
}

ut.getCookies = function(){
	var pairs = document.cookie.split(";");
	var cookies = {};
	for (var i=0; i<pairs.length; i++){
		var pair = pairs[i].split("=");
		cookies[(pair[0]+'').trim()] = decodeURI(pair.slice(1).join('='));
	}
	return cookies;
}

ut.setCookie = function(name, value, hours, path=''){
	let d = new Date();
	d.setTime(d.getTime() + (hours*60*60*1000));
	let expires = "expires="+ d.toUTCString();
	document.cookie = name + "=" + value + ";" + expires + `;path=/${path}`;
}

ut.getCookie = function(cname) {
 let name = cname + "=";
 let decodedCookie = decodeURIComponent(document.cookie);
 let ca = decodedCookie.split(';');
 for(let i = 0; i <ca.length; i++) {
   let c = ca[i];
   while (c.charAt(0) == ' ') {
	 c = c.substring(1);
   }
   if (c.indexOf(name) == 0) {
	 return c.substring(name.length, c.length);
   }
 }
 return "";
}

ut.deleteCookie = function(cname, path=''){
   document.cookie = `${cname}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${path};`;
}

ut.checkCookie = function(cname, value) {
   let check = false;
   let cookie = ut.getCookie(cname);
   if( cookie != ""){
	   if(value){
		   if(cookie == value){
			   check = true;
		   }
	   }
	   else {
		   check = true;
	   }
   }
   return check; 
}

ut.detectEnv = function() {
	let detect = {
		isIE: false, // Internet Explorer is no longer supported
		isEdge: navigator.userAgent.includes('Edg/'),
		isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
		isFF: navigator.userAgent.toLowerCase().includes('firefox'),
		isMac: navigator.userAgentData ? navigator.userAgentData.platform === 'macOS' : navigator.userAgent.includes('Macintosh'),
		isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
		isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
		isAudioVolume: (() => { let audio = new Audio(); audio.volume = 0.5; return audio.volume === 0.5; })()
	};

	if (detect.isIOS) {
		detect.IOSversion = iOSversion();
	}

	function iOSversion() {
		if (window.indexedDB) { return 8; }
		if (window.SpeechSynthesisUtterance) { return 7; }
		if (window.webkitAudioContext) { return 6; }
		if (window.matchMedia) { return 5; }
		if (window.history && 'pushState' in window.history) { return 4; }
		return 3;
	}

	return detect;
}

ut.setTheme = function(_el, listen_for_change){
	let el = _el ? ut.el(_el) : document.body; 
	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		el.classList.add('dark');
	}
	else {
		el.classList.remove('dark');
	}
	if(listen_for_change){
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
			if(event.matches){
				el.classList.add('dark');
			}
			else {
				el.classList.remove('dark');
			}
		});
	}
}

ut.log = console.log.bind(console);
//ut.log = () => {};


export default ut;