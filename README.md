# EasyEDA2KiCad Chrome Extension

Directly export electronic components from **JLCPCB** and **LCSC** to **KiCad** libraries (Symbol, Footprint, 3D Model).

This project is an enhanced edition based on the original [uPesy/easyeda2kicad.py](https://github.com/uPesy/easyeda2kicad.py). It adds a Chrome Extension and a local server for a seamless "One-Click" export experience.

---

## Installation / インストール方法

### 1. Local Server / 変換サーバー
1.  Download the latest `EasyEDA2KiCad_Server.exe` from the [Releases](https://github.com/minolabo/EasyEDA2KiCad-Chrome-Extension/releases) page.
2.  Run the downloaded EXE file (you may need to allow access if prompted by security warnings).

### 2. Chrome Extension / Chrome 拡張機能
1.  Open `chrome://extensions` in Chrome browser.
2.  Enable "Developer mode" in the top right corner.
3.  Click "Load unpacked" and select the `chrome_extension` folder from this repository.

---

## How to Use / 使い方

1.  **Start the server**: Launch `EasyEDA2KiCad_Server.exe`.
2.  **Configure settings**: Click the extension icon and set the "Output Directory".
3.  **Export components**:
    - Open a product detail page on [JLCPCB](https://jlcpcb.com/) or [LCSC](https://www.lcsc.com/), and an **Export to KiCad** button will appear.
    - On search result pages, download icons (⬇) will appear next to each part number.
4.  **Import to KiCad**:
    - In KiCad, add the output path as an environment variable (e.g., `EASYEDA2KICAD`).
    - Register the symbol/footprint libraries to start using them in your designs.

---

## License / ライセンス

This project follows the original [uPesy/easyeda2kicad.py](https://github.com/uPesy/easyeda2kicad.py) and is released under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See the [LICENSE](LICENSE) file for details.

---

## Disclaimer / 免責事項

The accuracy of converted symbols and footprints cannot be guaranteed. Always double-check footprint dimensions and symbol pin assignments against the actual component before using them in your designs.
