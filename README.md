
# This repository is deprecated and current work has moved to: https://github.com/re3Dev/helm-vite
# HELM - Web application for multiple 3D-printers



*Note: VERY early in the development process. Not all functionality has been implemented.*

![image](https://github.com/re3Dev/helm/assets/128167557/12a45dff-27f4-4c68-bb18-86a556c94223)

## Table of Contents
- [Overview](#overview)
- [Features](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Roadmap](#roadmap)
- [Contribution](#contribution)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Overview
Helm works on top of other open source software, namely Klipper firmware with the Mainsail front-end, and leverages the Moonraker API to monitor and control multiple machines all at once through a single web page.

## Features
- Server hosted on local network for multiple clients
- Local network scanning for automatic connection to printers
- Status monitoring
- Display hostname, ip address, firmware version
- Dynamic monitoring of status, state message, temperatures, and command response
- Multi-printer selection for command execution
- File upload/deletion
- Start/stop prints
- List gcode files on a particular machine
- List commands
- Send gcode commands
- Set temperatures
- Cooldown heaters
- Firmware restart
- Emergency stop

## Installation
You will need to have python3 installed, along with the flask library.

Most likely, you will need to change the target IP range. It is located in backend.py in the get_devices() function:
target_ip = "10.1.10.1/24"

To start serving the web page, start backend.py by running it or using the command line. The page will be served at http://127.0.0.1:5000 or http://{host_ip}:5000
## Usage


## Technologies Used
- Flask
- Moonraker API
- Klipper firmware

## Roadmap
- Serve app over local network instead of local host
- Improve fetch interval - currently 5 seconds
- Include more detailed print information
- console or terminal to show command responses and input commands manually
  
- Need to add functionality for:
  - update software
  - power and reset commands
  - file upload
  - print control
  - manual gcode input
- Functionality currently implemented:
  - automatic fetching and updating temperatures, status, and state message
  - display gcode commands
  - display gcode files
  - hyperlinks to each printer
  - check boxes for each printer

## Contribution
Open for contributions! 

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgements
- Klipper Firmware
- Moonraker API
