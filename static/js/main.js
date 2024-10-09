let map;
let markers = [];
let markerCluster;
let autocomplete;

function initMap() {
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

    initCustomAutocomplete();
    initDarkMode();
}

function initCustomAutocomplete() {
    const input = document.getElementById("autocomplete");
    const options = {
        types: ['geocode'],
        fields: ['place_id', 'geometry', 'formatted_address']
    };
    autocomplete = new google.maps.places.Autocomplete(input, options);

    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            console.log("No details available for input: '" + place.name + "'");
            return;
        }
        
        input.value = place.formatted_address;
        map.setCenter(place.geometry.location);
        map.setZoom(15);
    });
}

function searchRestaurants() {
    const input = document.getElementById("autocomplete");
    const place = autocomplete.getPlace();
    let location = input.value;

    if (place && place.geometry) {
        location = place.formatted_address;
    }

    const filters = Array.from(document.querySelectorAll('input[name="filters"]:checked')).map(el => el.value);
    
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("results").innerHTML = "";

    const formData = new FormData();
    formData.append('location', location);
    filters.forEach(filter => formData.append('filters', filter));

    fetch('/search', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("loading").classList.add("hidden");
        displayRestaurants(data);
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById("loading").classList.add("hidden");
        alert("An error occurred while searching for restaurants. Please try again.");
    });
}

function displayRestaurants(restaurants) {
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = "";

    clearMarkers();

    restaurants.forEach(restaurant => {
        const card = createRestaurantCard(restaurant);
        resultsContainer.appendChild(card);

        addMarker(restaurant);
    });

    if (restaurants.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(marker => bounds.extend(marker.getPosition()));
        map.fitBounds(bounds);
    }

    if (markerCluster) {
        markerCluster.clearMarkers();
    }
    markerCluster = new MarkerClusterer(map, markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
    });

    const shareButton = document.createElement("button");
    shareButton.textContent = "Share Results";
    shareButton.className = "bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 mt-4";
    shareButton.onclick = () => shareResults(restaurants);
    resultsContainer.appendChild(shareButton);
}

function createRestaurantCard(restaurant) {
    const card = document.createElement("div");
    card.className = "restaurant-card";
    card.innerHTML = `
        <h2 class="text-xl font-bold mb-2">${restaurant.name}</h2>
        <p class="text-gray-600 mb-2">${restaurant.address}</p>
        <p class="text-yellow-500 mb-2">Rating: ${restaurant.rating || 'N/A'}</p>
        <button onclick="showOnMap(${restaurant.latitude}, ${restaurant.longitude})" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">Show on Map</button>
        <button onclick="toggleFavorite(${restaurant.id})" id="favorite-btn-${restaurant.id}" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2">
            Add to Favorites
        </button>
        <button onclick="shareRestaurant(${restaurant.id})" class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
            Share
        </button>
    `;
    return card;
}

function addMarker(restaurant) {
    const marker = new google.maps.Marker({
        position: { lat: restaurant.latitude, lng: restaurant.longitude },
        map: map,
        title: restaurant.name,
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32),
        }
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div class="info-window">
                <h3 class="font-bold">${restaurant.name}</h3>
                <p>${restaurant.address}</p>
                <p>Rating: ${restaurant.rating || 'N/A'}</p>
                <button onclick="toggleFavorite(${restaurant.id})" class="favorite-btn">
                    Add to Favorites
                </button>
                <button onclick="shareRestaurant(${restaurant.id})" class="share-btn">
                    Share
                </button>
            </div>
        `
    });

    marker.addListener("click", () => {
        infoWindow.open(map, marker);
    });

    markers.push(marker);
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function showOnMap(lat, lng) {
    map.setCenter({ lat, lng });
    map.setZoom(15);
}

function toggleFavorite(restaurantId) {
    const favoriteBtn = document.getElementById(`favorite-btn-${restaurantId}`);
    const isFavorite = favoriteBtn.textContent.trim() === 'Remove from Favorites';
    const url = isFavorite ? `/unfavorite/${restaurantId}` : `/favorite/${restaurantId}`;

    fetch(url, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                favoriteBtn.textContent = isFavorite ? 'Add to Favorites' : 'Remove from Favorites';
                favoriteBtn.classList.toggle('bg-green-500');
                favoriteBtn.classList.toggle('bg-red-500');
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

function shareRestaurant(restaurantId) {
    const restaurant = document.querySelector(`#favorite-btn-${restaurantId}`).closest('.restaurant-card');
    const restaurantInfo = restaurant.innerText.split('\n').slice(0, 3).join('\n');
    shareContent(restaurantInfo);
}

function shareResults(restaurants) {
    const content = restaurants.map(r => `${r.name}\n${r.address}\nRating: ${r.rating || 'N/A'}`).join('\n\n');
    shareContent(content);
}

function shareContent(content) {
    const email = prompt("Enter the email address to share with:");
    if (email) {
        fetch('/share', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, content }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Shared successfully!');
            } else {
                alert('Failed to share: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while sharing.');
        });
    }
}

function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    const isDarkMode = localStorage.getItem('darkMode') === 'enabled';

    if (isDarkMode) {
        body.classList.add('dark-mode');
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof google === 'undefined') {
        console.error('Google Maps API failed to load');
        alert('An error occurred while loading the map. Please refresh the page and try again.');
    } else {
        initMap();
    }
});