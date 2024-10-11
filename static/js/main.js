let map;
let markers = [];
let markerCluster;

window.initMap = function() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 37.5665, lng: 126.9780 },
        zoom: 10,
        styles: [
            {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }],
            },
            {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
            },
        ],
    });

    // Rest of the initMap function remains unchanged
}

function addMarker(restaurant) {
    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: restaurant.latitude, lng: restaurant.longitude },
        map: map,
        title: restaurant.name
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div class="info-window">
                <h3 class="font-bold">${restaurant.name}</h3>
                ${restaurant.photo_url ? `<img src="${restaurant.photo_url}" alt="${restaurant.name}" class="w-full h-40 object-cover mb-2">` : ''}
                <p>${restaurant.address}</p>
                <p>Rating: ${restaurant.rating || 'N/A'}</p>
                <button onclick="toggleFavorite(${restaurant.id})" class="favorite-btn">
                    Add to Favorites
                </button>
                <button onclick="showInviteForm(${restaurant.id})" class="invite-btn">
                    Invite Friend
                </button>
            </div>
        `
    });

    marker.addListener("click", () => {
        infoWindow.open(map, marker);
    });

    markers.push(marker);
}

function recenterMap() {
    if (map && markers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(marker => bounds.extend(marker.position));
        map.fitBounds(bounds);
    }
}

// Rest of the file remains unchanged
