from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    favorite_restaurants = db.relationship('Restaurant', secondary='user_favorites', back_populates='favorited_by')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    rating = db.Column(db.Float)
    place_id = db.Column(db.String(100), unique=True, nullable=False)
    favorited_by = db.relationship('User', secondary='user_favorites', back_populates='favorite_restaurants')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'rating': self.rating,
            'place_id': self.place_id
        }

user_favorites = db.Table('user_favorites',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('restaurant_id', db.Integer, db.ForeignKey('restaurant.id'), primary_key=True)
)
