window.onload = function() {
    fetch('http://127.0.0.1:5000/devices')
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
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);
        
            ['hostname', 'ip', 'status', 'state_message', 'extruder_temperature', 'extruder1_temperature', 'heater_bed_temperature', 'software_version', 'mac'].forEach(key => {
                const cell = document.createElement('td');
                
                if (key === 'ip') {
                    const anchorElement = document.createElement('a');
                    anchorElement.href = `http://${device[key]}`;
                    anchorElement.target = '_blank'; 
                    anchorElement.textContent = device[key];
                    cell.appendChild(anchorElement);
                } else if (key === 'software_version') {
                    const detailElement = document.createElement('details');
                    const summaryElement = document.createElement('summary');
                    summaryElement.textContent = device[key];
                    detailElement.appendChild(summaryElement);
            
                    const moreInfo = document.createElement('p');
                    moreInfo.textContent = 'More details about ' + key + '...';  // Add your detailed info here.
                    detailElement.appendChild(moreInfo);
            
                    cell.appendChild(detailElement);
                } else {
                    cell.textContent = device[key];
                }
                
                row.appendChild(cell);

            });
        
            tableBody.appendChild(row);
        });
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
        
        // Iterate through checkboxes and find the first checked one
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
            // Clearing previous commands and dropdown
            gcodeOutput.innerHTML = "";
            const dropdown = document.getElementById('commandDropdown');
            dropdown.innerHTML = ""; // clear previous options
            
            for (let command in data.result) {
                if(data.result.hasOwnProperty(command)) {
                    const description = data.result[command];
    
                    // Adding command to the dropdown
                    const option = document.createElement('option');
                    option.value = command;
                    option.textContent = command;
                    dropdown.appendChild(option);
    
                    // Adding to the list
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
    
const fetchInterval = 5000;  // Fetch every 10 seconds. Adjust this value as required.

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
    data.forEach(device => {
        // Use querySelector to find the row by its embedded IP attribute
        let row = table.querySelector(`tr[data-ip="${device.ip}"]`);

        if (row) {
            row.cells[4].textContent = device.state_message;
            row.cells[5].textContent = device.extruder_temperature;
            row.cells[6].textContent = device.extruder1_temperature;
            row.cells[7].textContent = device.heater_bed_temperature;

            const statusCell = row.cells[3]; 
            statusCell.classList.remove('status-ready', 'status-idle', 'status-printing'); // Clear previous statuses
            switch (device.status) {
                case "Ready":
                    statusCell.classList.add('status-ready');
                    break;
                case "Idle":
                    statusCell.classList.add('status-idle');
                    break;
                case "Printing":
                    statusCell.classList.add('status-printing');
                    break;
            }        
      } else {
            console.error(".", device.ip);
        }
    });
}
document.getElementById("fetchGcodeFilesBtn").addEventListener("click", function() {
    let checkboxes = document.querySelectorAll(".device-checkbox");
    let selectedDeviceIP = null;

    // Find the first checked device
    checkboxes.forEach(function(checkbox) {
        if (!selectedDeviceIP && checkbox.checked) {
            selectedDeviceIP = checkbox.value;
        }
    });

    if (!selectedDeviceIP) {
        alert("Please select a device.");
        return;
    }

    // Fetch the GCode files
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

    // Clear existing options
    dropdown.innerHTML = "";

    // Add the new options
    files.forEach(file => {
        const option = document.createElement("option");
        option.value = file.path; 
        option.textContent = file.path; 
        dropdown.appendChild(option);
    });
} 
$(document).ready(function() {
    $('#homeAllButton').click(function() {
        // Select all checkboxes that are checked
        $('input[type="checkbox"]:checked').each(function() {
            var deviceId = $(this).val(); // Assuming the value of checkbox is device id or IP address
            var url = 'http://' + deviceId + '/printer/gcode/script';

            // Send a POST request to the selected device
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
            var deviceId = $(this).val(); // Assuming the value of checkbox is device IP address
            var url = 'http://' + deviceId + '/server/files/upload';

            var formData = new FormData();
            formData.append('file', file);
            formData.append('root', 'gcodes'); // Specify the root directory
            

            $.ajax({
                url: url,
                type: 'POST',
                data: formData,
                processData: false, // prevent jQuery from converting the data
                contentType: false, // prevent jQuery from setting content type
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

$(document).ready(function() {
    $('#deleteFileButton').click(function() {
        var selectedFile = $('#gcodeDropdown').val();

        if (!selectedFile) {
            alert('No file selected.');
            return;
        }

        $('input[type="checkbox"]:checked').each(function() {
            var deviceId = $(this).val(); // Assuming the value of checkbox is device IP address
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
$(document).ready(function() {
    $('#firmwareRestartButton').click(function() {
        $('input[type="checkbox"]:checked').each(function() {
            var deviceId = $(this).val(); // Assuming the value of checkbox is device IP address
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
$(document).ready(function() {
    $('#startPrintButton').click(function() {
        var selectedFile = $('#gcodeDropdown').val();

        if (!selectedFile) {
            alert('No file selected.');
            return;
        }

        $('input[type="checkbox"]:checked').each(function() {
            var deviceId = $(this).val(); // Assuming the value of checkbox is device IP address
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
}
    

    

