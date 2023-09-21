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
        
            ['ip', 'mac', 'hostname', 'software_version', 'state_message', 'status', 'extruder_temperature', 'extruder1_temperature', 'heater_bed_temperature'].forEach(key => {
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
            row.cells[5].textContent = device.state_message;
            row.cells[7].textContent = device.extruder_temperature;
            row.cells[8].textContent = device.extruder1_temperature;
            row.cells[9].textContent = device.heater_bed_temperature;

            const statusCell = row.cells[6]; 
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
            console.error("Row not found for device", device.ip);
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
}
