from flask import Flask, jsonify, request
from scapy.all import ARP, Ether, srp
from flask_cors import CORS
import requests
import threading
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# For thread-safe append to the device list
device_list_lock = threading.Lock()
processed_hostnames = set()

def fetch_url(url, timeout=3):
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Error fetching URL {url}: {e}")
        return None

def get_printer_info(ip, mac, devices_list, processed_hostnames):
    urls = {
        "info": f"http://{ip}/printer/info",
        "extruder": f"http://{ip}/printer/objects/query?gcode_move&toolhead&extruder=target,temperature",
        "extruder1": f"http://{ip}/printer/objects/query?gcode_move&toolhead&extruder1=target,temperature",
        "heater_bed": f"http://{ip}/printer/objects/query?gcode_move&toolhead&heater_bed=target,temperature",
        "idle_timeout": f"http://{ip}/printer/objects/query?idle_timeout"
    }

    info_data = fetch_url(urls["info"])
    extruder_data = fetch_url(urls["extruder"])
    extruder1_data = fetch_url(urls["extruder1"])
    heater_bed_data = fetch_url(urls["heater_bed"])
    idle_timeout_data = fetch_url(urls["idle_timeout"])

    if not info_data or not extruder_data or not extruder1_data or not heater_bed_data or not idle_timeout_data:
        return

    status = idle_timeout_data['result']['status']['idle_timeout']['state']
    hostname = info_data['result']['hostname']

    software_version = info_data['result']['software_version']
    state_message = info_data['result']['state_message']
    extruder_temperature = extruder_data['result']['status']['extruder']['temperature']
    extruder1_temperature = extruder1_data['result']['status']['extruder1']['temperature']
    heater_bed_temperature = heater_bed_data['result']['status']['heater_bed']['temperature']

        # Add to the devices list with a lock to ensure thread safety
    with device_list_lock:
        if hostname in processed_hostnames:
            return
        processed_hostnames.add(hostname)
        devices_list.append({
            'hostname': hostname,
            'ip': ip,
            'mac': mac,
            'software_version': software_version,
            'state_message': state_message,
            'status': status,
            'extruder_temperature': extruder_temperature,
            'extruder1_temperature': extruder1_temperature,
            'heater_bed_temperature': heater_bed_temperature
        })

@app.route('/')
def home():
    return app.send_static_file('index.html')
@app.route('/devices', methods=['GET'])
def get_devices():
    target_ip = os.getenv("TARGET_IP_RANGE", "192.168.7.1/24")  # Add your IP range here
    arp = ARP(pdst=target_ip)
    ether = Ether(dst="ff:ff:ff:ff:ff:ff")
    packet = ether/arp

    result = srp(packet, timeout=3, verbose=0)[0]

    devices_list = []
    processed_hostnames = set()
    threads = []
    for sent, received in result:
        ip = received.psrc
        mac = received.hwsrc
        thread = threading.Thread(target=get_printer_info, args=(ip, mac, devices_list, processed_hostnames))
        thread.start()
        threads.append(thread)

    # Ensure all threads complete before returning
    for thread in threads:
        thread.join()

    return jsonify(devices_list)

@app.route('/fetch_gcode_commands', methods=['GET'])
def fetch_gcode_commands():
    ip = request.args.get('deviceIP')
    if not ip:
        return jsonify({"error": "No IP provided"}), 400

    gcode_help_url = f"http://{ip}/printer/gcode/help"
    gcode_data = fetch_url(gcode_help_url)

    if not gcode_data:
        return jsonify({"error": "Failed to fetch GCode commands"}), 500

    return jsonify(gcode_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)


