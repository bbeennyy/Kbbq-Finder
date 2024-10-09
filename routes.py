import os
import requests
from flask import render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import Restaurant, User
from urllib.parse import quote

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

@app.route('/')
def index():
    return render_template('index.html', api_key=GOOGLE_MAPS_API_KEY)

@app.route('/search', methods=['POST'])
def search():
    location = request.form.get('location')
    
    # Geocode the location
    geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={quote(location)}&key={GOOGLE_MAPS_API_KEY}"
    geocode_response = requests.get(geocode_url).json()
    
    if geocode_response['status'] != 'OK':
        return jsonify({'error': 'Unable to geocode the location'}), 400
    
    lat = geocode_response['results'][0]['geometry']['location']['lat']
    lng = geocode_response['results'][0]['geometry']['location']['lng']
    
    # Search for Korean BBQ restaurants
    search_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=5000&type=restaurant&keyword=korean%20bbq&key={GOOGLE_MAPS_API_KEY}"
    search_response = requests.get(search_url).json()
    
    if search_response['status'] != 'OK':
        return jsonify({'error': 'Unable to find restaurants'}), 400
    
    restaurants = []
    for result in search_response['results']:
        place_id = result['place_id']
        existing_restaurant = Restaurant.query.filter_by(place_id=place_id).first()
        
        if existing_restaurant:
            restaurants.append(existing_restaurant.to_dict())
        else:
            new_restaurant = Restaurant(
                name=result['name'],
                address=result['vicinity'],
                latitude=result['geometry']['location']['lat'],
                longitude=result['geometry']['location']['lng'],
                rating=result.get('rating'),
                place_id=place_id
            )
            db.session.add(new_restaurant)
            db.session.commit()
            restaurants.append(new_restaurant.to_dict())
    
    return jsonify(restaurants)

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
