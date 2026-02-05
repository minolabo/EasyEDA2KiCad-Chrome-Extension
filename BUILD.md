# Build Instructions

## Prerequisites
- Python 3.8 or higher
- pip

## Setup
```bash
pip install -r requirements.txt
pip install pyinstaller
```

## Build the Server Executable
```bash
pyinstaller --noconfirm --onefile --console --icon=icon.ico --name "EasyEDA2KiCad_Server" --add-data "easyeda2kicad;easyeda2kicad" server.py
```

The executable will be created in the `dist/` folder.

## Notes
- The `--add-data` flag bundles the `easyeda2kicad` library with the executable
- On Windows, use semicolon (`;`) as the separator
- On Linux/Mac, use colon (`:`) as the separator
