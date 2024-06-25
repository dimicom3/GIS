

const openStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

const map = L.map('map').setView([43.3246, 21.9030], 13);


openStreetMapLayer.addTo(map);

const baseMaps = {
    "OpenStreetMap": openStreetMapLayer
};

// const wfsLayerGroup = L.layerGroup();

const overlayMaps = {
    // "WFS Layer": wfsLayerGroup
};

const layersControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

function addWFSLayerToMap(wfsLayer, layerName) {
    overlayMaps[layerName] = wfsLayer
    layersControl.addOverlay(wfsLayer, layerName);
}

function fetchWFSData(layerName, filter = '', customStyle='', onEachFeature = null, addToMap = false) {
    const url = new URL('http://localhost:8080/geoserver/ows');
    const params = {
        service: 'WFS',
        version: '1.1.0',
        request: 'GetFeature',
        typename: layerName,
        srsname: 'EPSG:4326',
        outputFormat: 'application/json',
    };
    if (filter) {
        params.cql_filter = filter;
    }
    url.search = new URLSearchParams(params).toString();
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const wfsLayer = L.geoJSON(data, {
                style: customStyle,
                onEachFeature: onEachFeature
            })//.addTo(map);
            if (addToMap) wfsLayer.addTo(map);
            const existingLayer = overlayMaps[layerName];
            if (existingLayer) {
                map.removeLayer(overlayMaps[layerName]);
                layersControl.removeLayer(existingLayer);
            }
            addWFSLayerToMap(wfsLayer, layerName);

        })
        .catch(error => console.error('Error fetching WFS data:', error));
}


function loadLayerAttributes() {
    let layerName = document.getElementById('layer').value;
    const url = new URL('http://localhost:8080/geoserver/ows');
    const params = {
        service: 'WFS',
        version: '1.1.0',
        request: 'DescribeFeatureType',
        typename: layerName,
        outputFormat: 'application/json'
    };
    url.search = new URLSearchParams(params).toString();

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            let attributeSelect = document.getElementById('attribute');
            attributeSelect.innerHTML = '';
            let properties = data.featureTypes[0].properties;
            properties.forEach(property => {
                if (property.type.includes("gml:")) return; 
                let option = document.createElement('option');
                option.value = property.name;
                option.text = property.name;
                attributeSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading layer attributes:', error));
}

function applyFilter() {
    const layerName = document.getElementById('layer').value;
    const attribute = document.getElementById('attribute').value;
    const condition = document.getElementById('condition').value;
    const value = document.getElementById('value').value;
    let filter = "";
    if (condition != "all") filter = `${attribute} ${condition} '${value}'`;

    fetchWFSData(layerName, filter);
}

function loadLayers() {
    const url = new URL('http://localhost:8080/geoserver/ows');
    const params = {
        service: 'WFS',
        version: '1.1.0',
        request: 'GetCapabilities',
    };
    url.search = new URLSearchParams(params).toString();

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.text();
        })
        .then(data => {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(data, "text/xml");
            var layers = xmlDoc.getElementsByTagName("FeatureType");

            var layerSelect = document.getElementById('layer');
            layerSelect.innerHTML = '';
            for (var i = 0; i < layers.length; i++) {
                var name = layers[i].getElementsByTagName("Name")[0].childNodes[0].nodeValue;
                var option = document.createElement('option');
                option.value = name;
                option.text = name;
                layerSelect.appendChild(option);
            }
            loadLayerAttributes();
            // fetchWFSData(layerSelect.value);
        })
        .catch(error => console.error('Error loading layers:', error));
}

document.addEventListener('DOMContentLoaded', loadLayers);
// ADD ROADS


const road_custom_style = (feature) => {
        count = feature.properties.vehicle_count
        if (count < 50) return {color: 'grey'};
        else if (count < 1000) return {color: '#7CFC00'};
        else if (count < 5000) return {color: 'orange'};
        else if (count < 10000) return {color: 'red'};
        else return {color: ' #900C3F'};
}
const road_custom_handler = (feature, layer) => {
    layer.bindPopup(`Type: ${feature.properties.name} Count: ${feature.properties.vehicle_count}`);
}

fetchWFSData('test1_workspace:road_vehicle_stats',filter='', customStyle = road_custom_style, onEachFeature = road_custom_handler, addToMap = false);

const onObjectClick = (feature, layer) => {

    layer.on("click", (e) => {
        let polygonWKT = 'POLYGON(('; 
        feature.geometry.coordinates[0].forEach((coord, index) => {
            polygonWKT += `${coord[1]} ${coord[0]}`;
        
            if (index < feature.geometry.coordinates[0].length - 1) {
                polygonWKT += ', ';
            }
        });
        polygonWKT += '))';

        const distance = 0.008;
        
        const cqlFilter = `DWithin(geom, ${polygonWKT}, ${distance}, kilometers)`;

        const building = document.getElementById("selected-building")
        building.innerText = "Building id: " + feature.properties.osm_id
        // getVehicleData
        const url = new URL('http://localhost:8080/geoserver/ows');
        const params = {
            service: 'WFS',
            version: '1.1.0',
            request: 'GetFeature',
            typename: 'vehicle_data_emission',
            srsname: 'EPSG:4326',
            outputFormat: 'application/json',
        };
        params.cql_filter = cqlFilter;
        url.search = new URLSearchParams(params).toString();
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                populateTable(data.features);

            })
            .catch(error => console.error('Error fetching WFS data:', error));
            
    });
};
fetchWFSData('test1_workspace:objects_in_nis',filter='', null, onObjectClick)



function toggleTable() {
    const tableDiv = document.getElementById("vehicle-table");
    tableDiv.style.display = tableDiv.style.display === "none" ? "block" : "none";
}
function toggleNewLayerForm() {
    const form_div = document.getElementById("controls")
    form_div.style.display = form_div.style.display === "none" ? "block" : "none";
}
function updateTotalCO2(data) {
    var totalCO2 = data.reduce((sum, vehicle) => sum + vehicle.properties.co2, 0);
    document.getElementById('total-co2').innerText = `Total CO2 Emissions: ${totalCO2.toFixed(2)}`;
}

let vehicle_data = []

function populateTable(data) {
    let tbody = document.getElementById("data-table").getElementsByTagName("tbody")[0];
    tbody.innerHTML = "";
    data.forEach(function(vehicle) {
        let row = tbody.insertRow();
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);
        let cell3 = row.insertCell(2);
        let cell4 = row.insertCell(3);
        let cell5 = row.insertCell(4);
        // let cell6 = row.insertCell(5);

        cell1.innerHTML = vehicle.properties.vehicle_id;
        cell2.innerHTML = vehicle.properties.time;
        cell3.innerHTML = vehicle.properties.co2;
        // cell4.innerHTML = vehicle.properties.lon;
        // cell5.innerHTML = vehicle.properties.lat;

        // Hide longitude and latitude cells
        // cell4.classList.add("d-none");
        // cell5.classList.add("d-none");

        // // Add button to fetch vehicle path
        // let button = document.createElement("button");
        // button.className = "btn btn-secondary";
        // button.innerHTML = "Get vehicle path";
        
        // // Store the lon and lat values in data attributes
        // button.setAttribute('data-vehicle-id', vehicle.properties.vehicle_id);
        // button.setAttribute('data-time', vehicle.properties.time);
        // button.setAttribute('data-lon', vehicle.properties.lon);
        // button.setAttribute('data-lat', vehicle.properties.lat);

        // button.onclick = function() {
        //     fetch_vehicle_path(button);
        // };
        // cell6.appendChild(button);
        
    });
    updateTotalCO2(data);
    if (vehicle_data.length == 0)
        vehicle_data = data
}

function applySpeedFilter(speed) {
    const filter = `avg_speed > ${speed}`;
    fetchWFSData('test1_workspace:road_vehicle_stats', filter, 
        function(feature) {
            let count = feature.properties.vehicle_count;
            if (count < 1000) return {color: 'blue'};
            else if (count < 10000) return {color: 'purple'};
            else return {color: 'red'};
        }, 
        function(feature, layer) {
            layer.bindPopup(`Type: ${feature.properties.name} Count: ${feature.properties.vehicle_count}`);
        }
    );
}

const sliderControl = L.Control.extend({
    onAdd: function(map) {
        const sliderContainer = L.DomUtil.create('div', 'slider-container');
        noUiSlider.create(sliderContainer, {
            start: [0],
            connect: [true, false],
            range: {
                'min': 0,
                'max': 120 
            },
            tooltips: true,
            format: {
                to: function (value) {
                    return Math.round(value);
                },
                from: function (value) {
                    return Math.round(value);
                }
            }
        });

        sliderContainer.noUiSlider.on('update', function (values, handle) {
            const speed = values[handle];
            filter_roads(speed);
        });

        L.DomEvent.disableClickPropagation(sliderContainer);
        return sliderContainer;
    }
});


map.addControl(new sliderControl({ position: 'topright' }));
// Function to filter WFS data based on average speed
function filter_roads(averageSpeed) {
    fetchWFSData('test1_workspace:road_vehicle_stats',filter='avg_speed > ' + averageSpeed, customStyle = road_custom_style, onEachFeature = road_custom_handler, addToMap = true);
}

let slider = document.getElementById('slider');

noUiSlider.create(slider, {
    start: [0, 10000],
    connect: true,
    range: {
        'min': 0,
        'max': 10000
    },
    step: 1,
    tooltips: true,
    format: {
        to: function (value) {
            return Math.round(value);
        },
        from: function (value) {
            return Math.round(value);
        }
    }
});
let slider_data_global = []
slider.noUiSlider.on('update', function (values, handle) {
    const minTime = values[0];
    const maxTime = values[1];

    slider_data_global[0] = minTime;
    slider_data_global[1] = maxTime;

    let filteredData = vehicle_data.filter(function(vehicle) {
        return vehicle.properties.time >= minTime && vehicle.properties.time <= maxTime;
    });

    populateTable(filteredData);
});
