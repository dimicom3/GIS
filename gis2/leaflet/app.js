var map = L.map("map").setView([45, 20], 6);
var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// var popup = L.popup();

// function onMapClick(e) {
//   console.log(e)
//   popup
//       .setLatLng(e.latlng)
//       .setContent("You clicked the map at " + e.latlng.toString())
//       .openOn(map);
// }

// map.on('click', onMapClick);

const mywms = L.tileLayer.wms("http://localhost:8080/geoserver/wms", {
  layers: 'test1_workspace:historical',
  format: 'image/png',
  transparent: true,
  version: '1.1.0',
  attribution: "country layer"
});
mywms.addTo(map);


$.ajax('http://localhost:8080/geoserver/wfs',{
  type: 'GET',
  data: {
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typename: 'test1_workspace:bench_layer',
    srsname: 'EPSG:4326',
    outputFormat: 'text/javascript',
    },
  dataType: 'jsonp',
  jsonpCallback:'callback:handleJson',
  jsonp:'format_options'
});
  //Geojson style file
  var myStyle = {
    'color': 'red'
  }
// the ajax callback function
function handleJson(data) {
    selectedArea = L.geoJson(data, {
      onEachFeature: function(feature, layer) {
        layer.bindPopup(`Type: ${feature.properties.amenity}`)
      }
    }).addTo(map);
  map.fitBounds(selectedArea.getBounds());
}

var legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML = '<img src="http://localhost:8080/geoserver/wms/wms?REQUEST=GetLegendGraphic&VERSION=1.1.0&FORMAT=image/png&LAYER=test1_workspace:test322&style=style" alt="legend" data-toggle="tooltip" title="Map legend">'
    console.log(div.innerHTML)
    return div;             
};

legend.addTo(map);
