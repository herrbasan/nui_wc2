// NUI Monitor - DEPRECATED
// The Knower/Doer systems this module monitored have been removed.
// Use browser DevTools and custom events instead.
// Components now dispatch standard CustomEvents that can be monitored directly.

export function createMonitor(nui, options = {}) {
	console.warn('[NUI Monitor] DEPRECATED: Knower/Doer systems have been removed. Use browser DevTools to monitor custom events instead.');
	
	return {
		start() {
			console.log('[NUI Monitor] Monitor is deprecated. Components now use CustomEvents.');
			console.log('[NUI Monitor] In DevTools Console, use: monitorEvents(document, ["nui-dialog-open", "nui-link-list-active"])');
		},
		stop() {},
		diagnose() {
			console.log('[NUI Monitor] Diagnose is deprecated. Use browser DevTools Performance panel instead.');
			return { status: 'deprecated' };
		}
	};
}
