'use client'

import './globals.css';
import Image from "next/image";
import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title as ChartTitle, Tooltip, Legend, Filler } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { UserProfile } from '@/components/user/UserProfile';
import { UserProfileDropdown } from '@/components/user/UserProfileDropdown';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { saveAnalysisResult } from '@/services/analysisService';
import { Dashboard } from '@/components/dashboard/Dashboard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, Filler);

interface AnalysisResult {
  prediction: string;
  confidence: string | number;
  justification: string;
  frames?: string[];
  frame_probs?: number[][];
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    fill: boolean;
  }[];
}

interface Frame {
  url: string;
  timestamp: number;
}

type PageSection = 'home' | 'profile' | 'history' | 'dashboard';

const SpaceBackground = ({ theme }: { theme: 'dark' | 'light' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    opacity: number;
  }>>([]);

  // Initialize particles
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    const particleCount = Math.min(50, Math.floor((window.innerWidth * window.innerHeight) / 20000));
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.3
    }));

    // Animation function
    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particlesRef.current.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark' 
          ? `rgba(255, 255, 255, ${particle.opacity})`
          : `rgba(0, 0, 0, ${particle.opacity})`;
        ctx.fill();
      });

      // Draw connections
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(255, 255, 255, ${0.2 * (1 - distance / 100)})`
              : `rgba(0, 0, 0, ${0.2 * (1 - distance / 100)})`;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();
    setIsLoaded(true);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [theme]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          background: theme === 'dark'
            ? 'radial-gradient(circle at center, rgba(88, 28, 135, 0.15) 0%, rgba(17, 24, 39, 0.95) 100%)'
            : 'radial-gradient(circle at center, rgba(88, 28, 135, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)'
        }}
      />
      
      {/* Nebula Effect */}
      <div className="absolute inset-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background: theme === 'dark'
              ? 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(79, 70, 229, 0.1) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(79, 70, 229, 0.05) 50%, transparent 70%)'
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background: theme === 'dark'
              ? 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 50%, transparent 70%)'
          }}
        />
      </div>

      {/* Grid Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 0.2 : 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className={`absolute inset-0 ${
          theme === 'dark'
            ? 'bg-[linear-gradient(to_right,#4f46e5/5px_1px_transparent_1px),linear-gradient(to_bottom,#4f46e5/5px_1px_transparent_1px)]'
            : 'bg-[linear-gradient(to_right,#4f46e5/3px_1px_transparent_1px),linear-gradient(to_bottom,#4f46e5/3px_1px_transparent_1px)]'
        } bg-[size:14px_24px]`}
      />
    </div>
  );
};

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 origin-left z-50"
      style={{ scaleX }}
    />
  );
};

const LayerTransition = ({ children, className = "", index = 0 }: { children: React.ReactNode; className?: string; index?: number }) => {
  const { scrollYProgress } = useScroll({
    offset: ["start end", "end start"]
  });
  
  // Create a staggered effect based on section index
  const y = useTransform(scrollYProgress, [0, 1], [0, -50 * (index + 1)]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const zIndex = 10 - index; // Higher sections have lower z-index

  return (
    <motion.div
      style={{ 
        y,
        scale,
        opacity,
        zIndex
      }}
      className={`relative ${className}`}
      layout
      transition={{
        layout: { duration: 0.5, ease: "easeOut" }
      }}
    >
      {children}
    </motion.div>
  );
};

const SectionWrapper = ({ children, className = "" }: { children: React.ReactNode; className?: string; index?: number }) => {
  return (
    <div className={`relative min-h-screen ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-transparent" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default function Home() {
  const { user, loading } = useAuth();
  // State and refs for video upload/preview
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [displayedConfidence, setDisplayedConfidence] = useState<number>(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [showDownload, setShowDownload] = useState<boolean>(false);
  const [showFrames, setShowFrames] = useState<boolean>(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [allowTraining, setAllowTraining] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark'; // Default to dark on the server
  });
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const confidenceArcRef = useRef<SVGCircleElement>(null);
  const confidenceTextRef = useRef<SVGTextElement>(null);
  const [currentSection, setCurrentSection] = useState<PageSection>('home');
  const [isScrolled, setIsScrolled] = useState(false);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const CIRCLE_LEN = 2 * Math.PI * 52; // SVG circle length for gauge

  // Add state for modal
  const [showJustificationModal, setShowJustificationModal] = useState(false);

  const handleReset = () => {
    setVideoFile(null);
    setVideoURL('');
    setError('');
    setUploadProgress(0);
    setShowResult(false);
    setAnalysisResult(null);
    setFrames([]);
    setShowDownload(false);
    setShowFrames(false);
    setChartData(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // New function to handle the actual video analysis submission via XHR
  const submitVideoForAnalysis = async (file: File, allowTrainingPref: boolean) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    setShowResult(false);
    setAnalysisResult(null);
    setFrames([]);
    setShowDownload(false);
    setShowFrames(false);
    setChartData(null);

    const formData = new FormData();
    formData.append('video', file);
    // Add timestamp to ensure unique frame storage
    formData.append('timestamp', Date.now().toString());

    try {
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        xhr.open('POST', `${apiUrl}/upload`, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            if (progress === 100) {
              setIsUploading(false);
              setIsAnalyzing(true);
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error: Could not connect to the server'));
        };

        xhr.send(formData);
      });

      const data = JSON.parse(response as string);
      console.log('Parsed response:', data);

      if (data.error) {
        setError(data.error);
        setShowResult(false);
        return;
      }

      // Set the analysis result with proper formatting
      const analysisResult = {
        prediction: data.prediction || 'Unknown',
        confidence: data.confidence || '0%',
        justification: data.justification || 'No detailed analysis available.',
        frames: data.frames || [],
        frame_probs: data.frame_probs || []
      };
      setAnalysisResult(analysisResult);
      setShowResult(true);

      // Parse confidence as number - handle both string and number formats
      let conf = 0;
      if (typeof data.confidence === 'string') {
        // Remove % and convert to number
        conf = parseFloat(data.confidence.replace('%', ''));
      } else if (typeof data.confidence === 'number') {
        conf = data.confidence;
      }

      console.log('Parsed confidence:', conf);
      console.log('Prediction:', data.prediction);
      console.log('Justification:', data.justification);

      setConfidence(Math.max(0, Math.min(100, conf)));

      // Save analysis result to Firestore
      if (user) {
        try {
          await saveAnalysisResult({
            userId: user.uid,
            videoName: file.name,
            prediction: data.prediction,
            confidence: conf,
            justification: data.justification,
            frames: data.frames,
            frameProbs: data.frame_probs,
            allowTraining: allowTrainingPref
          });
          console.log('Analysis result saved to Firestore');
        } catch (error) {
          console.error('Error saving analysis result:', error);
        }
      }

      // Update frames handling with timestamp
      if (data.frames && Array.isArray(data.frames)) {
        // Clear any existing frames before setting new ones
        setFrames([]);
        // Set new frames with timestamp
        const timestampedFrames: Frame[] = data.frames.map((frame: string) => ({
          url: frame,
          timestamp: Date.now()
        }));
        setFrames(timestampedFrames);
        setShowFrames(data.frames.length > 0);
      }

      setShowDownload(true);

      // Prepare chart data if frame_probs exist
      if (data.frame_probs && Array.isArray(data.frame_probs)) {
        const chartData = {
          labels: data.frame_probs.map((_: number[], i: number) => `Frame ${i + 1}`),
          datasets: [
            {
              label: 'Confidence Score',
              data: data.frame_probs.map((probs: number[]) => Math.max(0, Math.min(100, probs[1] * 100))),
              borderColor: theme === 'dark' ? 'rgba(139, 92, 246, 1)' : 'rgba(124, 58, 237, 1)',
              backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(124, 58, 237, 0.2)',
              tension: 0.4,
              fill: true,
            },
          ],
        };
        console.log('Setting chart data:', chartData);
        setChartData(chartData);
      }

      // If training is allowed, store the video for training
      if (allowTrainingPref) {
        try {
          await new Promise((resolve, reject) => {
            const trainingXhr = new XMLHttpRequest();
            trainingXhr.open('POST', 'http://localhost:5001/store_for_training', true);
            trainingXhr.onload = () => {
              if (trainingXhr.status === 200) {
                resolve(trainingXhr.responseText);
              } else {
                reject(new Error(`Training storage failed: ${trainingXhr.status} ${trainingXhr.statusText}`));
              }
            };
            trainingXhr.onerror = () => {
              reject(new Error('Network error during training storage'));
            };
            trainingXhr.send(formData);
          });
          console.log('Video stored for training');
        } catch (error) {
          console.error('Error storing video for training:', error);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      setShowResult(false);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // Handle file selection and preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('⚠️ File size exceeds limit!');
      setVideoFile(null);
      setVideoURL('');
      setFrames([]);
      return;
    }
    setError('');
    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
    setShowResult(false);
    setAnalysisResult(null);
    setFrames([]);
    setShowDownload(false);
    setShowFrames(false);
  };

  // Handle form submit (upload video)
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!videoFile) return;
    // Initial state reset and then call the submission logic
    submitVideoForAnalysis(videoFile, allowTraining);
  };

  // Handle re-analyze button click
  const handleReanalyze = () => {
    if (!videoFile) return; // Button should be disabled if no file
    // Reset states and call the submission logic
    submitVideoForAnalysis(videoFile, allowTraining);
  };

  // Animate confidence gauge
  useEffect(() => {
    if (!showResult) {
      setDisplayedConfidence(0);
      return;
    }
    const start = 0;
    const end = confidence;
    const duration = 800;
    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(start + (end - start) * progress);
      setDisplayedConfidence(value);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }, [confidence, showResult]);

  // Effect to log analysisResult when it changes
  useEffect(() => {
    if (analysisResult) {
      console.log('AnalysisResult state updated:', analysisResult);
      console.log('Justification:', analysisResult.justification);
    }
  }, [analysisResult]); // Dependency array: runs when analysisResult changes

  // Update the handleDownloadReport function
  const handleDownloadReport = () => {
    if (!analysisResult) return;

    try {
      // Create new PDF document with proper initialization
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yOffset = 20;

      // Add header with logo
      doc.setFontSize(24);
      doc.setTextColor(139, 92, 246); // Purple color
      doc.text('DeepFake Analysis Report', pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 15;

      // Add timestamp
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 20;

      // Add result summary
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('Analysis Summary', 20, yOffset);
      yOffset += 15;

      // Add prediction with color
      doc.setFontSize(14);
      const predictionColor = analysisResult.prediction.toUpperCase() === 'FAKE' ? [220, 53, 69] : [40, 167, 69]; // Red for fake, green for real
      doc.setTextColor(predictionColor[0], predictionColor[1], predictionColor[2]);
      doc.text(`Prediction: ${analysisResult.prediction.toUpperCase()}`, 20, yOffset);
      yOffset += 15;

      // Add confidence score
      doc.setTextColor(0);
      doc.text(`Confidence Score: ${displayedConfidence}%`, 20, yOffset);
      yOffset += 20;

      // Add detailed analysis
      doc.setFontSize(16);
      doc.text('Detailed Analysis', 20, yOffset);
      yOffset += 15;

      // Add justification with proper wrapping
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(analysisResult.justification || 'No detailed analysis available.', pageWidth - 40);
      doc.text(splitText, 20, yOffset);
      yOffset += splitText.length * 7 + 20;

      // Add frame analysis if available
      if (analysisResult.frames && analysisResult.frames.length > 0) {
        // Check if we need a new page
        if (yOffset > pageHeight - 50) {
          doc.addPage();
          yOffset = 20;
        }

        doc.setFontSize(16);
        doc.text('Frame Analysis', 20, yOffset);
        yOffset += 15;

        // Create table for frame probabilities
        if (analysisResult.frame_probs && analysisResult.frame_probs.length > 0) {
          const tableData = analysisResult.frame_probs.map((probs, index) => [
            `Frame ${index + 1}`,
            `${(probs[0] * 100).toFixed(2)}%`,
            `${(probs[1] * 100).toFixed(2)}%`
          ]);

          autoTable(doc, {
            startY: yOffset,
            head: [['Frame', 'Real Probability', 'Fake Probability']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] },
            styles: { fontSize: 10 },
            margin: { left: 20 }
          });
        }
      }

      // Add footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          'Generated by DeepFake Detection System',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // Save the PDF
      doc.save('deepfake_analysis_report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  // Effect to apply theme class to body and save to localStorage when theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Apply theme class to body
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }

    // Save theme preference to localStorage
    localStorage.setItem('theme', theme);

  }, [theme]); // Depend on theme state so effect runs when theme changes

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Mobile menu state

  // Add this useEffect for frame cleanup
  useEffect(() => {
    // Cleanup function to clear frames when component unmounts or when video changes
    return () => {
      setFrames([]);
      setShowFrames(false);
    };
  }, [videoFile]); // Re-run when video file changes

  // Update the scroll handling
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      lastScrollY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Add smooth scroll behavior
          const currentScroll = window.scrollY;
          const targetScroll = lastScrollY;
          const diff = targetScroll - currentScroll;
          
          if (Math.abs(diff) > 1) {
            window.scrollTo(0, currentScroll + diff * 0.1);
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update the anchor link handling
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      
      if (anchor) {
        e.preventDefault();
        const targetId = anchor.getAttribute('href')?.slice(1);
        const targetElement = document.getElementById(targetId || '');
        
        if (targetElement) {
          const headerOffset = 80;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  // If still loading auth state, show loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Check if user is proceeding without login
  const proceedWithoutLogin = localStorage.getItem('proceedWithoutLogin') === 'true';

  // If not authenticated and not proceeding without login, show login form
  if (!user && !proceedWithoutLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-black">
        <LoginForm setCurrentSection={setCurrentSection} />
      </div>
    );
  }

  // If user is proceeding without login, ensure the flag is set
  if (!user && proceedWithoutLogin) {
    localStorage.setItem('proceedWithoutLogin', 'true');
  }

  return (
    <>
      {/* <Navbar /> */}
      <ScrollProgress />
      <header className={`w-full fixed top-0 z-50 transition-all duration-300 ${isScrolled ? `backdrop-blur-md ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200'} border-b shadow-lg` : 'border-b border-transparent'}`}>
        {/* Theme Toggle Button (Absolute Positioned to Header) */}
        <Button
          id="themeToggle"
          variant="outline"
          size="icon"
          className={`absolute top-4 left-4 rounded-full text-xl shadow-md transition-colors duration-300 ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20 border-white/20' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300'}`}
          aria-label="Toggle theme"
          onClick={handleThemeToggle}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </Button>

        <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Left side group: Logo */}
          <div className="flex items-center space-x-2 group">
            <a href="#home" className="flex items-center space-x-2 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold transition-transform duration-300 group-hover:rotate-12">AI</div> 
              <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text transition-opacity duration-300 group-hover:opacity-80">DeepFake AI</span>
            </a>
          </div>

          {/* Right side group: Navigation Links (Hidden on small screens) */}
          <nav className="hidden md:flex items-center space-x-2 ml-8">
            <button
              onClick={() => setCurrentSection('home')}
              className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 overflow-hidden group ${
                currentSection === 'home'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-transparent text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'bg-transparent text-black hover:text-white hover:bg-gray-700/50 drop-shadow'
              }`}
            >
              <span className="relative z-10">Home</span>
              {currentSection === 'home' && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gray-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button
              onClick={() => setCurrentSection('history')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group ${
                currentSection === 'history'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-transparent text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'bg-transparent text-black hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="relative z-10">History</span>
              {currentSection === 'history' && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gray-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button
              onClick={() => setCurrentSection('dashboard')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group ${
                currentSection === 'dashboard'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-transparent text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'bg-transparent text-black hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="relative z-10">Dashboard</span>
              {currentSection === 'dashboard' && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gray-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button
              onClick={() => setCurrentSection('profile')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group ${
                currentSection === 'profile'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-transparent text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'bg-transparent text-black hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="relative z-10">Profile</span>
              {currentSection === 'profile' && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gray-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            {/* Add the UserProfileDropdown at the rightmost */}
            <UserProfileDropdown />
          </nav>
        </nav>
      </header>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-black' : 'bg-gradient-to-b from-gray-50 via-gray-100 to-white'} overflow-x-hidden will-change-transform`}>
      
      
      <AnimatePresence mode="wait">
        {currentSection === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LayerTransition index={0}>
              <SectionWrapper index={0}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                  className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden"
                >
                  <SpaceBackground theme={theme} />
                  
                  {/* Parallax Stars */}
                  <div className="absolute inset-0">
                    {[...Array(50)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.3, 0.8, 0.3],
                        }}
                        transition={{
                          duration: 2 + Math.random() * 3,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text mb-8 leading-tight tracking-tight"
                    >
                      DeepFake Detection
                    </motion.h1>
                    <motion.p 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'} font-light max-w-2xl mx-auto mb-12`}
                    >
                      Advanced AI-powered video authentication system that helps you verify the authenticity of video content with high accuracy
                    </motion.p>

                    {/* Primary CTA Button */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                      className="flex justify-center gap-4"
                    >
                      <Button
                        onClick={() => document.getElementById('video-upload')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-red-600 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Start Analysis →
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open('https://en.wikipedia.org/wiki/Deepfake', '_blank')}
                        className={`px-8 py-4 text-lg font-semibold ${theme === 'dark' ? 'text-white border-white/20 hover:border-white/40' : 'text-gray-900 border-gray-300 hover:border-gray-400'} transition-all duration-300 rounded-xl`}
                      >
                        Learn More
                      </Button>
                    </motion.div>

                    {/* Scroll down indicator */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                      className="mt-20 flex flex-col items-center cursor-pointer group"
                      onClick={() => document.getElementById('video-upload')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-700'} text-lg font-medium mb-3 group-hover:${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors`}>Scroll to Analyze</p>
                      <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-purple-400 group-hover:text-purple-500' : 'text-purple-600 group-hover:text-purple-700'} transition-colors animate-bounce`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                    </motion.div>
                  </div>
                </motion.div>
              </SectionWrapper>
            </LayerTransition>

            <LayerTransition index={1}>
              <SectionWrapper index={1}>
                <motion.section
                  id="video-upload"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="py-24 px-4 relative"
                >
                  <div className="max-w-4xl mx-auto">
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                      className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text"
                    >
                      Upload Your Video
                    </motion.h2>
                    
                    <div className={`upload-container ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-3xl p-8 md:p-12 mx-auto text-center relative border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} shadow-2xl`}>
                      {(isUploading || isAnalyzing) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`loader-container absolute inset-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-10 p-6`}
                        >
                          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-xl font-semibold mb-4`}>{isUploading ? 'Uploading...' : 'Analyzing Video...'}</p>
                          {isUploading && (
                            <div className={`w-full max-w-xs h-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.3 }}
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              ></motion.div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      <AnimatePresence mode="wait">
                        {!(showResult || isAnalyzing || isUploading) && (
                          <motion.form
                            key="upload-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            onSubmit={handleFormSubmit}
                            className="flex flex-col items-center gap-8"
                          >
                            <div className="w-full max-w-lg">
                              <label 
                                htmlFor="videoFile" 
                                className={`block w-full p-12 border-2 border-dashed ${theme === 'dark' ? 'border-white/20 hover:border-purple-500' : 'border-gray-300 hover:border-purple-500'} rounded-2xl cursor-pointer transition-colors group hover:bg-gradient-to-b ${theme === 'dark' ? 'from-white/5 to-transparent' : 'from-gray-50 to-transparent'}`}
                              >
                                <div className="flex flex-col items-center justify-center space-y-6">
                                  <div className={`w-20 h-20 rounded-full ${theme === 'dark' ? 'bg-purple-500/10 group-hover:bg-purple-500/20' : 'bg-purple-500/5 group-hover:bg-purple-500/10'} flex items-center justify-center transition-colors`}>
                                    <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                  </div>
                                  <div className="text-center">
                                    <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-xl font-medium`}>Drop your video here</p>
                                    <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'} text-sm mt-2`}>or click to browse</p>
                                    <p className={`${theme === 'dark' ? 'text-white/40' : 'text-gray-500'} text-xs mt-3`}>Max file size: 100MB</p>
                                  </div>
                                </div>
                              </label>
                              <input
                                type="file"
                                id="videoFile"
                                accept="video/*"
                                required
                                ref={videoInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              
                              {/* Training opt-in checkbox */}
                              <div className="mt-6 flex items-center justify-center">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={allowTraining}
                                    onChange={(e) => setAllowTraining(e.target.checked)}
                                    className={`w-5 h-5 rounded ${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-300'} border-2 focus:ring-purple-500 transition-colors group-hover:border-purple-500`}
                                  />
                                  <span className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'} group-hover:${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors`}>
                                    Allow this video to be used for improving the model
                                  </span>
                                </label>
                              </div>
                            </div>

                            {error && (
                              <motion.p 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-400 font-medium"
                              >
                                {error}
                              </motion.p>
                            )}

                            {videoURL && !isUploading && !isAnalyzing && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-[480px] h-[270px] max-w-full mx-auto bg-black rounded-xl shadow-lg overflow-hidden"
                              >
                                <video
                                  ref={videoPreviewRef}
                                  src={videoURL}
                                  controls
                                  className="w-full h-full object-contain"
                                  onError={() => setError('Error loading video preview')}
                                />
                              </motion.div>
                            )}

                            {/* Buttons: Analyze Now and Re-analyze */}
                            <div className="flex flex-wrap justify-center gap-4 mt-8">
                              <Button
                                type="submit"
                                disabled={isUploading || isAnalyzing || !videoFile}
                                className="px-12 py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-red-600 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl"
                              >
                                {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing...' : 'Analyze Now →'}
                              </Button>

                              {videoFile && !isUploading && !isAnalyzing && (
                                <Button
                                  onClick={handleReanalyze}
                                  disabled={!videoFile || isUploading || isAnalyzing}
                                  className={`px-8 py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'} transition-colors duration-300 transform hover:scale-105 rounded-xl focus:outline-none focus:ring-2 ${theme === 'dark' ? 'focus:ring-white/50' : 'focus:ring-gray-400'}`}
                                >
                                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.582m-15.356-2A8.001 8.001 0 0119.418 15m0 0H15"></path></svg>
                                  Re-analyze
                                </Button>
                              )}
                            </div>
                          </motion.form>
                        )}

                        {showResult && !isAnalyzing && !isUploading && (
                          <>
                            <motion.div
                              key="result-section"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.4 }}
                              className={`result-container ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-4xl mx-auto`}
                            >
                              <div className={`result-summary flex flex-col md:flex-row items-start justify-between gap-8 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} relative`}>
                                {/* Left side - Result and Justification */}
                                <div className="result-left flex flex-col items-start flex-grow min-w-0">
                                  <div className="text-left mb-4">
                                    {analysisResult && (
                                      <motion.p 
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`text-2xl sm:text-3xl font-bold ${analysisResult.prediction.toUpperCase() === 'FAKE' ? 'text-red-400' : 'text-green-400'}`}
                                      >
                                        {analysisResult.prediction.toUpperCase() === 'FAKE' ? '⚠️ This video appears to be FAKE' : '✅ This video appears to be REAL'}
                                      </motion.p>
                                    )}
                                  </div>
                                  <div className={`${theme === 'dark' ? 'bg-black/40' : 'bg-white'} rounded-xl p-4 w-full`}>
                                    {analysisResult && (
                                      <div className="flex items-center justify-center">
                                        <Button
                                          onClick={() => setShowJustificationModal(true)}
                                          className={`text-sm px-4 py-2 ${theme === 'dark' ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'} rounded-lg transition-colors flex items-center gap-2`}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          View Details
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right side - Confidence Gauge */}
                                <div className="result-right flex flex-col items-center justify-center min-w-[160px] sm:min-w-[180px]">
                                  <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold mb-4 text-center text-base sm:text-lg`}>Confidence:</p>
                                  <div className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]">
                                    <svg className="w-full h-full" viewBox="0 0 120 120">
                                      <circle cx="60" cy="60" r="52" stroke={theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeWidth="12" fill="none"/>
                                      <motion.circle
                                        ref={confidenceArcRef}
                                        cx="60"
                                        cy="60"
                                        r="52"
                                        stroke="url(#gradient)"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray={CIRCLE_LEN}
                                        strokeDashoffset={CIRCLE_LEN - (CIRCLE_LEN * displayedConfidence / 100)}
                                        transform="rotate(-90 60 60)"
                                        initial={{ strokeDashoffset: CIRCLE_LEN }}
                                        animate={{ strokeDashoffset: CIRCLE_LEN - (CIRCLE_LEN * displayedConfidence / 100) }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                      />
                                      <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#8B5CF6" />
                                          <stop offset="50%" stopColor="#EC4899" />
                                          <stop offset="100%" stopColor="#EF4444" />
                                        </linearGradient>
                                      </defs>
                                      <motion.text
                                        ref={confidenceTextRef}
                                        x="60"
                                        y="68"
                                        textAnchor="middle"
                                        fontSize="24"
                                        fill={theme === 'dark' ? "white" : "#1F2937"}
                                        fontWeight="bold"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.8 }}
                                      >
                                        {displayedConfidence}%
                                      </motion.text>
                                    </svg>
                                  </div>
                                  <div className={`${theme === 'dark' ? 'text-white/80' : 'text-gray-600'} font-medium mt-4 text-center text-sm sm:text-base`}>Confidence Score</div>
                                </div>

                                {/* Justification Modal */}
                                <AnimatePresence>
                                  {showJustificationModal && (
                                    <>
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 rounded-2xl"
                                        onClick={() => setShowJustificationModal(false)}
                                      />
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl p-6 rounded-2xl z-50 ${
                                          theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                                        } shadow-2xl`}
                                      >
                                        <div className="flex justify-between items-center mb-6">
                                          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            Analysis Details
                                          </h3>
                                          <Button
                                            onClick={() => setShowJustificationModal(false)}
                                            className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                                          >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </Button>
                                        </div>
                                        <div className={`${theme === 'dark' ? 'text-white/90' : 'text-gray-700'} text-base leading-relaxed`}>
                                          {analysisResult?.justification || 'No detailed analysis available.'}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>

                            {/* Action Buttons - Keep them in the same place */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: 0.2 }}
                              className="flex flex-wrap justify-center gap-4 mt-6 max-w-3xl mx-auto"
                            >
                              <Button
                                onClick={handleReset}
                                className={`px-6 py-3 ${theme === 'dark' ? 'text-white bg-white/10 hover:bg-white/20' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'} font-semibold transition-colors duration-300 rounded-xl`}
                              >
                                Analyze Another Video
                              </Button>
                              {showDownload && (
                                <Button
                                  onClick={handleDownloadReport}
                                  className="px-6 py-3 text-white font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 transition-all duration-300 rounded-xl"
                                >
                                  ⬇️ Download Detailed Report
                                </Button>
                              )}
                              {showResult && (
                                <Button
                                  onClick={() => {
                                    if (navigator.share) {
                                      navigator.share({
                                        title: 'DeepFake Analysis Results',
                                        text: `This video appears to be ${analysisResult?.prediction} with ${displayedConfidence}% confidence.`,
                                        url: window.location.href
                                      }).catch(console.error);
                                    } else {
                                      navigator.clipboard.writeText(window.location.href);
                                      alert('Link copied to clipboard!');
                                    }
                                  }}
                                  className="px-6 py-3 text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 rounded-xl"
                                >
                                  <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                  </svg>
                                  Share Results
                                </Button>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.section>
              </SectionWrapper>
            </LayerTransition>

            {/* Confidence Over Frames Chart Section (Moved) */}
            {(showResult && chartData) && (
              <LayerTransition index={2}>
                <SectionWrapper index={2}>
                  <motion.section
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="py-10 px-4 relative"
                  >
                    <div className="max-w-4xl mx-auto">
                       <h4 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6 text-center`}>Confidence Over Frames</h4>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className={`mt-4 p-6 rounded-2xl ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} shadow-inner h-[350px]`}
                        >
                          <Line
                            data={chartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                x: {
                                  title: {
                                    display: true,
                                    text: 'Frame',
                                    color: theme === 'dark' ? '#cccccc' : '#666666',
                                  },
                                  ticks: {
                                    color: theme === 'dark' ? '#999999' : '#555555',
                                  },
                                  grid: {
                                    color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                  }
                                },
                                y: {
                                  title: {
                                    display: true,
                                    text: 'Confidence (%)',
                                    color: theme === 'dark' ? '#cccccc' : '#666666',
                                  },
                                  min: 0,
                                  max: 100,
                                  ticks: {
                                    color: theme === 'dark' ? '#999999' : '#555555',
                                  },
                                  grid: {
                                    color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                  }
                                },
                              },
                              plugins: {
                                legend: {
                                  labels: {
                                    color: theme === 'dark' ? '#cccccc' : '#666666',
                                  },
                                },
                                tooltip: {
                                  backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                                  bodyColor: theme === 'dark' ? '#ffffff' : '#333333',
                                  titleColor: theme === 'dark' ? '#ffffff' : '#333333',
                                }
                              }
                            }}
                          />
                        </motion.div>
                    </div>
                  </motion.section>
                </SectionWrapper>
              </LayerTransition>
            )}

            {(showResult && showFrames) && (
              <LayerTransition index={3}>
                <SectionWrapper index={3}>
                  <motion.section
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.8 }}
                    className="py-16 px-4 relative"
                  >
                    <div className="max-w-7xl mx-auto">
                      <h4 className={`text-3xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Extracted Frames</h4>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${videoFile?.name}-${Date.now()}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`frame-display-container flex space-x-6 overflow-x-auto p-4 w-full justify-start ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-3xl border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} shadow-2xl scroll-smooth pb-6`}
                        >
                          {frames.map((frame: Frame, idx: number) => (
                            <motion.div
                              key={`${frame.timestamp}-${idx}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.4, delay: idx * 0.1 }}
                              className="relative group"
                            >
                              <Image
                                src={`/static/frames/${frame.url.split('/').pop()}?t=${frame.timestamp}`}
                                alt={`Extracted Frame ${idx + 1}`}
                                width={256}
                                height={144}
                                className={`object-cover rounded-xl shadow-lg border-2 border-transparent transition-all duration-300 group-hover:scale-105 group-hover:border-purple-500 cursor-pointer`}
                              />
                              <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black/60' : 'from-gray-900/60'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end justify-center p-4`}>
                                <span className="text-white text-sm font-medium">Frame {idx + 1}</span>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.section>
                </SectionWrapper>
              </LayerTransition>
            )}

            <LayerTransition index={4}>
              <SectionWrapper index={4}>
                <motion.section
                  id="features"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="py-24 px-4 relative"
                >
                  <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">Core Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {[
                        {
                          icon: "🎯",
                          title: "Frame-wise Analysis",
                          description: "Advanced landmark detection for precise frame-by-frame analysis"
                        },
                        {
                          icon: "🤖",
                          title: "Classification",
                          description: "State-of-the-art machine learning algorithms for accurate detection"
                        },
                        {
                          icon: "📊",
                          title: "Confidence Scoring",
                          description: "Real-time confidence scores with detailed analysis"
                        },
                        {
                          icon: "⚡",
                          title: "Fast Processing",
                          description: "Quick analysis with minimal waiting time"
                        }
                      ].map((feature, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                          viewport={{ once: true }}
                          className={`feature-card group ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl p-8 rounded-2xl text-center border ${theme === 'dark' ? 'border-white/10 hover:border-purple-500/50' : 'border-gray-200 hover:border-purple-500/50'} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                        >
                          <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 group-hover:text-purple-500 transition-colors`}>{feature.title}</h3>
                            <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-600'} leading-relaxed group-hover:${theme === 'dark' ? 'text-white/90' : 'text-gray-700'} transition-colors`}>{feature.description}</p>
                          </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              </SectionWrapper>
            </LayerTransition>

            <LayerTransition index={5}>
              <SectionWrapper index={5}>
                <motion.section
                  id="how-it-works"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="py-24 px-4 relative"
                >
                  <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">How It Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                        {
                          number: "1",
                          title: "Upload Video",
                          description: "Select and upload your video file (max 100MB)"
                        },
                        {
                          number: "2",
                          title: "AI Analysis",
                          description: "Our AI processes each frame for deepfake detection"
                        },
                        {
                          number: "3",
                          title: "Get Results",
                          description: "Receive detailed analysis with confidence scores"
                        }
                      ].map((step, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                          viewport={{ once: true }}
                          className={`step group ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl p-8 rounded-2xl text-center border ${theme === 'dark' ? 'border-white/10 hover:border-purple-500/50' : 'border-gray-200 hover:border-purple-500/50'} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                        >
                          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                            {step.number}
                          </div>
                          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 group-hover:text-purple-500 transition-colors`}>{step.title}</h3>
                          <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-600'} leading-relaxed group-hover:${theme === 'dark' ? 'text-white/90' : 'text-gray-700'} transition-colors`}>{step.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              </SectionWrapper>
            </LayerTransition>

            <LayerTransition index={6}>
              <SectionWrapper index={6}>
                <motion.section
                  id="about"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="py-16 px-4 relative"
                >
                  <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-12 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">About DeepFake Detection</h2>
                    <div className={`about-content ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl p-8 md:p-12 rounded-3xl border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} shadow-2xl max-w-4xl mx-auto text-left`}>
                      <p className={`${theme === 'dark' ? 'text-white/80' : 'text-gray-700'} text-lg leading-relaxed mb-6`}>
                        Welcome to DeepFake Detection, your trusted AI-powered platform for verifying the authenticity of video content. In an era where digital manipulation is increasingly sophisticated, our tool provides a crucial layer of defense against the spread of misinformation.
                      </p>
                      <p className={`${theme === 'dark' ? 'text-white/80' : 'text-gray-700'} text-lg leading-relaxed mb-6`}>
                        Our system utilizes advanced machine learning models and computer vision techniques, including facial landmark analysis, to meticulously examine each frame of a video. By identifying subtle inconsistencies and anomalies often imperceptible to the human eye, we can assess the likelihood of manipulation and provide a clear, confidence-scored result.
                      </p>
                      <p className={`${theme === 'dark' ? 'text-white/80' : 'text-gray-700'} text-lg leading-relaxed`}>
                        Our mission is to empower individuals, journalists, and organizations with the tools needed to combat the challenges posed by deepfakes and ensure a more trustworthy digital landscape. We are committed to continuous research and development to stay ahead of evolving manipulation techniques.
                      </p>
                    </div>
                     {/* Placeholder Call to Action in About section */}
                     <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        viewport={{ once: true }}
                        className="mt-12"
                      >
                        <Button
                          onClick={() => window.open('https://en.wikipedia.org/wiki/Deepfake', '_blank')}
                          className="px-8 py-3 text-white font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 rounded-xl"
                        >
                          Learn More About Deepfakes
                        </Button>
                      </motion.div>
                  </div>
                </motion.section>
              </SectionWrapper>
            </LayerTransition>
          </motion.div>
        )}

        {currentSection === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-24"
          >
            <UserProfile />
          </motion.div>
        )}

        {currentSection === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-24"
          >
            <AnalysisHistory />
          </motion.div>
        )}

        {currentSection === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-24"
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className={`py-12 px-4 relative border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">DeepFake AI</span>
          </div>
          <div className={`flex flex-wrap justify-center gap-6 ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
            <a href="#privacy" className={`hover:${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors`}>Privacy Policy</a>
            <a href="#terms" className={`hover:${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors`}>Terms of Service</a>
            <a href="#contact" className={`hover:${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors`}>Contact</a>
          </div>
          <p className={`${theme === 'dark' ? 'text-white/40' : 'text-gray-500'} text-sm`}>&copy; 2025 DeepFake Detection. All rights reserved.</p>
        </div>
      </motion.footer>
    </div>
    </>
  );
}
