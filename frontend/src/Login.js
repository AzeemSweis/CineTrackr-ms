import React from 'react';

const Login = () => {
    const handleLogin = () => {
        window.location.href = 'http://localhost:5000/login'; // Redirect to Flask login
    };

    return (
        <div>
            <h1>Welcome to CineTrackr</h1>
            <button onClick={handleLogin}>Login with Google</button>
        </div>
    );
};

export default Login;
