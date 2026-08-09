
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './icons';

// @ts-ignore - BarcodeDetector may not be in the default TS lib types
const hasBarcodeDetector = 'BarcodeDetector' in window && window.BarcodeDetector.getSupportedFormats().then(f => f.includes('qr_code'));

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture?: (file: File) => void;
  onCodeDetected?: (code: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture, onCodeDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCodeFound, setIsCodeFound] = useState(false);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    setError(null);
    setIsCodeFound(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      let message = "Could not access camera. Please ensure you've given permission.";
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
          message = "Camera access denied. Please allow camera access in browser settings.";
      }
      setError(message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      cancelAnimationFrame(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);
  
  const detectCode = useCallback(async () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && onCodeDetected) {
        try {
            // @ts-ignore
            const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0 && !isCodeFound) { // Process only the first detected code
                const detectedCode = barcodes[0];
                if (navigator.vibrate) {
                    navigator.vibrate(200); // Haptic feedback
                }
                setIsCodeFound(true); // Trigger visual feedback
                
                // Close after a short delay to show feedback
                setTimeout(() => {
                    onCodeDetected(detectedCode.rawValue);
                }, 500);
                return; // Stop the loop
            }
        } catch (err) {
            // This can happen if the detector is not ready, usually not critical.
            console.warn('Barcode detection failed for this frame:', err);
        }
    }
    // Continue loop if no code is found
    if (!isCodeFound) {
      detectionIntervalRef.current = requestAnimationFrame(detectCode);
    }
  }, [onCodeDetected, isCodeFound]);
  
  const handleCapture = useCallback(() => {
    if (videoRef.current && onCapture) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onCapture(file);
                }
            }, 'image/jpeg', 0.9);
        }
    }
}, [onCapture]);


  useEffect(() => {
    const initScanner = async () => {
      const isSupported = await hasBarcodeDetector;
      if (!isSupported) {
        setError("Live QR scanning not supported by your browser. Please update or use another browser.");
        return;
      }
      await startCamera();
      if (videoRef.current) {
        videoRef.current.oncanplay = () => {
            if (detectionIntervalRef.current) {
              cancelAnimationFrame(detectionIntervalRef.current);
            }
            detectionIntervalRef.current = requestAnimationFrame(detectCode);
        };
      }
    };
    
    if (isOpen) {
      if (onCodeDetected) {
        initScanner();
      } else if (onCapture) {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera(); // Cleanup on unmount
    };
  }, [isOpen, startCamera, stopCamera, detectCode, onCapture, onCodeDetected]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
        <div className="w-full h-full relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
                    <Icon name="camera" className="w-16 h-16 text-red-400 mb-4"/>
                    <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
                    <p className="text-white max-w-sm">{error}</p>
                    <button 
                        onClick={onClose} 
                        className="mt-6 px-6 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}

            {!error && (
                <>
                    {/* Scanner Overlay UI */}
                    {onCodeDetected && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none">
                            <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-square">
                                <div className="relative w-full h-full">
                                    {/* Cutout effect */}
                                    <div className="absolute inset-0 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div>
                                    
                                    {/* Corner Brackets */}
                                    <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg transition-colors duration-300 ${isCodeFound ? 'border-green-400' : 'border-white'}`}></div>
                                    <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg transition-colors duration-300 ${isCodeFound ? 'border-green-400' : 'border-white'}`}></div>
                                    <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg transition-colors duration-300 ${isCodeFound ? 'border-green-400' : 'border-white'}`}></div>
                                    <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-lg transition-colors duration-300 ${isCodeFound ? 'border-green-400' : 'border-white'}`}></div>


                                    {/* Animated Laser Line */}
                                    {!isCodeFound && (
                                      <div className="absolute left-1 right-1 h-0.5 bg-red-500/90 shadow-[0_0_8px_1px_red] rounded-full animate-scan-line"></div>
                                    )}
                                </div>
                            </div>
                            <p className="text-white text-lg font-semibold mt-8 text-center px-4 py-2 bg-black/30 rounded-lg">
                               {isCodeFound ? 'QR Code Scanned!' : 'Position QR code inside the frame'}
                            </p>
                        </div>
                    )}
                    
                    {onCapture && (
                         <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none">
                            <p className="text-white text-lg font-semibold text-center px-4 py-2 bg-black/30 rounded-lg">
                                Position animal and tap button to capture
                            </p>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-end items-center bg-gradient-to-b from-black/50 to-transparent">
                         <button onClick={onClose} className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors">
                            <Icon name="close" className="w-6 h-6 text-white" />
                         </button>
                    </div>
                    
                    {onCapture && (
                        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center items-center bg-gradient-to-t from-black/50 to-transparent">
                            <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white/90 p-1.5 border-4 border-white/50 ring-4 ring-black/20 hover:bg-white transition-colors">
                                <span className="block w-full h-full bg-white rounded-full"></span>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};
