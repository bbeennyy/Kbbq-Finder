document.addEventListener('DOMContentLoaded', function() {
    let map;
    let markers = [];
    let markerCluster;

    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 37.7749, lng: -122.4194},
            zoom: 12
        });
    }

    function searchRestaurants() {
        const location = document.getElementById('location').value;
        const filters = Array.from(document.querySelectorAll('input[name="filters"]:checked')).map(el => el.value);

        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'location': location,
                'filters': filters
            })
        })
        .then(response => response.json())
        .then(restaurants => {
            displayResults(restaurants);
            addMarkersToMap(restaurants);
        })
        .catch(error => console.error('Error:', error));
    }

    function displayResults(restaurants) {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';
        restaurants.forEach(restaurant => {
            const card = createRestaurantCard(restaurant);
            resultsContainer.appendChild(card);
        });
    }

    function createRestaurantCard(restaurant) {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        card.innerHTML = `
            <h3>${restaurant.name}</h3>
            <p>${restaurant.address}</p>
            <p>Rating: ${restaurant.rating || 'N/A'}</p>
            <button onclick="showOnMap(${restaurant.latitude}, ${restaurant.longitude})" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">Show on Map</button>
            <button onclick="toggleFavorite(${restaurant.id})" id="favorite-btn-${restaurant.id}" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2">
                Add to Favorites
            </button>
            <button onclick="showInviteForm(${restaurant.id})" class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                Invite Friend
            </button>
        `;
        return card;
    }

    function addMarkersToMap(restaurants) {
        clearMarkers();
        restaurants.forEach(restaurant => {
            const marker = new google.maps.Marker({
                position: {lat: restaurant.latitude, lng: restaurant.longitude},
                map: map,
                title: restaurant.name
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                <div>
                    <h3>${restaurant.name}</h3>
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

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            markers.push(marker);
        });

        markerCluster = new MarkerClusterer(map, markers, {
            imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
        });

        if (markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            map.fitBounds(bounds);
        }
    }

    function clearMarkers() {
        markers.forEach(marker => marker.setMap(null));
        markers = [];
        if (markerCluster) {
            markerCluster.clearMarkers();
        }
    }

    function showOnMap(lat, lng) {
        map.setCenter({lat: lat, lng: lng});
        map.setZoom(15);
    }

    function toggleFavorite(restaurantId) {
        fetch(`/favorite/${restaurantId}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                const favoriteBtn = document.getElementById(`favorite-btn-${restaurantId}`);
                if (data.status === 'success') {
                    favoriteBtn.textContent = 'Remove from Favorites';
                    favoriteBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                    favoriteBtn.classList.add('bg-red-500', 'hover:bg-red-600');
                } else {
                    favoriteBtn.textContent = 'Add to Favorites';
                    favoriteBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                    favoriteBtn.classList.add('bg-green-500', 'hover:bg-green-600');
                }
            })
            .catch(error => console.error('Error:', error));
    }

    function showInviteForm(restaurantId) {
        const recipientUsername = prompt("Enter the username of the friend you want to invite:");
        if (recipientUsername) {
            const message = prompt("Enter a message for your invitation (optional):");
            sendInvitation(restaurantId, recipientUsername, message);
        }
    }

    function sendInvitation(restaurantId, recipientUsername, message) {
        const formData = new FormData();
        formData.append('restaurant_id', restaurantId);
        formData.append('recipient_username', recipientUsername);
        formData.append('message', message || '');

        fetch('/send_invitation', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Invitation sent successfully!');
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // Expose functions to the global scope
    window.searchRestaurants = searchRestaurants;
    window.showOnMap = showOnMap;
    window.toggleFavorite = toggleFavorite;
    window.showInviteForm = showInviteForm;

    // Initialize the map when the page loads
    initMap();
});
