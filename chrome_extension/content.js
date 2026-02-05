// content.js - Enhanced for reliability and new options

let globalSettings = {};

function updateSettings() {
    chrome.storage.local.get([
        'outputPath', 'libName',
        'optSymbol', 'optFootprint', 'opt3D',
        'optOverwrite', 'optV5', 'optSearchPage'
    ], (result) => {
        globalSettings = result;
        // Defaults if undefined
        if (globalSettings.libName === undefined) globalSettings.libName = 'easyeda2kicad';
        if (globalSettings.optSymbol === undefined) globalSettings.optSymbol = true;
        if (globalSettings.optFootprint === undefined) globalSettings.optFootprint = true;
        if (globalSettings.opt3D === undefined) globalSettings.opt3D = true;
        if (globalSettings.optOverwrite === undefined) globalSettings.optOverwrite = false;
        if (globalSettings.optV5 === undefined) globalSettings.optV5 = false;
        if (globalSettings.optSearchPage === undefined) globalSettings.optSearchPage = true;

        // Re-run injection if settings change
        runInjection();
    });
}

// Initial settings load
updateSettings();
// Listen for changes
chrome.storage.onChanged.addListener(updateSettings);

function runInjection() {
    const url = window.location.href;

    if (url.includes('/partdetail/') || url.includes('/product-detail/')) {
        injectPartDetailButton();
    }

    if (globalSettings.optSearchPage) {
        injectSearchResultsButtons();
    }
}

function getLcscIdFromPage() {
    // Strategy: URL extraction is most reliable for Detail Page
    // JLCPCB Pattern: .../partdetail/C10758
    // LCSC Patterns: .../product-detail/C17563125.html or ..._C1002.html
    const url = window.location.href;

    // Catch Cxxx at the end (JLCPCB style)
    const jlcMatches = url.match(/(C\d+)(\/?)$/);
    if (jlcMatches) return jlcMatches[1];

    // Catch Cxxx within filename (LCSC style)
    const lcscMatches = url.match(/\/(C\d+)\.html/) || url.match(/_(C\d+)\.html/);
    if (lcscMatches) return lcscMatches[1];

    // Fallback: finding it in the DOM
    const elements = document.querySelectorAll('*');
    for (let el of elements) {
        if (el.children.length === 0 && (el.textContent.includes('JLCPCB Part #:') || el.textContent.includes('LCSC Part #:'))) {
            const text = el.textContent;
            const match = text.match(/C\d+/);
            if (match) return match[0];
        }
    }
    return null;
}

function createExportButton(lcscId, isSmall = false) {
    if (isSmall) {
        const btn = document.createElement('span');
        btn.className = 'easyeda2kicad-mini-btn';
        btn.innerText = '⬇';
        btn.title = `Export ${lcscId} to KiCad`;
        btn.style.marginLeft = '8px';
        btn.style.cursor = 'pointer';
        btn.style.color = '#28a745';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '16px'; // Make it visible
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerConversion(lcscId, btn);
        };
        return btn;
    } else {
        const btn = document.createElement('button');
        btn.id = 'easyeda2kicad-btn';
        btn.innerText = 'Export to KiCad';
        btn.style.marginLeft = '10px';
        btn.style.padding = '5px 10px';
        btn.style.backgroundColor = '#28a745';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = 'bold';
        btn.onclick = () => {
            triggerConversion(lcscId, btn);
        };
        return btn;
    }
}

function injectPartDetailButton() {
    const lcscId = getLcscIdFromPage();
    if (!lcscId) return;

    // JLCPCB: .main-title-des
    // LCSC: .product-title, .details-title, .description-title, or .product-info h1
    const target = document.querySelector('.main-title-des') ||
        document.querySelector('.product-title') ||
        document.querySelector('.details-title') ||
        document.querySelector('.description-title') ||
        document.querySelector('.product-info h1') ||
        document.querySelector('.product-base-info h1') ||
        document.querySelector('h1')?.parentNode;

    if (target && !document.getElementById('easyeda2kicad-btn')) {
        const btn = createExportButton(lcscId, false);
        target.appendChild(btn);
    }
}

function injectSearchResultsButtons() {
    // Strategy: Scan leaf elements for text matching Cxxxx
    // This covers links, spans, divs, etc.
    // We target common text containers.
    const candidates = document.querySelectorAll('span, div, a, p, td');

    candidates.forEach(el => {
        // Optimization: Look for leaf nodes or nodes with only text content
        // If it has element children, likely not the leaf node holding the text.
        if (el.children.length > 0) return;

        const text = el.textContent.trim();
        // Strict match for C followed by numbers
        if (/^C\d+$/.test(text)) {
            // Check if we already handled this container (parent)
            // We append the button to the parent usually.
            // Check if ANY sibling is our button to avoid duplicates
            if (el.parentNode.querySelector('.easyeda2kicad-mini-btn')) return;

            // Create and inject
            const btn = createExportButton(text, true);
            el.parentNode.appendChild(btn);
        }
    });
}

function triggerConversion(lcscId, btnElement) {
    if (!globalSettings.outputPath) {
        alert('Please set the Output Directory in the extension settings first!');
        return;
    }

    const originalText = btnElement.innerText;
    // Lock width to prevent shrinking
    btnElement.style.minWidth = btnElement.offsetWidth + 'px';
    btnElement.innerText = 'Exporting...';

    chrome.runtime.sendMessage({
        action: 'convert',
        data: {
            lcsc_id: lcscId,
            output_path: globalSettings.outputPath,
            lib_name: globalSettings.libName,
            // Pass all options
            symbol: globalSettings.optSymbol,
            footprint: globalSettings.optFootprint,
            model3d: globalSettings.opt3D,
            overwrite: globalSettings.optOverwrite,
            v5: globalSettings.optV5
        }
    }, (response) => {
        btnElement.innerText = originalText;

        if (chrome.runtime.lastError) {
            alert('Extension Error: ' + chrome.runtime.lastError.message);
            return;
        }

        if (response && response.success) {
            // Visual feedback
            const originalColor = btnElement.style.color;
            btnElement.style.color = '#007bff';

            // Format detailed message
            const s = response.status || {};
            const msg = `Export Finished: ${lcscId}\n` +
                `--------------------------\n` +
                `Symbol:    ${s.symbol}\n` +
                `Footprint: ${s.footprint}\n` +
                `3D Model:  ${s.model3d}`;

            alert(msg);

            setTimeout(() => { btnElement.style.color = originalColor; }, 2000);
        } else {
            const errorMsg = response ? response.message : 'No response from local server. Please check if the EXE is running.';
            alert('Error: ' + errorMsg);
        }
    });
}

// Global Observer to handle SPA and Dynamic Content (Expansion)
const observer = new MutationObserver((mutations) => {
    let shouldInject = false;
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldInject = true;
            break;
        }
    }

    if (shouldInject) {
        runInjection();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial Trigger
setTimeout(runInjection, 1500);
