import React, { useState, useEffect } from 'react';
import './PasswordProtection.css';

function PasswordProtection({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Check if already authenticated in session
    useEffect(() => {
        const auth = sessionStorage.getItem('superquote_auth');
        if (auth === 'authenticated') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (password === 'sinuoso') {
            setIsAuthenticated(true);
            sessionStorage.setItem('superquote_auth', 'authenticated');
            setError('');
        } else {
            setError('Password errata. Riprova.');
            setPassword('');
        }
    };

    if (isAuthenticated) {
        return children;
    }

    return (
        <div className="password-protection-overlay">
            <div className="password-protection-card">
                <div className="lock-icon">🔒</div>
                <h2>Accesso Riservato</h2>
                <p>Inserisci la password per accedere a Superquote Dashboard</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        className="password-input"
                    />
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="submit-button">
                        Accedi
                    </button>
                </form>
            </div>
        </div>
    );
}

export default PasswordProtection;
