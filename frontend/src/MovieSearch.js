import React, { useState, useEffect, useRef } from 'react';
import './MovieSearch.css';

const MovieSearch = ({ onMovieSelect }) => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        // Close the dropdown when clicking outside of it
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (value) {
            // Debounce the API request by 500ms
            typingTimeoutRef.current = setTimeout(() => {
                const apiKey = process.env.REACT_APP_OMDB_API_KEY;
                fetch(`http://www.omdbapi.com/?apikey=${apiKey}&s=${value}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.Search) {
                            setSearchResults(data.Search);
                            setIsDropdownVisible(true);  // Show dropdown on search
                        } else {
                            setSearchResults([]);
                            setIsDropdownVisible(false);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching movies from OMDb:', error);
                        setIsDropdownVisible(false);
                    });
            }, 500);  // Adjust delay as needed
        } else {
            setSearchResults([]);
            setIsDropdownVisible(false);
        }
    }

    return (
        <div ref={dropdownRef} className="movie-search">
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    value={query}
                    onChange={handleSearchChange}  // Perform live search as user types
                    placeholder="Search for movies..."
                />
                <div className="input-group-append">
                    <button className="btn btn-primary" type="button">Search</button>
                </div>
            </div>

            {isDropdownVisible && (
                <ul className="dropdown animated-dropdown">  {/* Add animation class */}
                    {searchResults.map((movie) => (
                        <li key={movie.imdbID} className="dropdown-item d-flex justify-content-between align-items-center">
                            <span>{movie.Title} ({movie.Year})</span>  {/* Ensure left alignment */}
                            <button 
                                className="btn btn-sm btn-secondary ml-2" 
                                onClick={() => onMovieSelect(movie, true)}
                            >
                                Want to Watch
                            </button>
                            <button
                                className="btn btn-sm btn-success"
                                onClick={() => onMovieSelect(movie)}  // Add movie to list
                            >
                                Watched
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MovieSearch;