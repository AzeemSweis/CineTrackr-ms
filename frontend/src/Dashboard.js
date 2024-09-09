import React, { useState, useEffect } from 'react';
import MovieSearch from './MovieSearch';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Fetching movies...");
        
        fetch('http://localhost:5000/movies', {
            credentials: 'include',  // Include session for authentication
        })
        .then(response => {
            console.log("Response received:", response);
            if (!response.ok) {
                throw new Error('Failed to fetch movies');
            }
            return response.json();
        })
        .then(data => {
            console.log("Movies data:", data);
            setMovies(data.movies);  // Only set the movies array from the response
            setLoading(false);  // Stop the loading state
        })
        .catch((error) => {
            console.error('Error fetching movies:', error);
            setLoading(false);  // Stop the loading state even if there's an error
        });
    }, []);
    
    const handleMovieAdded = (newMovie) => {
        if (newMovie && newMovie.id) {
            if (Array.isArray(movies)) {
                setMovies([...movies, newMovie]);  // Add the new movie to the list
            } else {
                console.error("Movies is not an array:", movies);
            }
        } else {
            console.error("Invalid movie data:", newMovie);
        }
    };

    const handleMovieSelect = (movie, wantToWatch = false) => {
        const movieData = {
            title: movie.Title,
            year: movie.Year,
            genres: movie.Genre,
            watched: !wantToWatch,
            want_to_watch: wantToWatch,
            rating: null,
            review: ""
        };

        fetch('http://localhost:5000/movies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(movieData),  // Add a new movie
            credentials: 'include',
        })
        .then(response => response.json())
        .then((data) => {
            handleMovieAdded(data.movie);
        })
        .catch(error => {
            console.error('Error adding movie from OMDb:', error);
        });
    }; 

    const handleDeleteMovie = (id) => {
        fetch(`http://localhost:5000/movies/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        })
        .then((response) => response.json())
        .then(() => {
            setMovies(movies.filter(movie => movie.id !== id));  // Remove the movie from the list
        })
        .catch((error) => console.error('Error deleting movie:', error));
    };

    const handleMarkAsWatched = (id) => {
        fetch(`http://localhost:5000/movies/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ watched: true, want_to_watch: false }),  // Ensure both fields are updated
            credentials: 'include',
        })
        .then(response => response.json())
        .then((updatedMovie) => {
            setMovies(movies.map(movie => 
                movie.id === updatedMovie.movie.id 
                ? {
                    ...movie,
                    watched: updatedMovie.movie.watched,
                    want_to_watch: updatedMovie.movie.want_to_watch
                }
                : movie
            ));
        })
        .catch((error) => console.error('Error marking movie as watched:', error));
    };

    const handleLogout = () => {
        fetch('http://localhost:5000/logout', {
            method: 'POST',
            credentials: 'include',
        })
        .then(response => {
            if (response.ok) {
                navigate('/login');  // Redirect to login page
            }
        })
        .catch((error) => console.error('Error logging out:', error));
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
            </div>

            <div className="row mt-4">
                {/* Widen Search Movies section */}
                <div className="search-movies">
                    <h2>Search Movies</h2>
                    <MovieSearch onMovieSelect={handleMovieSelect} />
                </div>

                {/* Watched and Want to Watch lists */}
                <div className="movie-list">
                    <h3>Watched Movies</h3>
                    <ul className="list-group">
                        {movies.filter(movie => movie.watched).map(movie => (
                            <li key={movie.id} className="list-group-item d-flex justify-content-between align-items-center">
                                {movie.title} ({movie.year})
                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteMovie(movie.id)}>Delete</button>
                            </li>
                        ))}
                    </ul>

                    <h3>Want to Watch</h3>
                    <ul className="list-group">
                        {movies.filter(movie => movie.want_to_watch).map(movie => (
                            <li key={movie.id} className="list-group-item d-flex justify-content-between align-items-center">
                                {movie.title} ({movie.year})
                                <div>
                                    <button className="btn btn-sm btn-success mr-2" onClick={() => handleMarkAsWatched(movie.id)}>Mark as Watched</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteMovie(movie.id)}>Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
