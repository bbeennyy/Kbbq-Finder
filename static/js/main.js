let map;
let markers = [];
let markerCluster;

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

    window.addEventListener('resize', function() {
        google.maps.event.trigger(map, 'resize');
        if (markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            map.fitBounds(bounds);
        }
    });

    setTimeout(function() {
        google.maps.event.trigger(map, 'resize');
    }, 100);
}

function searchRestaurants() {
    const location = document.getElementById("location").value;
    const filters = Array.from(document.querySelectorAll('input[name="filters"]:checked')).map(el => el.value);
    
    const formData = new FormData();
    formData.append('location', location);
    filters.forEach(filter => formData.append('filters', filter));

    fetch('/search', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        displayRestaurants(data);
    })
    .catch(error => {
        console.error('Error:', error);
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
        recenterMap();
    }

    if (markerCluster) {
        markerCluster.clearMarkers();
    }
    markerCluster = new markerClusterer.MarkerClusterer({ map, markers });
}

function createRestaurantCard(restaurant) {
    const card = document.createElement("div");
    card.className = "restaurant-card";
    card.innerHTML = `
        <h2 class="text-xl font-bold mb-2">${restaurant.name}</h2>
        ${restaurant.photo_url ? `<img src="${restaurant.photo_url}" alt="${restaurant.name}" class="w-full h-40 object-cover mb-2">` : ''}
        <p class="text-gray-600 mb-2">${restaurant.address}</p>
        <p class="text-yellow-500 mb-2">Rating: ${restaurant.rating || 'N/A'}</p>
        <button onclick="showOnMap(${restaurant.latitude}, ${restaurant.longitude})" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">Show on Map</button>
        <button onclick="toggleFavorite(${restaurant.id})" id="favorite-btn-${restaurant.id}" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2">
            Add to Favorites
        </button>
        <button onclick="showInviteForm(${restaurant.id})" class="invite-friend-btn bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
            Invite Friend
        </button>
    `;
    return card;
}

function addMarker(restaurant) {
    const marker = new google.maps.Marker({
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
                showAcceptancePopup('Success', data.message);
            } else {
                showAcceptancePopup('Error', data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

function showInviteForm(restaurantId) {
    const modal = document.getElementById('inviteModal');
    const restaurantIdInput = document.getElementById('restaurantId');
    restaurantIdInput.value = restaurantId;
    modal.style.display = 'flex';
    
    const closeBtn = document.getElementById('closeModalBtn');
    closeBtn.onclick = closeInviteForm;
    
    window.onclick = function(event) {
        if (event.target === modal) {
            closeInviteForm();
        }
    };
}

function closeInviteForm() {
    const modal = document.getElementById('inviteModal');
    modal.style.display = 'none';
    clearInviteForm();
    clearInviteError();
}

function clearInviteForm() {
    document.getElementById('restaurantId').value = '';
    document.getElementById('recipientUsername').value = '';
    document.getElementById('invitationMessage').value = '';
    document.getElementById('invitationDateTime').value = '';
}

function displayInviteError(message) {
    const errorElement = document.getElementById('inviteErrorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearInviteError() {
    const errorElement = document.getElementById('inviteErrorMessage');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}

function sendInvitation() {
    const restaurantId = document.getElementById('restaurantId').value;
    const recipientUsername = document.getElementById('recipientUsername').value;
    const message = document.getElementById('invitationMessage').value;
    const dateTime = document.getElementById('invitationDateTime').value;

    if (!restaurantId || !recipientUsername || !dateTime) {
        displayInviteError('Please fill in all required fields.');
        return;
    }

    const formData = new FormData();
    formData.append('restaurant_id', restaurantId);
    formData.append('recipient_username', recipientUsername);
    formData.append('message', message);
    formData.append('date_time', dateTime);

    fetch('/send_invitation', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            closeInviteForm();
            showAcceptancePopup('Success', 'Invitation sent successfully');
        } else {
            displayInviteError(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayInviteError('An error occurred while sending the invitation. Please try again.');
    });
}

function recenterMap() {
    if (markers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(marker => bounds.extend(marker.getPosition()));
        map.fitBounds(bounds);
    }
}

function showAcceptancePopup(title, message) {
    const popup = document.getElementById('acceptancePopup');
    const popupTitle = popup.querySelector('h3');
    const popupMessage = document.getElementById('acceptanceMessage');
    
    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popup.style.display = 'flex';
}

function closeAcceptancePopup() {
    const popup = document.getElementById('acceptancePopup');
    popup.style.display = 'none';
}

function respondInvitation(invitationId, response) {
    fetch(`/respond_invitation/${invitationId}/${response}`, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showAcceptancePopup('Invitation Response', data.message);
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            showAcceptancePopup('Error', 'Error: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    
    document.getElementById('inviteModal').style.display = 'none';
    document.getElementById('acceptancePopup').style.display = 'none';
});