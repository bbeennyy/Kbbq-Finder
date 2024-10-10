$(document).ready(function() {
    $("#searchUsername").autocomplete({
        source: function(request, response) {
            $.ajax({
                url: "/friend_suggestions",
                dataType: "json",
                data: {
                    query: request.term
                },
                success: function(data) {
                    response(data.map(function(item) {
                        return {
                            label: item.username,
                            value: item.username,
                            id: item.id
                        };
                    }));
                }
            });
        },
        minLength: 2,
        select: function(event, ui) {
            console.log("Selected: " + ui.item.value);
        }
    });

    $("#searchFriendForm").submit(function(event) {
        event.preventDefault();
        const username = $("#searchUsername").val();
        searchUsers(username);
    });
});

function searchUsers(query) {
    $.ajax({
        url: "/friend_suggestions",
        data: { query: query },
        success: function(data) {
            displaySearchResults(data);
        },
        error: function() {
            $("#searchResults").html("<p>An error occurred while searching for users.</p>");
        }
    });
}

function displaySearchResults(results) {
    const resultsContainer = $("#searchResults");
    resultsContainer.empty();

    if (results.length === 0) {
        resultsContainer.html("<p>No users found.</p>");
        return;
    }

    const ul = $("<ul>").addClass("list-disc list-inside");
    results.forEach(function(user) {
        const li = $("<li>").addClass("mb-2");
        li.text(user.username);
        const addButton = $("<button>")
            .text("Add Friend")
            .addClass("bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline ml-2")
            .click(function() {
                addFriend(user.username);
            });
        li.append(addButton);
        ul.append(li);
    });
    resultsContainer.append(ul);
}

function addFriend(username) {
    $.ajax({
        url: '/add_friend',
        method: 'POST',
        data: { friend_username: username },
        success: function(data) {
            if (data.status === 'success') {
                alert(data.message);
                location.reload();
            } else {
                alert(data.message);
            }
        },
        error: function() {
            alert('An error occurred while adding the friend.');
        }
    });
}

function removeFriend(username) {
    if (confirm(`Are you sure you want to remove ${username} from your friends?`)) {
        $.ajax({
            url: '/remove_friend',
            method: 'POST',
            data: { friend_username: username },
            success: function(data) {
                if (data.status === 'success') {
                    alert(data.message);
                    location.reload();
                } else {
                    alert(data.message);
                }
            },
            error: function() {
                alert('An error occurred while removing the friend.');
            }
        });
    }
}
