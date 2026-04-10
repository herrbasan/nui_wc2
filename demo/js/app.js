import { nui } from '../NUI/nui.js';

const navigationData = [
    {
        "label": "Home",
        "icon": "home",
        "items": [
            {
                "label": "Dashboard",
                "href": "#page=home"
            }
        ]
    },
    {
        "label": "Settings",
        "icon": "settings",
        "items": [
            {
                "label": "Preferences",
                "href": "#page=settings"
            }
        ]
    }
];

const linkList = document.querySelector('nui-link-list');
if (linkList) {
    linkList.loadData(navigationData);
}

nui.enableContentLoading({
    container: 'nui-main',
    navigation: 'nui-sidebar',
    basePath: 'pages',
    defaultPage: 'home'
});

document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    
    const actionSpec = actionEl.dataset.action;
    const [actionPart] = actionSpec.split('@');
    const [action, param] = actionPart.split(':');

    switch (action) {
        case 'toggle-sidebar': {
            const app = document.querySelector('nui-app');
            if (app?.toggleSidebar) {
                app.toggleSidebar(param || 'left');
            }
            break;
        }
        case 'toggle-theme':
            toggleTheme();
            break;
        case 'scroll-to-top':
            document.querySelector('nui-content')?.scrollTo({ top: 0, behavior: 'smooth' });
            break;
    }
});

function toggleTheme() {
    const root = document.documentElement;
    const current = root.style.colorScheme || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.style.colorScheme = current === 'dark' ? 'light' : 'dark';
}

// Update footer info
const footerInfo = document.getElementById('appFooterInfo');
if (footerInfo) {
    footerInfo.textContent = 'demo — Built with NUI';
}

console.log('demo initialized');
