let map;
let markers = [];
let markerCluster;

function initMap() {
    // ... (keep existing initMap function)
}

function searchRestaurants() {
    // ... (keep existing searchRestaurants function)
}

function displayRestaurants(restaurants) {
    // ... (keep existing displayRestaurants function)
}

function createRestaurantCard(restaurant) {
    // ... (keep existing createRestaurantCard function)
}

function addMarker(restaurant) {
    // ... (keep existing addMarker function)
}

function clearMarkers() {
    // ... (keep existing clearMarkers function)
}

function showOnMap(lat, lng) {
    // ... (keep existing showOnMap function)
}

function toggleFavorite(restaurantId) {
    // ... (keep existing toggleFavorite function)
}

function showInviteForm(restaurantId) {
    // ... (keep existing showInviteForm function)
}

function closeInviteForm() {
    // ... (keep existing closeInviteForm function)
}

function clearInviteForm() {
    // ... (keep existing clearInviteForm function)
}

function displayInviteError(message) {
    // ... (keep existing displayInviteError function)
}

function clearInviteError() {
    // ... (keep existing clearInviteError function)
}

function updateDebugLog(message) {
    // ... (keep existing updateDebugLog function)
}

function initFriendAutocomplete() {
    console.log("Initializing friend autocomplete");
    if (typeof $ === 'undefined') {
        console.error("jQuery is not defined. Make sure it's loaded before this script.");
        return;
    }
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
            return false;
        }
    });
}

function sendInvitation() {
    // ... (keep existing sendInvitation function)
}

function submitInvitation(restaurantId, recipientUsername, message, dateTime) {
    // ... (keep existing submitInvitation function)
}

function recenterMap() {
    // ... (keep existing recenterMap function)
}

function respondInvitation(invitationId, response) {
    // ... (keep existing respondInvitation function)
}

function updateInvitationUI(invitationId, response) {
    // ... (keep existing updateInvitationUI function)
}

function showAcceptancePopup(title, message) {
    // ... (keep existing showAcceptancePopup function)
}

function closeAcceptancePopup() {
    // ... (keep existing closeAcceptancePopup function)
}

function showRescheduleForm(invitationId) {
    // ... (keep existing showRescheduleForm function)
}

function closeRescheduleForm() {
    // ... (keep existing closeRescheduleForm function)
}

function clearRescheduleForm() {
    // ... (keep existing clearRescheduleForm function)
}

function displayRescheduleError(message) {
    // ... (keep existing displayRescheduleError function)
}

function clearRescheduleError() {
    // ... (keep existing clearRescheduleError function)
}

function rescheduleInvitation() {
    // ... (keep existing rescheduleInvitation function)
}

function initializeApp() {
    if (typeof $ === 'undefined') {
        console.error("jQuery is not defined. Make sure it's loaded before this script.");
        setTimeout(initializeApp, 100);
        return;
    }

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

    // Initialize perfect-scrollbar for invitation list containers
    if (typeof PerfectScrollbar !== 'undefined') {
        const containers = document.querySelectorAll('.invitation-list-container');
        containers.forEach(container => {
            new PerfectScrollbar(container, {
                wheelSpeed: 2,
                wheelPropagation: true,
                minScrollbarLength: 20
            });
        });
    } else {
        console.error("PerfectScrollbar is not defined. Make sure it's loaded before this script.");
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

function getCookie(name) {
    // ... (keep existing getCookie function)
}