import os
from flask import Flask, jsonify, request, redirect, url_for, session
from flask_migrate import Migrate
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
import secrets

# Load env variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
CORS(app, supports_credentials=True)

# PostgreSQL configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# OAuth configuration
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    access_token_params=None,
    client_kwargs={'scope': 'openid profile email'},
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo', 
    jwks_uri='https://www.googleapis.com/oauth2/v3/certs',  # Add the JWKs URI
    redirect_uri=os.getenv('GOOGLE_REDIRECT_URI')
)

# Define the Movie model
class Movie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    genres = db.Column(db.String(255), nullable=False)
    watched = db.Column(db.Boolean, default=False)
    want_to_watch = db.Column(db.Boolean, default=False)
    added_date = db.Column(db.DateTime, default=datetime.utcnow)
    rating = db.Column(db.Float, nullable=True)
    review = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Define the User model for authentication
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    movies = db.relationship('Movie', backref='user', lazy=True)

# Initialize the database
with app.app_context():
    db.create_all()

# Home route
@app.route('/')
def home():
    return jsonify(message="Welcome to CineTrackr backend")

# Route to login with Google
@app.route('/login')
def login():
    nonce = secrets.token_urlsafe(16)  # Generate a random nonce
    redirect_uri = url_for('authorize', _external=True)
    session['nonce'] = nonce
    return google.authorize_redirect(redirect_uri, nonce=nonce)

# Callback route after Google OAuth login
@app.route('/callback')
def authorize():
    try:
        token = google.authorize_access_token()  # Get the access token from Google
        nonce = session.pop('nonce', None)  # Retrieve the nonce from the session
        user_info = google.parse_id_token(token, nonce=nonce)  # Pass the nonce for verification

        # Check if user already exists in the database
        user = User.query.filter_by(email=user_info['email']).first()
        if not user:
            # If user doesn't exist, create a new user
            user = User(email=user_info['email'])
            db.session.add(user)
            db.session.commit()

        session['user'] = user_info['email']  # Store user email in session
    
        return redirect('http://localhost:3000/dashboard')  # Redirect to the dashboard
    except Exception as e:
        app.logger.error(f"Error during OAuth callback: {str(e)}")
        return jsonify(error="Internal Server Error"), 500

# Route to get the current logged in user's profile info
@app.route('/profile')
def profile():
    user_email = session.get('user')
    if user_email:
        return jsonify(message="Profile info", email=user_email)
    else:
        return jsonify

# Route to get all movies
@app.route('/movies')
def get_user_movies():
    user_email = session.get('user')
    if not user_email:
        return jsonify(error="Unauthorized, please log in"), 401

    user = User.query.filter_by(email=user_email).first()
    movies = Movie.query.filter_by(user_id=user.id).all()
    movies_json = [{
        "id": movie.id, 
        "title": movie.title, 
        "year": movie.year,
        "genres": movie.genres,
        "watched": movie.watched,
        "want_to_watch": movie.want_to_watch,
    } for movie in movies]
    return jsonify(movies=movies_json)

# Route to add a new movie
@app.route('/movies', methods=['POST'])
def add_movie_for_user():
    try:
        user_email = session.get('user')
        if not user_email:
            return jsonify(error="Unauthorized, please log in"), 401

        user = User.query.filter_by(email=user_email).first()
        data = request.get_json()

        new_movie = Movie(
            title=data['title'],
            year=data['year'],
            genres=data.get('genres', ''),
            watched=data.get('watched', False),
            want_to_watch=data.get('want_to_watch', False),
            rating=data.get('rating', None),
            review=data.get('review', ''),
            user_id=user.id
        )
        db.session.add(new_movie)
        db.session.commit()
        return jsonify(message="Movie added successfully", movie={
            "id": new_movie.id,
            "title": new_movie.title,
            "year": new_movie.year,
            "genres": new_movie.genres,
            "watched": new_movie.watched,
            "want_to_watch": new_movie.want_to_watch,
            "added_date": new_movie.added_date,
            "rating": new_movie.rating,
            "review": new_movie.review
        }), 201
    except Exception as e:
        app.logger.error(f"Error adding movie: {str(e)}")
        return jsonify(error="Internal Server Error"), 500

# Route to update a movie's watched status
@app.route('/movies/<int:id>', methods=['PUT'])
def update_movie(id):
    try:
        data = request.get_json()
        movie = Movie.query.get_or_404(id)
        movie.watched = data.get('watched', movie.watched)
        movie.want_to_watch = data.get('want_to_watch', movie.want_to_watch)
        db.session.commit()
        return jsonify(message="Movie updated successfully", movie={
            "id": movie.id, 
            "title": movie.title,
            "year": movie.year,
            "genres": movie.genres,
            "watched": movie.watched,
            "want_to_watch": movie.want_to_watch
        })
    except Exception as e:
        app.logger.error(f"Error updating movie: {str(e)}")
        return jsonify(error="Internal Server Error"), 500

# Route to delete a movie
@app.route('/movies/<int:id>', methods=['DELETE'])
def delete_movie(id):
    movie = Movie.query.get_or_404(id)
    db.session.delete(movie)
    db.session.commit()
    return jsonify(message="Movie deleted successfully")

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None) # Remove the user from the session
    return jsonify(message="User logged out successfully"), 200

if __name__ == '__main__':
    app.run(debug=True)
