from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    favorite_restaurants = db.relationship('Restaurant', secondary='user_favorites', back_populates='favorited_by')
    sent_invitations = db.relationship('Invitation', foreign_keys='Invitation.sender_id', backref='sender', lazy='dynamic')
    received_invitations = db.relationship('Invitation', foreign_keys='Invitation.recipient_id', backref='recipient', lazy='dynamic')
    friends = db.relationship('User', 
                              secondary='friendships',
                              primaryjoin=('friendships.c.user_id == User.id'),
                              secondaryjoin=('friendships.c.friend_id == User.id'),
                              backref=db.backref('friended_by', lazy='dynamic'),
                              lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def add_friend(self, user):
        if user not in self.friends:
            self.friends.append(user)
            user.friends.append(self)

    def remove_friend(self, user):
        if user in self.friends:
            self.friends.remove(user)
            user.friends.remove(self)

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

class Invitation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    message = db.Column(db.String(200))
    status = db.Column(db.String(20), default='pending')  # pending, accepted, declined
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    date_time = db.Column(db.DateTime, nullable=False)

    restaurant = db.relationship('Restaurant', backref='invitations')

db.Table('user_favorites',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('restaurant_id', db.Integer, db.ForeignKey('restaurant.id'), primary_key=True)
)

db.Table('friendships',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('friend_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)
