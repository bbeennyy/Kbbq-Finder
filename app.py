import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from flask_login import LoginManager

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'login'

with app.app_context():
    import models
    db.drop_all()
    db.create_all()

from routes import *

@login_manager.user_loader
def load_user(user_id):
    return models.User.query.get(int(user_id))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
