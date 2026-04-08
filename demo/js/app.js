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

document.addEventListener('nui-action', (e) => {
    const { name } = e.detail;
    switch (name) {
        case 'toggle-sidebar':
            document.querySelector('nui-app')?.toggleSideNav?.();
            break;
        case 'toggle-theme':
            toggleTheme();
            break;
        case 'toggle-sidebar:right':
            document.querySelector('nui-app')?.toggleSideNav?.('right');
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
