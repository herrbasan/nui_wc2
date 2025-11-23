
async function reproduceBug() {
    const sideNav = document.querySelector('nui-side-nav');

    // 1. Ensure initial state (Overview active)
    console.log('Setting active: Overview');
    sideNav.setActive('a[href="#devtools-overview"]');
    await new Promise(r => setTimeout(r, 1000)); // Wait for animations

    // Check Developer Tools height (should be auto)
    const devToolsHeader = document.querySelector('nui-link-list ul:nth-child(6) .group-header'); // Developer Tools
    const devToolsContainer = devToolsHeader.nextElementSibling;
    console.log('Dev Tools Height (Before):', devToolsContainer.style.height);

    // 2. Trigger bug (Set Active: Reports)
    console.log('Setting active: Reports');
    sideNav.setActive('a[href="#plugin-webpack"]');
    await new Promise(r => setTimeout(r, 1000)); // Wait for animations

    // Check Developer Tools height (should be auto, might be fixed)
    console.log('Dev Tools Height (After):', devToolsContainer.style.height);

    if (devToolsContainer.style.height !== 'auto' && devToolsContainer.style.height !== '') {
        console.error('BUG DETECTED: Developer Tools container is stuck at fixed height:', devToolsContainer.style.height);
    } else {
        console.log('Dev Tools container is auto (Correct).');
    }

    // Check Build Tools height
    const buildToolsHeader = devToolsContainer.querySelector('ul:nth-child(2) .group-header'); // Build Tools
    const buildToolsContainer = buildToolsHeader.nextElementSibling;
    console.log('Build Tools Height:', buildToolsContainer.style.height);
}

reproduceBug();
