// initialize map
let map = L.map('map');

// Add OpenStreetMap map service
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '<a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 18,
}).addTo(map);

// Initialize empty array for marker coordinates
let markerCoords = [];

// Select all DIV elements with class "station".
let divElements = document.getElementsByClassName('station');

// Loop through each DIV element
for (let i = 0; i < divElements.length; i++) {
    // Select current div element
    let divElement = divElements[i];

    // Pick the latitude coordinate and assign it to the variable
    let latitudeElement = divElement.querySelector('.latitude');
    let latitude = parseFloat(latitudeElement.textContent);

    // Pick the longitude coordinate and assign it to the variable
    let longitudeElement = divElement.querySelector('.longitude');
    let longitude = parseFloat(longitudeElement.textContent);

    // Set coordinates for the marker
    let myLatLng = L.latLng(latitude, longitude);

    // Add marker
    let marker = L.marker(myLatLng).addTo(map);

    // Select the name and ID
    let nameElement = divElement.querySelector('.name');
    let idElement = divElement.querySelector('.id');

    // Add name with link to marker
    let markerLink = `<a href="/stations/${idElement.id}">${nameElement.textContent}</a>`
    marker.bindPopup(markerLink).openPopup();

    // Add the marker coordinates to the array
    markerCoords.push(myLatLng);
}

// Calculate borders of markers
let markerBounds = L.latLngBounds(markerCoords);

// Center the map and zoom to make the markers visible
map.fitBounds(markerBounds);
