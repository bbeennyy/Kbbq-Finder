import os
import requests
from flask import render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import Restaurant, User, Invitation
from urllib.parse import quote
from datetime import datetime
import logging

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

@app.route('/')
def index():
    return render_template('index.html', api_key=GOOGLE_MAPS_API_KEY)

@app.route('/search', methods=['POST'])
def search():
    location = request.form.get('location')
    filters = request.form.getlist('filters')
    
    geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={quote(location)}&key={GOOGLE_MAPS_API_KEY}"
    geocode_response = requests.get(geocode_url).json()
    
    if geocode_response['status'] != 'OK':
        return jsonify({'error': 'Unable to geocode the location'}), 400
    
    lat = geocode_response['results'][0]['geometry']['location']['lat']
    lng = geocode_response['results'][0]['geometry']['location']['lng']
    
    search_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=5000&type=restaurant&keyword=korean%20bbq&key={GOOGLE_MAPS_API_KEY}"
    search_response = requests.get(search_url).json()
    
    if search_response['status'] != 'OK':
        return jsonify({'error': 'Unable to find restaurants'}), 400
    
    restaurants = []
    for result in search_response['results']:
        place_id = result['place_id']
        
        details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,vicinity,rating,geometry,price_level,review,photos&key={GOOGLE_MAPS_API_KEY}"
        details_response = requests.get(details_url).json()
        
        if details_response['status'] != 'OK':
            continue
        
        details = details_response['result']
        
        if not all(check_filter(details, filter) for filter in filters):
            continue
        
        photo_reference = None
        if 'photos' in details and len(details['photos']) > 0:
            photo_reference = details['photos'][0]['photo_reference']
        
        existing_restaurant = Restaurant.query.filter_by(place_id=place_id).first()
        
        if existing_restaurant:
            restaurant_data = existing_restaurant.to_dict()
        else:
            new_restaurant = Restaurant(
                name=details['name'],
                address=details['vicinity'],
                latitude=details['geometry']['location']['lat'],
                longitude=details['geometry']['location']['lng'],
                rating=details.get('rating'),
                place_id=place_id
            )
            db.session.add(new_restaurant)
            db.session.commit()
            restaurant_data = new_restaurant.to_dict()
        
        if photo_reference:
            restaurant_data['photo_url'] = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key={GOOGLE_MAPS_API_KEY}"
        else:
            restaurant_data['photo_url'] = None
        
        restaurants.append(restaurant_data)
    
    return jsonify(restaurants)

def check_filter(details, filter):
    if filter == 'high_rating':
        return details.get('rating', 0) >= 4.0
    elif filter == 'affordable':
        return details.get('price_level', 2) <= 2
    elif filter == 'outdoor_seating':
        return any('outdoor seating' in review.get('text', '').lower() for review in details.get('reviews', []))
    elif filter == 'bbq_grill':
        return any('bbq grill' in review.get('text', '').lower() for review in details.get('reviews', []))
    return True

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter((User.username == username) | (User.email == email)).first()
        if user:
            flash('Username or email already exists')
            return redirect(url_for('register'))
        
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user)
        return redirect(url_for('index'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/favorite/<int:restaurant_id>', methods=['POST'])
@login_required
def favorite_restaurant(restaurant_id):
    restaurant = Restaurant.query.get_or_404(restaurant_id)
    if restaurant not in current_user.favorite_restaurants:
        current_user.favorite_restaurants.append(restaurant)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Restaurant added to favorites'})
    return jsonify({'status': 'error', 'message': 'Restaurant already in favorites'})

@app.route('/unfavorite/<int:restaurant_id>', methods=['POST'])
@login_required
def unfavorite_restaurant(restaurant_id):
    restaurant = Restaurant.query.get_or_404(restaurant_id)
    if restaurant in current_user.favorite_restaurants:
        current_user.favorite_restaurants.remove(restaurant)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Restaurant removed from favorites'})
    return jsonify({'status': 'error', 'message': 'Restaurant not in favorites'})

@app.route('/favorites')
@login_required
def favorites():
    return render_template('favorites.html', favorites=current_user.favorite_restaurants)

@app.route('/send_invitation', methods=['POST'])
@login_required
def send_invitation():
    recipient_username = request.form.get('recipient_username')
    restaurant_id = request.form.get('restaurant_id')
    message = request.form.get('message')
    date_time_str = request.form.get('date_time')

    if not all([recipient_username, restaurant_id, date_time_str]):
        return jsonify({'status': 'error', 'message': 'Missing required information'}), 400

    try:
        date_time = datetime.strptime(date_time_str, '%Y-%m-%dT%H:%M')
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid date and time format'}), 400

    recipient = User.query.filter_by(username=recipient_username).first()
    if not recipient:
        return jsonify({'status': 'error', 'message': 'Recipient not found'}), 404

    if recipient not in current_user.friends:
        return jsonify({'status': 'error', 'message': 'You can only invite friends'}), 403

    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'status': 'error', 'message': 'Restaurant not found'}), 404

    existing_invitation = Invitation.query.filter_by(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        restaurant_id=restaurant_id,
        date_time=date_time
    ).first()

    if existing_invitation:
        return jsonify({'status': 'error', 'message': 'Invitation already sent'}), 400

    invitation = Invitation(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        restaurant_id=restaurant_id,
        message=message,
        date_time=date_time
    )
    db.session.add(invitation)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Invitation sent successfully'})

@app.route('/invitations')
@login_required
def view_invitations():
    received_invitations = Invitation.query.filter_by(recipient_id=current_user.id, status='pending').all()
    sent_invitations = Invitation.query.filter_by(sender_id=current_user.id).all()
    accepted_invitations = Invitation.query.filter_by(recipient_id=current_user.id, status='accepted').all()
    
    return render_template('invitations.html', 
                           received_invitations=received_invitations, 
                           sent_invitations=sent_invitations,
                           accepted_invitations=accepted_invitations)

@app.route('/respond_invitation/<int:invitation_id>/<string:response>', methods=['POST'])
@login_required
def respond_invitation(invitation_id, response):
    invitation = Invitation.query.get_or_404(invitation_id)
    if invitation.recipient_id != current_user.id:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    if response not in ['accept', 'decline']:
        return jsonify({'status': 'error', 'message': 'Invalid response'}), 400

    invitation.status = 'accepted' if response == 'accept' else 'declined'
    db.session.commit()

    return jsonify({'status': 'success', 'message': f'Invitation {invitation.status}'})

@app.route('/reschedule_invitation', methods=['POST'])
@login_required
def reschedule_invitation():
    invitation_id = request.form.get('invitation_id')
    new_date_time_str = request.form.get('new_date_time')

    if not invitation_id or not new_date_time_str:
        return jsonify({'status': 'error', 'message': 'Missing required information'}), 400

    try:
        new_date_time = datetime.strptime(new_date_time_str, '%Y-%m-%dT%H:%M')
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid date and time format'}), 400

    invitation = Invitation.query.get_or_404(invitation_id)

    if invitation.recipient_id != current_user.id:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    invitation.date_time = new_date_time
    db.session.commit()

    print(f"Notification: Invitation {invitation_id} has been rescheduled by {current_user.username}")

    return jsonify({'status': 'success', 'message': 'Invitation rescheduled successfully'})

@app.route('/add_friend', methods=['POST'])
@login_required
def add_friend():
    friend_username = request.form.get('friend_username')
    friend = User.query.filter_by(username=friend_username).first()

    if not friend:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404

    if friend == current_user:
        return jsonify({'status': 'error', 'message': 'You cannot add yourself as a friend'}), 400

    if friend in current_user.friends:
        return jsonify({'status': 'error', 'message': 'User is already your friend'}), 400

    current_user.add_friend(friend)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Friend added successfully'})

@app.route('/remove_friend', methods=['POST'])
@login_required
def remove_friend():
    friend_username = request.form.get('friend_username')
    friend = User.query.filter_by(username=friend_username).first()

    if not friend:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404

    if friend not in current_user.friends:
        return jsonify({'status': 'error', 'message': 'User is not your friend'}), 400

    current_user.remove_friend(friend)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Friend removed successfully'})

@app.route('/friends')
@login_required
def friends():
    return render_template('friends.html', friends=current_user.friends)

@app.route('/friend_suggestions')
@login_required
def friend_suggestions():
    query = request.args.get('query', '')
    suggestions = User.query.filter(
        User.username.ilike(f'%{query}%'),
        User.id != current_user.id,
        ~User.id.in_([friend.id for friend in current_user.friends])
    ).limit(5).all()
    return jsonify([{'id': user.id, 'username': user.username} for user in suggestions])

@app.route('/friend_autocomplete')
@login_required
def friend_autocomplete():
    query = request.args.get('query', '')
    logging.info(f"Friend autocomplete called with query: {query}")
    friends = User.query.filter(
        User.username.ilike(f'%{query}%'),
        User.id.in_([friend.id for friend in current_user.friends])
    ).limit(5).all()
    result = [{'id': user.id, 'username': user.username} for user in friends]
    logging.info(f"Friend autocomplete returning: {result}")
    return jsonify(result)