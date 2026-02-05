chrome.runtime.onInstalled.addListener(initializeSettings);
chrome.runtime.onStartup.addListener(initializeSettings);

function initializeSettings() {
    chrome.storage.local.get(['outputPath'], (result) => {
        if (!result.outputPath) {
            fetch('http://127.0.0.1:5000/config')
                .then(res => res.json())
                .then(data => {
                    if (data.default_path) {
                        chrome.storage.local.set({ outputPath: data.default_path });
                    }
                })
                .catch(err => console.log('Could not fetch default path on startup:', err));
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'convert') {
        handleConversion(request.data, sendResponse);
        return true; // Keep the message channel open for async response
    }
});

async function handleConversion(data, sendResponse) {
    try {
        const response = await fetch('http://127.0.0.1:5000/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            let errorMsg = `Server error (${response.status})`;
            try {
                const result = await response.json();
                if (result.message) errorMsg += ': ' + result.message;
            } catch (e) {
                // Not JSON
            }
            sendResponse({ success: false, message: errorMsg });
            return;
        }

        const result = await response.json();
        sendResponse(result);
    } catch (error) {
        console.error('Fetch error:', error);
        sendResponse({ success: false, message: 'Failed to connect to local server. Is it running? (Error: ' + error.message + ')' });
    }
}
