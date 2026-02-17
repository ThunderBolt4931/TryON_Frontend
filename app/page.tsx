'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | 'processing'>('processing');
  const [isLoading, setIsLoading] = useState(false);

  const sendCode = async () => {
    if (!email || !name) {
      setMessage('Please fill in all fields.');
      setMessageType('error');
      return;
    }

    setMessage('Processing...');
    setMessageType('processing');
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('verify');
        setMessage('');
      } else {
        setMessage(data.message);
        setMessageType('error');
      }
    } catch {
      setMessage('Connection Error');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code) {
      setMessage('Please enter the code.');
      setMessageType('error');
      return;
    }

    setMessage('Verifying...');
    setMessageType('processing');
    setIsLoading(true);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Success! Redirecting...');
        setMessageType('success');
        setTimeout(() => {
          router.push(`/tryon?user=${encodeURIComponent(email)}`);
        }, 1000);
      } else {
        setMessage('Incorrect code.');
        setMessageType('error');
      }
    } catch {
      setMessage('Connection Error');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          <div className={styles.contentBox}>
            <h1 className={styles.title}>
              Attira Demo
              <br />
              <span className="highlight">AI Studio</span>
            </h1>
            <p className={styles.subtitle}>
              Experience the next generation of fashion technology.
            </p>

            <div className={styles.features}>
              <div className={styles.featureItem}>
                <h3>High Fidelity</h3>
                <p>Photorealistic garment transfer using advanced diffusion models.</p>
              </div>
              <div className={styles.featureItem}>
                <h3>Fast Inference</h3>
                <p>Powered by Modal A100 GPUs for results in seconds.</p>
              </div>
              <div className={styles.featureItem}>
                <h3>Secure Access</h3>
                <p>Protected by OTP verification and usage quotas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          <div className={styles.loginCard}>
            {step === 'login' ? (
              <>
                <h2>Welcome Back</h2>
                <p className={styles.formDesc}>Enter your details to access the studio.</p>

                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Ex: John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />

                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />

                <button onClick={sendCode} disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Access Code'}
                </button>

                {message && (
                  <p className={`status-msg ${messageType}`}>{message}</p>
                )}
              </>
            ) : (
              <>
                <h2>Verify Email</h2>
                <p className={styles.formDesc}>We sent a 6-digit code to your email.</p>

                <label>Verification Code</label>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isLoading}
                />

                <button onClick={verifyCode} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify & Enter'}
                </button>

                {message && (
                  <p className={`status-msg ${messageType}`}>{message}</p>
                )}

                <a
                  href="#"
                  className={styles.backLink}
                  onClick={(e) => {
                    e.preventDefault();
                    setStep('login');
                    setMessage('');
                    setCode('');
                  }}
                >
                  Go Back
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
