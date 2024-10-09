import os
import requests
from flask import render_template, request, jsonify
from app import app, db
from models import Restaurant
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
