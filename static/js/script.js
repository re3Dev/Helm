window.onload = function() {
    const serverIp = window.location.hostname;
    const fetchUrl = `http://${serverIp}:5000/devices`;
    fetch(fetchUrl)
    .then(response => response.json())
    .then(data => {
        const tableBody = document.querySelector('#devicesTable tbody');
        data.forEach(device => {
            let row = document.createElement("tr");
            row.setAttribute("data-ip", device.ip);
        
            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'device-checkbox';  
            checkbox.value = device.ip;
            checkbox.id = `checkbox_${device.ip}`;  // Add an ID to the checkbox
            
            const label = document.createElement('label');
            label.htmlFor = `checkbox_${device.ip}`;  // Create a corresponding label

            checkboxCell.appendChild(checkbox);
            checkboxCell.appendChild(label);  // Append the label after the checkbox
            row.appendChild(checkboxCell);
        
            ['hostname', 'ip', 'status', 'state_message', 'extruder_temperature', 'extruder1_temperature', 'heater_bed_temperature', 'software_version', 'mac', 'last_gcode_command'].forEach(key => {
                const cell = document.createElement('td');
                
                if (key === 'ip') {
                    const anchorElement = document.createElement('a');
                    anchorElement.href = `http://${device[key]}`;
                    anchorElement.target = '_blank'; 
                    anchorElement.textContent = device[key];
                    cell.appendChild(anchorElement);
                
                } else {
                    cell.textContent = device[key];
                }
                
                row.appendChild(cell);
            });
        
            tableBody.appendChild(row);
        });
        const rowCount = tableBody.rows.length;
        document.getElementById('deviceCount').innerText = `Number of Printers: ${rowCount}`;
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });

    document.getElementById('toggleSelection').addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('.device-checkbox');
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
    });

    document.querySelector("#showGcodeCommandsBtn").addEventListener("click", function() {
        let checkboxes = document.querySelectorAll(".device-checkbox");
        let selectedDeviceIP = null;
        
        checkboxes.forEach(function(checkbox) {
            if (!selectedDeviceIP && checkbox.checked) {
                selectedDeviceIP = checkbox.value;
            }
        });
    
        if (!selectedDeviceIP) {
            alert("Please select at least one device.");
            return;
        }
    
        fetch(`/fetch_gcode_commands?deviceIP=${selectedDeviceIP}`)
        .then(response => response.json())
        .then(data => {
            const gcodeOutput = document.getElementById("gcodeOutput");
            gcodeOutput.innerHTML = "";
            const dropdown = document.getElementById('commandDropdown');
            dropdown.innerHTML = "";
            
            for (let command in data.result) {
                if(data.result.hasOwnProperty(command)) {
                    const description = data.result[command];
    
                    const option = document.createElement('option');
                    option.value = command;
                    option.textContent = command;
                    dropdown.appendChild(option);
    
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `<strong>${command}</strong>: ${description}`;
                    gcodeOutput.appendChild(listItem);
                }
            }
        })
        .catch(error => {
            console.error("There was an error fetching GCode commands:", error);
        });
    });
    
    const fetchInterval = 5000;

    setInterval(() => {
        fetch('/devices')
        .then(response => response.json())
        .then(data => {
            updateSpecifiedColumns(data);
        })
        .catch(error => {
            console.error("Error fetching device data:", error);
        });
    }, fetchInterval);

    function updateSpecifiedColumns(data) {
        const table = document.getElementById('devicesTable').querySelector('tbody');
        let printingCount = 0;
        data.forEach(device => {
            let row = table.querySelector(`tr[data-ip="${device.ip}"]`);

            if (row) {
                row.cells[4].textContent = device.state_message;
                row.cells[5].textContent = device.extruder_temperature;
                row.cells[6].textContent = device.extruder1_temperature;
                row.cells[7].textContent = device.heater_bed_temperature;
                
                fetchLastGcodeCommand(device.ip, row.cells[9]);

                const statusCell = row.cells[3]; 
                statusCell.classList.remove('status-ready', 'status-idle', 'status-printing');
                switch (device.status) {
                    case "Ready":
                        statusCell.classList.add('status-ready');
                        break;
                    case "Idle":
                        statusCell.classList.add('status-idle');
                        break;
                    case "Printing":
                        statusCell.classList.add('status-printing');
                        printingCount++;
                        break;
                }        
            } else {
                console.error("No row found for IP", device.ip);
            }
        });
        document.getElementById('printingCount').innerText = `Printing: ${printingCount}`;
    }

    function fetchLastGcodeCommand(deviceIP, cell) {
        fetch(`http://${deviceIP}/server/gcode_store?count=1`)
        .then(response => response.json())
        .then(data => {
            if (data.result.gcode_store && data.result.gcode_store.length > 0) {
                const lastGcodeCommand = data.result.gcode_store[0];
                cell.innerHTML = `${lastGcodeCommand.message}`;
            } else {
                cell.innerHTML = "No G-code commands found.";
            }
        })
        .catch(error => {
            console.error("Error fetching last G-code command:", error);
        });
    }

    document.getElementById("fetchGcodeFilesBtn").addEventListener("click", function() {
        let checkboxes = document.querySelectorAll(".device-checkbox");
        let selectedDeviceIP = null;

        checkboxes.forEach(function(checkbox) {
            if (!selectedDeviceIP && checkbox.checked) {
                selectedDeviceIP = checkbox.value;
            }
        });

        if (!selectedDeviceIP) {
            alert("Please select a device.");
            return;
        }

        fetch(`http://${selectedDeviceIP}/server/files/list?root=gcodes`)
        .then(response => response.json())
        .then(data => {
            populateDropdown(data.result);
        })
        .catch(error => {
            console.error("Error fetching GCode files:", error);
        });
    });

    function populateDropdown(files) {
        const dropdown = document.getElementById('gcodeDropdown');
        dropdown.innerHTML = "";

        files.forEach(file => {
            const option = document.createElement("option");
            option.value = file.path; 
            option.textContent = file.path; 
            dropdown.appendChild(option);
        });
    }
// home all
    $(document).ready(function() {
        $('#homeAllButton').click(function() {
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/gcode/script';

                $.post(url, { script: 'G28' })
                .done(function(data) {
                    console.log('Request succeeded for ' + deviceId);
                })
                .fail(function() {
                    console.log('Request failed for ' + deviceId);
                });
            });
        });
    });
//send custom gcode
    $(document).ready(function() {
        $('#gcodeForm').submit(function(e) {
            e.preventDefault();

            const gcode = $('#gcodeInput').val();

            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/gcode/script?script=' + encodeURIComponent(gcode);

                $.post(url)
                .done(function(data) {
                    console.log('Request succeeded for ' + deviceId);
                })
                .fail(function() {
                    console.log('Request failed for ' + deviceId);
                });
            });
        });
    });
//bottom heater temp
    $(document).ready(function() {
        $('#temp0form').submit(function(e) {
            e.preventDefault();

            const temp0 = $('#temp0Input').val();
            const heatCommand0 = "SET_HEATER_TEMPERATURE HEATER=extruder TARGET="
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/gcode/script?script=' + encodeURIComponent(heatCommand0) + encodeURIComponent(temp0);

                $.post(url)
                .done(function(data) {
                    console.log('Request succeeded for ' + deviceId);
                })
                .fail(function() {
                    console.log('Request failed for ' + deviceId);
                });
            });
        });
    });
//middle heater temp
    $(document).ready(function() {
        $('#temp1form').submit(function(e) {
            e.preventDefault();

            const temp1 = $('#temp1Input').val();
            const heatCommand1 = "SET_HEATER_TEMPERATURE HEATER=extruder1 TARGET="
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/gcode/script?script=' + encodeURIComponent(heatCommand1) + encodeURIComponent(temp1);

                $.post(url)
                .done(function(data) {
                    console.log('Request succeeded for ' + deviceId);
                })
                .fail(function() {
                    console.log('Request failed for ' + deviceId);
                });
            });
        });
    });
//top heater temp
    $(document).ready(function() {
        $('#temp2form').submit(function(e) {
            e.preventDefault();

            const temp2 = $('#temp2Input').val();
            const heatCommand2 = "SET_HEATER_TEMPERATURE HEATER=extruder2 TARGET="
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/gcode/script?script=' + encodeURIComponent(heatCommand2) + encodeURIComponent(temp2);

                $.post(url)
                .done(function(data) {
                    console.log('Request succeeded for ' + deviceId);
                })
                .fail(function() {
                    console.log('Request failed for ' + deviceId);
                });
            });
        });
    });
//upload file
    $(document).ready(function() {
        $('#uploadFileButton').click(function() {
            var fileInput = document.getElementById('fileInput');
            var file = fileInput.files[0];

            if (!file) {
                console.log('No file selected.');
                alert('No file selected.');
                return;
            }

            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/server/files/upload';

                var formData = new FormData();
                formData.append('file', file);
                formData.append('root', 'gcodes');
                
                $.ajax({
                    url: url,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(data) {
                        console.log('Upload succeeded for ' + deviceId);  
                    },
                    error: function() {
                        console.log('Upload failed for ' + deviceId);
                    }
                });
            });
        });
    });
//delete file
    $(document).ready(function() {
        $('#deleteFileButton').click(function() {
            var selectedFile = $('#gcodeDropdown').val();

            if (!selectedFile) {
                alert('No file selected.');
                return;
            }

            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/server/files/gcodes/' + encodeURIComponent(selectedFile);

                $.ajax({
                    url: url,
                    type: 'DELETE',
                    success: function(data) {
                        console.log('Deletion succeeded for ' + deviceId + ' (File: ' + selectedFile + ')');
                    },
                    error: function() {
                        console.log('Deletion failed for ' + deviceId + ' (File: ' + selectedFile + ')');
                    }
                });
            });
        });
    });
//firmware restart
    $(document).ready(function() {
        $('#firmwareRestartButton').click(function() {
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/firmware_restart';

                $.ajax({
                    url: url,
                    type: 'POST',
                    success: function(data) {
                        console.log('Firmware restart initiated for ' + deviceId);
                    },
                    error: function() {
                        console.error('Firmware restart failed for ' + deviceId);
                    }
                });
            });
        });
    });
//emergency stop
    $(document).ready(function() {
        $('#eStopButton').click(function() {
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/emergency_stop';

                $.ajax({
                    url: url,
                    type: 'POST',
                    success: function(data) {
                        console.log('Emergency stop initiated for ' + deviceId);
                    },
                    error: function() {
                        console.error('Emergency stop failed for ' + deviceId);
                    }
                });
            });
        });
    });
//cooldown
    $(document).ready(function() {
        $('#turnOffHeatersButton').click(function() {
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/gcode/script?script=TURN_OFF_HEATERS';

                $.ajax({
                    url: url,
                    type: 'POST',
                    success: function(data) {
                        console.log('Heaters turned off for ' + deviceId);
                    },
                    error: function() {
                        console.error('Heaters failed to turn off for ' + deviceId);
                    }
                });
            });
        });
    });
//start print
    $(document).ready(function() {
        $('#startPrintButton').click(function() {
            var selectedFile = $('#gcodeDropdown').val();

            if (!selectedFile) {
                alert('No file selected.');
                return;
            }

            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/print/start?filename=' + encodeURIComponent(selectedFile);

                $.ajax({
                    url: url,
                    type: 'POST',
                    success: function(data) {
                        console.log('Print started for ' + deviceId + ' (File: ' + selectedFile + ')');
                    },
                    error: function() {
                        console.error('Failed to start print for ' + deviceId + ' (File: ' + selectedFile + ')');
                    }
                });
            });
        });
    });
//cancel print
    $(document).ready(function() {
        $('#cancelPrintButton').click(function() {
            $('input[type="checkbox"]:checked').each(function() {
                var deviceId = $(this).val();
                var url = 'http://' + deviceId + '/printer/print/cancel';

                $.ajax({
                    url: url,
                    type: 'POST',
                    success: function(data) {
                        console.log('Print cancel request sent for ' + deviceId);
                    },
                    error: function() {
                        console.error('Failed to send cancel request for ' + deviceId);
                    }
                });
            });
        });
    });
}
