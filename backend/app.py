import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

# PostgreSQL configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define the Movie model
class Movie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    watched = db.Column(db.Boolean, default=False)

# Initialize the database
with app.app_context():
    db.create_all()

# Home route
@app.route('/')
def home():
    return jsonify(message="Welcome to CineTrackr backend")

# Route to get all movies
@app.route('/movies')
def get_movies():
    movies = Movie.query.all()
    movies_json = [{"id": movie.id, "title": movie.title, "watched": movie.watched} for movie in movies]
    return jsonify(movies_json)

# Route to add a new movie
@app.route('/movies', methods=['POST'])
def add_movie():
    try:
        data = request.get_json()  # Use 'request' to get JSON data
        new_movie = Movie(title=data['title'], watched=data.get('watched', False))
        db.session.add(new_movie)
        db.session.commit()
        return jsonify(message="Movie added successfully", movie={"id": new_movie.id, "title": new_movie.title, "watched": new_movie.watched}), 201
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
        db.session.commit()
        return jsonify(message="Movie updated successfully", movie={"id": movie.id, "title": movie.title, "watched": movie.watched})
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

if __name__ == '__main__':
    app.run(debug=True)
