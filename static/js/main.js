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
        <button onclick="showInviteForm(${restaurant.id})" class="invite-friend-btn bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600" data-restaurant-id="${restaurant.id}">
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

    initFriendAutocomplete();
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

function updateDebugLog(message) {
    var debugLog = $("#debug-log");
    if (debugLog.length > 0) {
        debugLog.append("<p>" + message + "</p>");
        debugLog.scrollTop(debugLog[0].scrollHeight);
    } else {
        console.log("Debug log:", message);
    }
}

function initFriendAutocomplete() {
    console.log("Initializing friend autocomplete");
    $("#recipientUsername").autocomplete({
        source: function(request, response) {
            console.log("Autocomplete request:", request);
            $.ajax({
                url: "/friend_autocomplete",
                dataType: "json",
                data: {
                    query: request.term
                },
                success: function(data) {
                    console.log("Received autocomplete data:", data);
                    var mappedData = data.map(function(item) {
                        return {
                            label: item.username,
                            value: item.username,
                            id: item.id
                        };
                    });
                    console.log("Mapped autocomplete data:", mappedData);
                    response(mappedData);
                },
                error: function(xhr, status, error) {
                    console.error("Autocomplete error:", error);
                    console.error("Status:", status);
                    console.error("Response:", xhr.responseText);
                    response([]);
                }
            });
        },
        minLength: 2,
        select: function(event, ui) {
            console.log("Selected friend:", ui.item);
            $("#recipientUsername").val(ui.item.value);
            return false;  // Prevent default behavior
        }
    }).autocomplete("instance")._renderItem = function(ul, item) {
        console.log("Rendering item:", item);
        return $("<li>")
            .append("<div>" + item.label + "</div>")
            .appendTo(ul);
    };
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

    fetch('/check_friend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'friend_username': recipientUsername
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.is_friend) {
            submitInvitation(restaurantId, recipientUsername, message, dateTime);
        } else {
            displayInviteError('You can only invite friends. Please add this user as a friend first.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayInviteError('An error occurred while validating the friend. Please try again.');
    });
}

function submitInvitation(restaurantId, recipientUsername, message, dateTime) {
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

function respondInvitation(invitationId, response) {
    fetch(`/respond_invitation/${invitationId}/${response}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrf_token')
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showAcceptancePopup('Invitation Response', data.message);
            updateInvitationUI(invitationId, response);
        } else {
            showAcceptancePopup('Error', 'Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAcceptancePopup('Error', 'An error occurred while processing your response. Please try again.');
    });
}

function updateInvitationUI(invitationId, response) {
    const invitationElement = document.querySelector(`[data-invitation-id="${invitationId}"]`).closest('li');
    if (invitationElement) {
        if (response === 'accept') {
            invitationElement.classList.add('bg-green-100');
            invitationElement.innerHTML = `<p>Invitation accepted</p>`;
        } else if (response === 'decline') {
            invitationElement.classList.add('bg-red-100');
            invitationElement.innerHTML = `<p>Invitation declined</p>`;
        }
    }
}

function showAcceptancePopup(title, message) {
    const popup = document.getElementById('acceptancePopup');
    const popupTitle = document.getElementById('acceptanceTitle');
    const popupMessage = document.getElementById('acceptanceMessage');
    
    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popup.style.display = 'flex';
    
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    setTimeout(() => {
        closeAcceptancePopup();
    }, 3000);
}

function closeAcceptancePopup() {
    const popup = document.getElementById('acceptancePopup');
    popup.classList.remove('show');
    
    setTimeout(() => {
        popup.style.display = 'none';
    }, 300);
}

function showRescheduleForm(invitationId) {
    const modal = document.getElementById('rescheduleModal');
    const invitationIdInput = document.getElementById('rescheduleInvitationId');
    invitationIdInput.value = invitationId;
    modal.style.display = 'flex';
    
    const closeBtn = document.getElementById('closeRescheduleModalBtn');
    closeBtn.onclick = closeRescheduleForm;
    
    window.onclick = function(event) {
        if (event.target === modal) {
            closeRescheduleForm();
        }
    };
}

function closeRescheduleForm() {
    const modal = document.getElementById('rescheduleModal');
    modal.style.display = 'none';
    clearRescheduleForm();
    clearRescheduleError();
}

function clearRescheduleForm() {
    document.getElementById('rescheduleInvitationId').value = '';
    document.getElementById('rescheduleDateTime').value = '';
}

function displayRescheduleError(message) {
    const errorElement = document.getElementById('rescheduleErrorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearRescheduleError() {
    const errorElement = document.getElementById('rescheduleErrorMessage');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}

function rescheduleInvitation() {
    const invitationId = document.getElementById('rescheduleInvitationId').value;
    const newDateTime = document.getElementById('rescheduleDateTime').value;

    if (!invitationId || !newDateTime) {
        displayRescheduleError('Please fill in all required fields.');
        return;
    }

    const formData = new FormData();
    formData.append('invitation_id', invitationId);
    formData.append('new_date_time', newDateTime);

    fetch('/reschedule_invitation', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            closeRescheduleForm();
            showAcceptancePopup('Success', 'Invitation rescheduled successfully');
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            displayRescheduleError(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayRescheduleError('An error occurred while rescheduling the invitation. Please try again.');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    
    const inviteModal = document.getElementById('inviteModal');
    const acceptancePopup = document.getElementById('acceptancePopup');
    
    if (inviteModal) {
        inviteModal.style.display = 'none';
    }
    
    if (acceptancePopup) {
        acceptancePopup.style.display = 'none';
    }

    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('invite-friend-btn')) {
            event.preventDefault();
            const restaurantId = event.target.getAttribute('data-restaurant-id');
            showInviteForm(restaurantId);
        } else if (event.target.classList.contains('accept-invitation-btn') || event.target.classList.contains('decline-invitation-btn')) {
            event.preventDefault();
            const invitationId = event.target.getAttribute('data-invitation-id');
            const response = event.target.classList.contains('accept-invitation-btn') ? 'accept' : 'decline';
            respondInvitation(invitationId, response);
        }
    });

    const closeAcceptanceBtn = document.querySelector('#acceptancePopup .close');
    if (closeAcceptanceBtn) {
        closeAcceptanceBtn.addEventListener('click', closeAcceptancePopup);
    }

    const sendInvitationBtn = document.querySelector('#inviteForm button');
    if (sendInvitationBtn) {
        sendInvitationBtn.addEventListener('click', sendInvitation);
    }

    initFriendAutocomplete();
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}