// NUI Monitor - Development-only debugging and introspection module
// Import this module during development to get visibility into Knower/Doer activity

export function createMonitor(nui, options = {}) {
	const config = {
		showUI: true,
		position: 'bottom-left', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
		...options
	};
	
	const monitor = {
		// Track all state changes
		stateLog: [],
		actionLog: [],
		watcherLog: [],
		ui: null,
		updateInterval: null,
		isExpanded: true,
		
		// Start monitoring
		start() {
			console.log('[NUI Monitor] Starting monitoring...');
			
			// Create UI if enabled
			if (config.showUI) {
				monitor.createUI();
				monitor.startUIUpdates();
			}
			
			// Intercept Knower.tell to log state changes
			const originalTell = nui.knower.tell.bind(nui.knower);
			nui.knower.tell = function(id, state) {
				monitor.stateLog.push({
					timestamp: Date.now(),
					id,
					state: JSON.parse(JSON.stringify(state)),
					stack: new Error().stack
				});
				
				// Log to console when monitor is expanded
				if (monitor.isExpanded) {
					console.log(`%c[NUI State] %c${id}`, 'color: #0af; font-weight: bold', 'color: #0af', state);
				}
				
				return originalTell(id, state);
			};
			
			// Intercept Knower.watch to log watcher registration
			const originalWatch = nui.knower.watch.bind(nui.knower);
			nui.knower.watch = function(id, handler) {
				monitor.watcherLog.push({
					timestamp: Date.now(),
					id,
					action: 'registered'
				});
				
				// Log to console when monitor is expanded
				if (monitor.isExpanded) {
					console.log(`%c[NUI Watcher] %c${id}`, 'color: #fa0; font-weight: bold', 'color: #fa0');
				}
				
				return originalWatch(id, handler);
			};
			
			// Intercept Doer.do to log action execution
			const originalDo = nui.doer.do.bind(nui.doer);
			nui.doer.do = function(name, target, element, event, param) {
				monitor.actionLog.push({
					timestamp: Date.now(),
					name,
					param,
					target: target?.tagName || 'unknown',
					element: element?.tagName || 'unknown',
					registered: nui.doer.listActions().includes(name)
				});
				
				// Log to console when monitor is expanded
				if (monitor.isExpanded) {
					const paramStr = param ? `:${param}` : '';
					console.log(`%c[NUI Action] %c${name}${paramStr}`, 'color: #0f0; font-weight: bold', 'color: #0f0');
				}
				
				return originalDo(name, target, element, event, param);
			};
			
			console.log('[NUI Monitor] Monitoring active. Use monitor.* methods to inspect.');
		},
		
		// Stop monitoring and restore original methods
		stop() {
			console.log('[NUI Monitor] Stopping monitoring...');
			if (monitor.updateInterval) {
				clearInterval(monitor.updateInterval);
			}
			if (monitor.ui) {
				monitor.ui.remove();
				monitor.ui = null;
			}
			// Note: This doesn't restore originals - would need to store them
			// For development use, reloading page is simpler
		},
		
		// Create floating UI widget
		createUI() {
			const widget = document.createElement('div');
			widget.id = 'nui-monitor-widget';
			widget.innerHTML = `
				<div class="nui-monitor-header">
					<span>NUI Monitor</span>
					<button class="nui-monitor-toggle">−</button>
					<button class="nui-monitor-close">×</button>
				</div>
				<div class="nui-monitor-body">
					<div class="nui-monitor-stat">
						<span class="nui-monitor-label">States:</span>
						<span class="nui-monitor-value" id="nui-monitor-states">0</span>
					</div>
					<div class="nui-monitor-stat">
						<span class="nui-monitor-label">Changes:</span>
						<span class="nui-monitor-value" id="nui-monitor-changes">0</span>
					</div>
					<div class="nui-monitor-stat">
						<span class="nui-monitor-label">Watchers:</span>
						<span class="nui-monitor-value" id="nui-monitor-watchers">0</span>
					</div>
					<div class="nui-monitor-stat">
						<span class="nui-monitor-label">Actions:</span>
						<span class="nui-monitor-value" id="nui-monitor-actions">0</span>
					</div>
					<div class="nui-monitor-stat">
						<span class="nui-monitor-label">Executed:</span>
						<span class="nui-monitor-value" id="nui-monitor-executed">0</span>
					</div>
				</div>
			`;
			
			// Apply styles
			const style = document.createElement('style');
			style.textContent = `
				#nui-monitor-widget {
					position: fixed;
					${config.position.includes('top') ? 'top: 10px;' : 'bottom: 10px;'}
					${config.position.includes('left') ? 'left: 10px;' : 'right: 10px;'}
					background: rgba(0, 0, 0, 0.9);
					color: #0f0;
					font-family: 'Courier New', monospace;
					font-size: 12px;
					padding: 0;
					border-radius: 4px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
					z-index: 999999;
					min-width: 180px;
					backdrop-filter: blur(10px);
					border: 1px solid rgba(0, 255, 0, 0.3);
				}
				
				.nui-monitor-header {
					background: rgba(0, 100, 0, 0.3);
					padding: 6px 10px;
					display: flex;
					justify-content: space-between;
					align-items: center;
					border-bottom: 1px solid rgba(0, 255, 0, 0.3);
					cursor: move;
					user-select: none;
				}
				
				.nui-monitor-header span {
					font-weight: bold;
					font-size: 11px;
					text-transform: uppercase;
					letter-spacing: 1px;
				}
				
				.nui-monitor-toggle,
				.nui-monitor-close {
					background: transparent;
					border: none;
					color: #0f0;
					cursor: pointer;
					font-size: 16px;
					padding: 0;
					margin-left: 8px;
					width: 20px;
					height: 20px;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 3px;
				}
				
				.nui-monitor-toggle:hover,
				.nui-monitor-close:hover {
					background: rgba(0, 255, 0, 0.2);
				}
				
				.nui-monitor-body {
					padding: 10px;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}
				
				.nui-monitor-body.collapsed {
					display: none;
				}
				
				.nui-monitor-stat {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 4px 0;
				}
				
				.nui-monitor-label {
					color: #0a0;
					font-size: 11px;
				}
				
				.nui-monitor-value {
					color: #0f0;
					font-weight: bold;
					font-size: 14px;
					min-width: 40px;
					text-align: right;
					font-variant-numeric: tabular-nums;
				}
			`;
			
			document.head.appendChild(style);
			document.body.appendChild(widget);
			monitor.ui = widget;
			
			// Add event listeners
			const toggleBtn = widget.querySelector('.nui-monitor-toggle');
			const closeBtn = widget.querySelector('.nui-monitor-close');
			const body = widget.querySelector('.nui-monitor-body');
			const header = widget.querySelector('.nui-monitor-header');
			
			toggleBtn.addEventListener('click', () => {
				body.classList.toggle('collapsed');
				monitor.isExpanded = !body.classList.contains('collapsed');
				toggleBtn.textContent = monitor.isExpanded ? '−' : '+';
			});
			
			closeBtn.addEventListener('click', () => {
				monitor.stop();
			});
			
			// Make draggable
			let isDragging = false;
			let startX, startY, startLeft, startTop;
			
			header.addEventListener('mousedown', (e) => {
				if (e.target.tagName === 'BUTTON') return;
				isDragging = true;
				startX = e.clientX;
				startY = e.clientY;
				const rect = widget.getBoundingClientRect();
				startLeft = rect.left;
				startTop = rect.top;
				widget.style.cursor = 'grabbing';
			});
			
			document.addEventListener('mousemove', (e) => {
				if (!isDragging) return;
				const dx = e.clientX - startX;
				const dy = e.clientY - startY;
				widget.style.left = (startLeft + dx) + 'px';
				widget.style.top = (startTop + dy) + 'px';
				widget.style.right = 'auto';
				widget.style.bottom = 'auto';
			});
			
			document.addEventListener('mouseup', () => {
				if (isDragging) {
					isDragging = false;
					widget.style.cursor = 'move';
				}
			});
		},
		
		// Start periodic UI updates
		startUIUpdates() {
			monitor.updateUI();
			monitor.updateInterval = setInterval(() => {
				monitor.updateUI();
			}, 500); // Update every 500ms
		},
		
		// Update UI with current stats
		updateUI() {
			if (!monitor.ui) return;
			
			const known = nui.knower.listKnown();
			const actions = nui.doer.listActions();
			
			const statesCount = Object.keys(known.states).length;
			const changesCount = monitor.stateLog.length;
			const watchersCount = known.watchers.reduce((sum, w) => sum + w.count, 0);
			const actionsCount = actions.length;
			const executedCount = monitor.actionLog.length;
			
			document.getElementById('nui-monitor-states').textContent = statesCount;
			document.getElementById('nui-monitor-changes').textContent = changesCount;
			document.getElementById('nui-monitor-watchers').textContent = watchersCount;
			document.getElementById('nui-monitor-actions').textContent = actionsCount;
			document.getElementById('nui-monitor-executed').textContent = executedCount;
		},
		
		// Print current Knower state overview
		printKnower() {
			const known = nui.knower.listKnown();
			console.group('📊 Knower State Overview');
			console.log('States:', known.states);
			console.log('Active Watchers:', known.watchers);
			console.log('Total States:', Object.keys(known.states).length);
			console.log('Total Watchers:', known.watchers.reduce((sum, w) => sum + w.count, 0));
			console.groupEnd();
			return known;
		},
		
		// Print current Doer actions
		printDoer() {
			const actions = nui.doer.listActions();
			console.group('🎯 Doer Actions Overview');
			console.log('Registered Actions:', actions);
			console.log('Total Actions:', actions.length);
			console.table(actions.map(name => ({ action: name })));
			console.groupEnd();
			return actions;
		},
		
		// Print recent state changes
		printStateLog(limit = 10) {
			const recent = monitor.stateLog.slice(-limit);
			console.group(`📝 Recent State Changes (last ${limit})`);
			console.table(recent.map(entry => ({
				time: new Date(entry.timestamp).toLocaleTimeString(),
				id: entry.id,
				state: JSON.stringify(entry.state).substring(0, 50)
			})));
			console.groupEnd();
			return recent;
		},
		
		// Print recent action executions
		printActionLog(limit = 10) {
			const recent = monitor.actionLog.slice(-limit);
			console.group(`⚡ Recent Actions (last ${limit})`);
			console.table(recent.map(entry => ({
				time: new Date(entry.timestamp).toLocaleTimeString(),
				action: entry.name,
				param: entry.param || '-',
				registered: entry.registered ? '✓' : 'auto',
				target: entry.target
			})));
			console.groupEnd();
			return recent;
		},
		
		// Print watcher registration history
		printWatcherLog(limit = 10) {
			const recent = monitor.watcherLog.slice(-limit);
			console.group(`👁️ Watcher Registrations (last ${limit})`);
			console.table(recent.map(entry => ({
				time: new Date(entry.timestamp).toLocaleTimeString(),
				id: entry.id,
				action: entry.action
			})));
			console.groupEnd();
			return recent;
		},
		
		// Print everything
		printAll() {
			console.log('═══════════════════════════════════════════');
			console.log('       NUI MONITORING DASHBOARD');
			console.log('═══════════════════════════════════════════');
			monitor.printKnower();
			monitor.printDoer();
			monitor.printStateLog(5);
			monitor.printActionLog(5);
			monitor.printWatcherLog(5);
			console.log('═══════════════════════════════════════════');
		},
		
		// Find potential issues
		diagnose() {
			console.group('🔍 NUI Diagnostics');
			
			// Check for duplicate watchers
			const known = nui.knower.listKnown();
			const highWatcherCount = known.watchers.filter(w => w.count > 5);
			if (highWatcherCount.length > 0) {
				console.warn('⚠️ High watcher counts detected (possible memory leak):');
				console.table(highWatcherCount);
			} else {
				console.log('✓ Watcher counts look healthy');
			}
			
			// Check for unregistered actions being used frequently
			const autoActions = monitor.actionLog.filter(a => !a.registered);
			const actionCounts = {};
			autoActions.forEach(a => {
				actionCounts[a.name] = (actionCounts[a.name] || 0) + 1;
			});
			const frequentAuto = Object.entries(actionCounts).filter(([_, count]) => count > 3);
			if (frequentAuto.length > 0) {
				console.warn('⚠️ Frequently used unregistered actions (consider registering):');
				console.table(frequentAuto.map(([name, count]) => ({ action: name, count })));
			} else {
				console.log('✓ No frequently used unregistered actions');
			}
			
			// Check for state churn (same ID updated many times)
			const stateUpdates = {};
			monitor.stateLog.forEach(entry => {
				stateUpdates[entry.id] = (stateUpdates[entry.id] || 0) + 1;
			});
			const highChurn = Object.entries(stateUpdates).filter(([_, count]) => count > 10);
			if (highChurn.length > 0) {
				console.warn('⚠️ High state churn detected (performance impact):');
				console.table(highChurn.map(([id, count]) => ({ state: id, updates: count })));
			} else {
				console.log('✓ State update frequency looks reasonable');
			}
			
			console.groupEnd();
		},
		
		// Clear all logs
		clear() {
			monitor.stateLog = [];
			monitor.actionLog = [];
			monitor.watcherLog = [];
			console.log('[NUI Monitor] Logs cleared');
		}
	};
	
	// Auto-start and expose globally for console access
	monitor.start();
	window.nuiMonitor = monitor;
	
	console.log('[NUI Monitor] Available commands:');
	console.log('  nuiMonitor.printAll()      - Show complete overview');
	console.log('  nuiMonitor.printKnower()   - Show Knower state');
	console.log('  nuiMonitor.printDoer()     - Show Doer actions');
	console.log('  nuiMonitor.printStateLog() - Recent state changes');
	console.log('  nuiMonitor.printActionLog() - Recent actions');
	console.log('  nuiMonitor.diagnose()      - Check for issues');
	console.log('  nuiMonitor.clear()         - Clear logs');
	console.log('  nuiMonitor.stop()          - Stop monitoring and remove UI');
	
	return monitor;
}
