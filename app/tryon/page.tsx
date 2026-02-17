'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './tryon.module.css';

function TryOnContent() {
    const searchParams = useSearchParams();
    const userEmail = searchParams.get('user');

    const [subjectFile, setSubjectFile] = useState<File | null>(null);
    const [subjectUrl, setSubjectUrl] = useState('');
    const [subjectPreview, setSubjectPreview] = useState<string | null>(null);

    const [garmentFile, setGarmentFile] = useState<File | null>(null);
    const [garmentUrl, setGarmentUrl] = useState('');
    const [garmentPreview, setGarmentPreview] = useState<string | null>(null);

    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [credits, setCredits] = useState(3);

    const subjectInputRef = useRef<HTMLInputElement>(null);
    const garmentInputRef = useRef<HTMLInputElement>(null);

    // Fetch initial quota
    useEffect(() => {
        if (userEmail) {
            fetch(`/api/quota?email=${encodeURIComponent(userEmail)}`)
                .then((res) => res.json())
                .then((data) => {
                    setCredits(data.remaining);
                })
                .catch(console.error);
        }
    }, [userEmail]);

    // Handle file preview
    const handleFileChange = (
        file: File | null,
        setFile: (f: File | null) => void,
        setPreview: (p: string | null) => void
    ) => {
        if (file) {
            setFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Upload file to Cloudinary
    const uploadFile = async (file: File): Promise<{ url: string; publicId: string } | null> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (data.success) {
            return { url: data.url, publicId: data.publicId };
        }
        return null;
    };

    const handleTryOn = async () => {
        if (!userEmail) {
            setError('Authentication required. Please login again.');
            return;
        }

        // Determine subject source
        let subjectImageUrl = subjectUrl.trim();
        let subjectPublicId: string | null = null;

        // Determine garment source
        let garmentImageUrl = garmentUrl.trim();
        let garmentPublicId: string | null = null;

        if (!subjectImageUrl && !subjectFile) {
            setError('Please provide a Subject image.');
            return;
        }

        if (!garmentImageUrl && !garmentFile) {
            setError('Please provide a Garment image.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResultImage(null);

        try {
            // Upload files if needed
            if (!subjectImageUrl && subjectFile) {
                const result = await uploadFile(subjectFile);
                if (result) {
                    subjectImageUrl = result.url;
                    subjectPublicId = result.publicId;
                } else {
                    throw new Error('Failed to upload subject image');
                }
            }

            if (!garmentImageUrl && garmentFile) {
                const result = await uploadFile(garmentFile);
                if (result) {
                    garmentImageUrl = result.url;
                    garmentPublicId = result.publicId;
                } else {
                    throw new Error('Failed to upload garment image');
                }
            }

            // Call generate API
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    subjectUrl: subjectImageUrl,
                    garmentUrl: garmentImageUrl,
                    subjectPublicId,
                    garmentPublicId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResultImage(data.image);
                setCredits(data.remaining);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(`Error: ${String(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const clearSubject = () => {
        setSubjectFile(null);
        setSubjectUrl('');
        setSubjectPreview(null);
        if (subjectInputRef.current) subjectInputRef.current.value = '';
    };

    const clearGarment = () => {
        setGarmentFile(null);
        setGarmentUrl('');
        setGarmentPreview(null);
        if (garmentInputRef.current) garmentInputRef.current.value = '';
    };

    if (!userEmail) {
        return (
            <main className={styles.main}>
                <div className="status-banner warning">
                    ⚠️ No user detected. Please log in via the main URL.
                </div>
                <a href="/" className={styles.loginLink}>
                    Go to Login
                </a>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                {/* Status Banner */}
                <div className="status-banner">
                    Logged in as: {userEmail} | Credits: {credits}/3
                </div>

                <div className={styles.content}>
                    {/* Left Column - Inputs */}
                    <div className={styles.inputColumn}>
                        {/* Subject Image */}
                        <div className={styles.inputGroup}>
                            <h3>Subject Image</h3>
                            <div
                                className={`${styles.uploadArea} ${subjectPreview ? styles.hasImage : ''}`}
                                onClick={() => !subjectPreview && subjectInputRef.current?.click()}
                            >
                                {subjectPreview ? (
                                    <div className={styles.previewContainer}>
                                        <img src={subjectPreview} alt="Subject" className={styles.previewImage} />
                                        <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); clearSubject(); }}>
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles.uploadPlaceholder}>
                                        <span className={styles.uploadIcon}>📷</span>
                                        <span>Click to upload</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={subjectInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleFileChange(e.target.files?.[0] || null, setSubjectFile, setSubjectPreview)}
                            />
                            <div className="or-divider">— OR —</div>
                            <input
                                type="text"
                                placeholder="https://..."
                                value={subjectUrl}
                                onChange={(e) => {
                                    setSubjectUrl(e.target.value);
                                    if (e.target.value.trim()) {
                                        setSubjectPreview(e.target.value.trim());
                                        setSubjectFile(null);
                                    }
                                }}
                            />
                        </div>

                        {/* Garment Image */}
                        <div className={styles.inputGroup}>
                            <h3>Garment Image</h3>
                            <div
                                className={`${styles.uploadArea} ${garmentPreview ? styles.hasImage : ''}`}
                                onClick={() => !garmentPreview && garmentInputRef.current?.click()}
                            >
                                {garmentPreview ? (
                                    <div className={styles.previewContainer}>
                                        <img src={garmentPreview} alt="Garment" className={styles.previewImage} />
                                        <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); clearGarment(); }}>
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles.uploadPlaceholder}>
                                        <span className={styles.uploadIcon}>👕</span>
                                        <span>Click to upload</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={garmentInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleFileChange(e.target.files?.[0] || null, setGarmentFile, setGarmentPreview)}
                            />
                            <div className="or-divider">— OR —</div>
                            <input
                                type="text"
                                placeholder="https://..."
                                value={garmentUrl}
                                onChange={(e) => {
                                    setGarmentUrl(e.target.value);
                                    if (e.target.value.trim()) {
                                        setGarmentPreview(e.target.value.trim());
                                        setGarmentFile(null);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Right Column - Output */}
                    <div className={styles.outputColumn}>
                        <h3>Result</h3>
                        <div className={styles.resultGallery}>
                            {isLoading ? (
                                <div className={styles.loadingState}>
                                    <div className="spinner"></div>
                                    <p>Generating... This may take up to 60 seconds</p>
                                </div>
                            ) : resultImage ? (
                                <img src={resultImage} alt="Result" className={styles.resultImage} />
                            ) : (
                                <div className={styles.placeholder}>
                                    <span>Your result will appear here</span>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>
                                {error}
                            </div>
                        )}

                        <button
                            className={styles.runButton}
                            onClick={handleTryOn}
                            disabled={isLoading || credits <= 0}
                        >
                            {isLoading ? 'Processing...' : 'Run Try-On'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function TryOnPage() {
    return (
        <Suspense fallback={
            <main className={styles.main}>
                <div className={styles.container}>
                    <div className="status-banner">Loading...</div>
                </div>
            </main>
        }>
            <TryOnContent />
        </Suspense>
    );
}
