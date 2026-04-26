// Import NUI and any Addons
import { nui } from '../../NUI/nui.js';

// Setup Application Global Actions via the Data-Action system
document.addEventListener('click', (e) => {
    // Traverse element tree up for a data-action attribute
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    
    // Deconstruct action syntax -> "action:param@selector"
    const actionSpec = actionEl.dataset.action;
    const [actionPart] = actionSpec.split('@');
    const [action, param] = actionPart.split(':');

    // Handle well-known programmatic app actions here:
    switch (action) {
        case 'toggle-sidebar':
            const app = document.querySelector('nui-app');
            if (app?.toggleSidebar) {
                // Toggles 'left' by default unless parameter provides otherwise
                app.toggleSidebar(param || 'left');
            }
            break;
            
        case 'toggle-theme':
            const current = document.documentElement.style.colorScheme || 'light';
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.style.colorScheme = newTheme;
            break;
            
        case 'save-config':
            console.log('App Configuration Action fired');
            break;
    }
});

// Programmatic Features (Virtual Pages)
// These inject directly into the router container without needing a separate HTML file.
const buildVirtualPage = (title, content) => {
    return `<header style="margin-bottom: var(--nui-space-double)">
                <h1>${title}</h1>
                <p class="lead">${content}</p>
            </header>`;
};

nui.registerFeature('profile', (element) => {
    element.innerHTML = buildVirtualPage('User Profile', 'Configure your personal details here.');
});

nui.registerFeature('security', (element) => {
    element.innerHTML = buildVirtualPage('Security Settings', 'Manage your passwords and 2FA settings.');
});

nui.registerFeature('analytics-overview', (element) => {
    element.innerHTML = buildVirtualPage('Analytics Overview', 'High-level metrics for your application.');
});

nui.registerFeature('reports-daily', (element) => {
    element.innerHTML = buildVirtualPage('Daily Reports', 'Your day-to-day statistical breakdowns.');
});

nui.registerFeature('reports-weekly', (element) => {
    element.innerHTML = buildVirtualPage('Weekly Reports', 'Your week-over-week statistical breakdowns.');
});

// App Sidebar Navigation setup
const navigationData = [
    // 1. Direct link item
    { label: 'Home Page', href: '#page=home', icon: 'home' },
    
    // 2. Group with sub-items
    {
        label: 'Settings',
        icon: 'settings',
        items: [
            { label: 'User Profile', href: '#feature=profile' },
            { label: 'Security', href: '#feature=security' }
        ]
    },
    
    // 3. Group with sub-items, containing sub-items
    {
        label: 'Analytics & Data',
        icon: 'analytics',
        items: [
            { label: 'Overview', href: '#feature=analytics-overview' },
            {
                label: 'Generated Reports',
                items: [
                    { label: 'Daily', href: '#feature=reports-daily' },
                    { label: 'Weekly', href: '#feature=reports-weekly' }
                ]
            }
        ]
    }
];

const sideNav = document.getElementById('main-navigation');
if (sideNav && sideNav.loadData) {
    sideNav.loadData(navigationData);
}

// Router Setup
// Points the "basePath" to the 'pages' directory. Navigating to `#page=home` loads `pages/home.html` into `<nui-main>`
nui.setupRouter({
    container: 'nui-content nui-main',
    navigation: 'nui-sidebar#nav-sidebar',
    basePath: 'pages',
    defaultPage: 'home'
});
