from flask import Flask, jsonify, request
from scapy.all import ARP, Ether, srp
from flask_cors import CORS
import requests
import threading
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# For thread-safe append to the device list
device_list_lock = threading.Lock()
processed_hostnames = set()

def get_printer_info(ip, mac, devices_list, processed_hostnames):
    info_url = f"http://{ip}/printer/info"
    extruder_url = f"http://{ip}/printer/objects/query?gcode_move&toolhead&extruder=target,temperature"
    extruder1_url = f"http://{ip}/printer/objects/query?gcode_move&toolhead&extruder1=target,temperature"
    heater_bed_url = f"http://{ip}/printer/objects/query?gcode_move&toolhead&extruder2=target,temperature"
    idle_timeout_url = f"http://{ip}/printer/objects/query?idle_timeout"
    
    try:
        # Fetching the basic printer information
        r_info = requests.get(info_url, timeout=3)
        r_info.raise_for_status()
        info_data = r_info.json()

        # Fetching the extruder data
        r_extruder = requests.get(extruder_url, timeout=3)
        r_extruder.raise_for_status()
        extruder_data = r_extruder.json()

        # Fetching the extruder1 data
        r_extruder1 = requests.get(extruder1_url, timeout=3)
        r_extruder1.raise_for_status()
        extruder1_data = r_extruder1.json()

        # Fetching the heater_bed data
        r_heater_bed = requests.get(heater_bed_url, timeout=3)
        r_heater_bed.raise_for_status()
        heater_bed_data = r_heater_bed.json()


        # Fetching printer state
        r_idle_timeout = requests.get(idle_timeout_url, timeout=3)
        r_idle_timeout.raise_for_status()
        idle_timeout_data = r_idle_timeout.json()

        status = idle_timeout_data['result']['status']['idle_timeout']['state']

        hostname = info_data['result']['hostname']

        software_version = info_data['result']['software_version']
        if software_version.startswith('v0.11'):
            software_version = info_data['result']['software_version']
        else:
            software_version = info_data['result']['software_version']

        state_message = info_data['result']['state_message']
        #if 'mcu' in state_message:
        #    state_message = 'error'

        extruder_temperature = extruder_data['result']['status']['extruder']['temperature']
        extruder1_temperature = extruder1_data['result']['status']['extruder1']['temperature']
        heater_bed_temperature = heater_bed_data['result']['status']['extruder2']['temperature']

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

    except requests.RequestException:
        pass

@app.route('/')
def home():
    return app.send_static_file('index.html')
@app.route('/devices', methods=['GET'])
def get_devices():
    target_ip = "192.168.1.1/24"    #Add your IP range here
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
    try:
        r_gcode = requests.get(gcode_help_url, timeout=3)
        r_gcode.raise_for_status()
        return r_gcode.json()
    except requests.RequestException:
        return jsonify({"error": "Failed to fetch GCode commands"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)


