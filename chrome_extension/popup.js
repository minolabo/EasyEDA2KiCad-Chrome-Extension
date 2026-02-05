document.addEventListener('DOMContentLoaded', () => {
    const outputPathInput = document.getElementById('outputPath');
    const libNameInput = document.getElementById('libName');
    const browseBtn = document.getElementById('browseBtn');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Checkboxes
    const optSymbol = document.getElementById('optSymbol');
    const optFootprint = document.getElementById('optFootprint');
    const opt3D = document.getElementById('opt3D');
    const optOverwrite = document.getElementById('optOverwrite');
    const optV5 = document.getElementById('optV5');
    const optSearchPage = document.getElementById('optSearchPage');

    // Load saved settings
    chrome.storage.local.get([
        'outputPath', 'libName',
        'optSymbol', 'optFootprint', 'opt3D',
        'optOverwrite', 'optV5', 'optSearchPage'
    ], (result) => {
        // Path logic
        if (result.outputPath) {
            outputPathInput.value = result.outputPath;
        } else {
            // Fetch default path from local server
            fetch('http://127.0.0.1:5000/config')
                .then(res => res.json())
                .then(data => {
                    if (data.default_path) outputPathInput.value = data.default_path;
                })
                .catch(err => console.log('Server likely not running yet', err));
        }

        if (result.libName) {
            libNameInput.value = result.libName;
        }

        // Checkbox logic (default to true except v5 if undefined, but storage returns undefined if not set)
        // We want defaults: Symbol=T, FP=T, 3D=T, OW=T, V5=F, Search=T
        // Use 'result.key !== false' to default to true for undefined
        optSymbol.checked = result.optSymbol !== false;
        optFootprint.checked = result.optFootprint !== false;
        opt3D.checked = result.opt3D !== false;
        optOverwrite.checked = result.optOverwrite === true; // Default false
        optV5.checked = result.optV5 === true; // Default false
        optSearchPage.checked = result.optSearchPage !== false;
    });

    // Browse Button Logic
    browseBtn.addEventListener('click', () => {
        fetch('http://127.0.0.1:5000/select-folder')
            .then(res => res.json())
            .then(data => {
                if (data.path) {
                    outputPathInput.value = data.path;
                }
            })
            .catch(err => {
                alert('Failed to open folder picker. Is the server running?');
                console.error(err);
            });
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const settings = {
            outputPath: outputPathInput.value,
            libName: libNameInput.value || 'easyeda2kicad',
            optSymbol: optSymbol.checked,
            optFootprint: optFootprint.checked,
            opt3D: opt3D.checked,
            optOverwrite: optOverwrite.checked,
            optV5: optV5.checked,
            optSearchPage: optSearchPage.checked
        };

        chrome.storage.local.set(settings, () => {
            statusDiv.style.display = 'block';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 2000);
        });
    });
});
