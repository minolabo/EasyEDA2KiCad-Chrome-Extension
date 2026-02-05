import os
import logging
import re
import tkinter as tk
from tkinter import filedialog
from flask import Flask, request, jsonify
from flask_cors import CORS

# Imports from easyeda2kicad package
from easyeda2kicad.easyeda.easyeda_api import EasyedaApi
from easyeda2kicad.easyeda.easyeda_importer import (
    Easyeda3dModelImporter,
    EasyedaFootprintImporter,
    EasyedaSymbolImporter,
)
from easyeda2kicad.kicad.export_kicad_3d_model import Exporter3dModelKicad
from easyeda2kicad.kicad.export_kicad_footprint import ExporterFootprintKicad
from easyeda2kicad.kicad.export_kicad_symbol import ExporterSymbolKicad
from easyeda2kicad.kicad.parameters_kicad_symbol import KicadVersion
from easyeda2kicad.helpers import (
    add_component_in_symbol_lib_file,
    id_already_in_symbol_lib,
    update_component_in_symbol_lib_file,
)

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def fp_already_in_footprint_lib(lib_path: str, package_name: str) -> bool:
    if os.path.isfile(f"{lib_path}/{package_name}.kicad_mod"):
        logging.warning(f"The footprint for this id is already in {lib_path}")
        return True
    return False

@app.route('/config', methods=['GET'])
def get_config():
    default_path = os.path.join(os.path.expanduser("~"), "Documents", "KiCad", "easyeda2kicad")
    return jsonify({'default_path': default_path})

@app.route('/select-folder', methods=['GET'])
def select_folder():
    try:
        root = tk.Tk()
        root.withdraw() # Hide the main window
        root.attributes('-topmost', True) # Bring dialog to front
        folder_path = filedialog.askdirectory()
        root.destroy()
        if folder_path:
            return jsonify({'path': folder_path.replace("\\", "/")})
        return jsonify({'path': None})
    except Exception as e:
        return jsonify({'path': None, 'error': str(e)}), 500

@app.route('/convert', methods=['POST'])
def convert_part():
    data = request.json
    lcsc_id = data.get('lcsc_id')
    output_path = data.get('output_path')
    lib_name = data.get('lib_name', 'easyeda2kicad')
    
    # Flags (default to True if not provided, except v5)
    export_symbol = data.get('symbol', True)
    export_footprint = data.get('footprint', True)
    export_3d = data.get('model3d', True)
    overwrite = data.get('overwrite', False)
    is_v5 = data.get('v5', False)

    if not lcsc_id or not output_path:
        return jsonify({'success': False, 'message': 'Missing lcsc_id or output_path'}), 400

    logging.info(f"Processing {lcsc_id} -> {output_path} (Flags: S={export_symbol}, F={export_footprint}, 3D={export_3d}, OW={overwrite}, V5={is_v5})")

    status = {
        "symbol": "Skipped",
        "footprint": "Skipped",
        "model3d": "Skipped"
    }

    try:
        # Prepare paths
        base_folder = output_path.replace("\\", "/")
        full_output_base = f"{base_folder}/{lib_name}" 
        
        if not os.path.isdir(base_folder):
            os.makedirs(base_folder, exist_ok=True)

        # Create folders
        if not os.path.isdir(f"{full_output_base}.pretty"):
            os.mkdir(f"{full_output_base}.pretty")
        
        if not os.path.isdir(f"{full_output_base}.3dshapes"):
            os.mkdir(f"{full_output_base}.3dshapes")

        kicad_version = KicadVersion.v5 if is_v5 else KicadVersion.v6
        sym_lib_ext = "lib" if is_v5 else "kicad_sym"

        # Ensure symbol lib exists
        sym_lib_path = f"{full_output_base}.{sym_lib_ext}"
        if not os.path.isfile(sym_lib_path):
            with open(sym_lib_path, "w", encoding="utf-8") as f:
                if kicad_version == KicadVersion.v6:
                    f.write('(kicad_symbol_lib\n  (version 20211014)\n  (generator https://github.com/uPesy/easyeda2kicad.py)\n)')
                else:
                    f.write("EESchema-LIBRARY Version 2.4\n#encoding utf-8\n")

        # API Fetch
        api = EasyedaApi()
        cad_data = api.get_cad_data_of_component(lcsc_id=lcsc_id)

        if not cad_data:
            return jsonify({'success': False, 'message': 'Part not found on EasyEDA'}), 404

        # 1. Symbol
        if export_symbol:
            try:
                importer = EasyedaSymbolImporter(easyeda_cp_cad_data=cad_data)
                easyeda_symbol = importer.get_symbol()
                
                is_exist = id_already_in_symbol_lib(
                    lib_path=sym_lib_path,
                    component_name=easyeda_symbol.info.name,
                    kicad_version=kicad_version
                )

                if is_exist and not overwrite:
                    status["symbol"] = "Exists (Skipped)"
                else:
                    exporter = ExporterSymbolKicad(symbol=easyeda_symbol, kicad_version=kicad_version)
                    kicad_symbol_lib = exporter.export(footprint_lib_name=lib_name)

                    if is_exist:
                        update_component_in_symbol_lib_file(
                            lib_path=sym_lib_path,
                            component_name=easyeda_symbol.info.name,
                            component_content=kicad_symbol_lib,
                            kicad_version=kicad_version
                        )
                    else:
                        add_component_in_symbol_lib_file(
                            lib_path=sym_lib_path,
                            component_content=kicad_symbol_lib,
                            kicad_version=kicad_version
                        )
                    status["symbol"] = "OK"
            except Exception as e:
                logging.error(f"Symbol Error: {e}")
                status["symbol"] = "Error"

        # 2. Footprint
        if export_footprint:
            try:
                importer = EasyedaFootprintImporter(easyeda_cp_cad_data=cad_data)
                easyeda_footprint = importer.get_footprint()
                
                footprint_repo = f"{full_output_base}.pretty"
                is_fp_exist = fp_already_in_footprint_lib(lib_path=footprint_repo, package_name=easyeda_footprint.info.name)

                if is_fp_exist and not overwrite:
                    status["footprint"] = "Exists (Skipped)"
                else:
                    ki_footprint = ExporterFootprintKicad(footprint=easyeda_footprint)
                    footprint_filename = f"{easyeda_footprint.info.name}.kicad_mod"
                    model_3d_path = os.path.abspath(f"{full_output_base}.3dshapes").replace("\\", "/")

                    ki_footprint.export(
                        footprint_full_path=f"{footprint_repo}/{footprint_filename}",
                        model_3d_path=model_3d_path
                    )
                    status["footprint"] = "OK"
            except Exception as e:
                logging.error(f"Footprint Error: {e}")
                status["footprint"] = "Error"

        # 3. 3D Model
        if export_3d:
            try:
                importer_3d = Easyeda3dModelImporter(
                    easyeda_cp_cad_data=cad_data, download_raw_3d_model=True
                )
                if importer_3d.output:
                    exporter_3d = Exporter3dModelKicad(model_3d=importer_3d.output)
                    exporter_3d.export(lib_path=full_output_base)
                    status["model3d"] = "OK"
                else:
                    status["model3d"] = "No Data"
            except Exception as e:
                logging.error(f"3D Model Error: {e}")
                status["model3d"] = "Error"

        return jsonify({'success': True, 'status': status, 'message': f'Finished processing {lcsc_id}'})

    except Exception as e:
        logging.error(f"Error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    logging.info("Starting Server...")
    app.run(port=5000)
