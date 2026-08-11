import React, { useState } from 'react';
import { registerAPI, loginAPI } from '../services/api';

export default function AuthView({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [step, setStep] = useState('auth'); // 'auth' or 'check_email'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [country, setCountry] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const data = await loginAPI(email, password);
                localStorage.setItem('access_token', data.access_token);
                onLoginSuccess();
            } else {
                await registerAPI({ name, email, age: Number(age), country, password });
                setStep('check_email'); // Move to success message screen
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--accent-cyan)' }}>
                    {step === 'check_email' ? 'Check Your Email' : (isLogin ? 'Welcome Back' : 'Create Account')}
                </h2>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

                {step === 'auth' ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {!isLogin && (
                            <>
                                <input className="glass-textarea" required placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <input className="glass-textarea" type="number" required placeholder="Age" value={age} onChange={e => setAge(e.target.value)} style={{ width: '30%' }} />
                                    <input className="glass-textarea" required placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} style={{ width: '70%' }} />
                                </div>
                            </>
                        )}
                        <input className="glass-textarea" type="email" required placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
                        <input className="glass-textarea" type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        {!isLogin && <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Min 8 chars, 1 letter, 1 number, 1 special char.</small>}

                        <button className="glass-button" type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #c043ff, #00f2fe)', justifyContent: 'center', marginTop: '10px' }}>
                            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsLogin(!isLogin)}>
                                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                            </span>
                        </div>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            We have sent a confirmation link to <strong>{email}</strong>. Please click the link in your email to verify your account.
                        </p>
                        <button
                            className="glass-button"
                            onClick={() => { setStep('auth'); setIsLogin(true); }}
                            style={{ background: 'linear-gradient(135deg, #c043ff, #00f2fe)', justifyContent: 'center' }}
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}