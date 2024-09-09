import React, { useState } from 'react';

const AddMovie = ({ onMovieAdded }) => {
    const [title, setTitle] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        console.log("Adding movie:", title);  // Log the title to see what's being sent

        fetch('http://localhost:5000/movies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, watched: false }),  // Add a new movie
            credentials: 'include',  // Ensure session cookie is sent
        })
        .then(response => {
            console.log("Response from backend:", response);
            return response.json();
        })
        .then((data) => {
            console.log("Movie added:", data.movie);
            onMovieAdded(data.movie);  // Call parent to refresh movie list
            setTitle('');  // Clear the input field after submitting
        })
        .catch((error) => {
            console.error('Error adding movie:', error);
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Movie title"
                required
            />
            <button type="submit">Add Movie</button>
        </form>
    );
};

export default AddMovie;
