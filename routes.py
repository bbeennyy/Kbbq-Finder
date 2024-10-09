import os
import requests
from flask import render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import Restaurant, User
from urllib.parse import quote
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

@app.route('/')
def index():
    mood = request.args.get('mood')
    food = request.args.get('food')
    if mood and food:
        return render_template('index.html', api_key=GOOGLE_MAPS_API_KEY, mood=mood, food=food)
    return render_template('wizard.html')

@app.route('/search', methods=['POST'])
def search():
    location = request.form.get('location')
    filters = request.form.getlist('filters')
    food_type = request.form.get('food_type', 'korean bbq')
    
    # Geocode the location
    geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={quote(location)}&key={GOOGLE_MAPS_API_KEY}"
    geocode_response = requests.get(geocode_url).json()
    
    if geocode_response['status'] != 'OK':
        return jsonify({'error': 'Unable to geocode the location'}), 400
    
    lat = geocode_response['results'][0]['geometry']['location']['lat']
    lng = geocode_response['results'][0]['geometry']['location']['lng']
    
    # Search for restaurants
    search_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=5000&type=restaurant&keyword={quote(food_type)}&key={GOOGLE_MAPS_API_KEY}"
    search_response = requests.get(search_url).json()
    
    if search_response['status'] != 'OK':
        return jsonify({'error': 'Unable to find restaurants'}), 400
    
    restaurants = []
    for result in search_response['results']:
        place_id = result['place_id']
        
        # Get place details to check for filters
        details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,vicinity,rating,geometry,price_level,review&key={GOOGLE_MAPS_API_KEY}"
        details_response = requests.get(details_url).json()
        
        if details_response['status'] != 'OK':
            continue
        
        details = details_response['result']
        
        # Check if the restaurant matches the filters
        if not all(check_filter(details, filter) for filter in filters):
            continue
        
        existing_restaurant = Restaurant.query.filter_by(place_id=place_id).first()
        
        if existing_restaurant:
            restaurants.append(existing_restaurant.to_dict())
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
            restaurants.append(new_restaurant.to_dict())
    
    return jsonify(restaurants)

def check_filter(details, filter):
    if filter == 'high_rating':
        return details.get('rating', 0) >= 4.5
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

@app.route('/share', methods=['POST'])
def share():
    data = request.json
    recipient_email = data.get('email')
    content = data.get('content')
    
    if not recipient_email or not content:
        return jsonify({'status': 'error', 'message': 'Email and content are required'}), 400

    subject = "Korean BBQ Restaurant Recommendations"
    sender_email = "your-email@example.com"  # Replace with your email
    
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = subject
    
    message.attach(MIMEText(content, "plain"))
    
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, "your-email-password")  # Replace with your email password
            server.send_message(message)
        return jsonify({'status': 'success', 'message': 'Email sent successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500