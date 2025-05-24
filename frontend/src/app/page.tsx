'use client'

import './globals.css';
import Image from "next/image";
import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title as ChartTitle, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, Filler);

interface AnalysisResult {
  prediction: string;
  confidence: string | number;
  justification: string;
  frames?: string[];
  [key: string]: any;
}

export default function Home() {
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
  const [frames, setFrames] = useState<string[]>([]);
  const [showDownload, setShowDownload] = useState<boolean>(false);
  const [showFrames, setShowFrames] = useState<boolean>(false);
  const [chartData, setChartData] = useState<any>(null); // State for chart data
  const [allowTraining, setAllowTraining] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false); // State for share modal
  // Initialize theme state by reading from localStorage on the client side
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

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const CIRCLE_LEN = 2 * Math.PI * 52; // SVG circle length for gauge

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
    setChartData(null); // Clear chart data on reset
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // New function to handle the actual video analysis submission via XHR
  const submitVideoForAnalysis = (file: File, allowTrainingPref: boolean) => {
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
    const xhr = new XMLHttpRequest();

    // Choose endpoint based on training preference
    const endpoint = allowTrainingPref ? 'http://localhost:5001/store_for_training' : 'http://localhost:5001/upload';
    xhr.open('POST', endpoint, true);

    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        setUploadProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = function () {
      setIsUploading(false);
      setIsAnalyzing(true); // Set analyzing true while processing response
      console.log('XHR status:', xhr.status);
      if (xhr.status === 200) {
        console.log('Status 200 received.');
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('Raw responseText:', xhr.responseText); // Log raw response
          console.log('Analysis response:', data);
          console.log('Justification from parsed data:', data.justification); // Log justification from parsed data
          setAnalysisResult(data);
          console.log('AnalysisResult state set:', data);
          setShowResult(true);
          console.log('setShowResult(true) called.');
          setIsAnalyzing(false); // Analysis is complete
          // Parse confidence as number
          let conf = 0;
          if (typeof data.confidence === 'string') {
            conf = parseFloat(data.confidence.replace('%', ''));
          } else {
            conf = data.confidence;
          }
          setConfidence(Math.max(0, Math.min(100, conf)));
          setFrames(data.frames || []);
          setShowDownload(true);
          setShowFrames(data.frames && data.frames.length > 0);

          // Prepare chart data if frame_probs exist
          console.log('Checking for frame_probs:', data.frame_probs);
          console.log('Is frame_probs an array?', Array.isArray(data.frame_probs));

          if (data.frame_probs && Array.isArray(data.frame_probs)) {
            setChartData({
              labels: data.frame_probs.map((_: any, i: number) => `Frame ${i + 1}`),
              datasets: [
                {
                  label: 'Confidence Score',
                  data: data.frame_probs.map((c: number[]) => Math.max(0, Math.min(100, c[1] * 100))),
                  borderColor: theme === 'dark' ? 'rgba(139, 92, 246, 1)' : 'rgba(124, 58, 237, 1)',
                  backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(124, 58, 237, 0.2)',
                  tension: 0.4,
                  fill: true,
                },
              ],
            });
          } else {
            setChartData(null);
          }

        } catch (err) {
          console.error('Error parsing response:', err);
          console.error('Raw response:', xhr.responseText);
          setError('Error parsing analysis result: ' + (err instanceof Error ? err.message : String(err)));
          setShowResult(false);
          setIsAnalyzing(false); // Analysis is complete
        }
      } else {
        console.error('Server error:', xhr.status, xhr.statusText);
        console.error('Response:', xhr.responseText);
        setError(`Error analyzing video: ${xhr.status} ${xhr.statusText}`);
        setShowResult(false);
        setIsAnalyzing(false); // Analysis is complete
      }
    };

    xhr.onerror = function (e) {
      console.error('Network error:', e);
      setIsUploading(false);
      setIsAnalyzing(false); // Analysis is complete
      setError('Network error: Could not connect to the server. Please make sure the backend is running on http://localhost:5000');
    };

    xhr.send(formData);
  };

  // Handle file selection and preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('⚠️ File size exceeds limit!');
      setVideoFile(null);
      setVideoURL('');
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
    let start = 0;
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

  // Download report (dummy for now)
  const handleDownloadReport = () => {
    if (!analysisResult) return;
    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deepfake_report.json';
    a.click();
    URL.revokeObjectURL(url);
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

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-black' : 'bg-gradient-to-b from-gray-50 via-gray-100 to-white'}`}>
      <header className={`w-full fixed top-0 z-50 backdrop-blur-md ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200'} border-b sticky top-0 shadow-lg`}>
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
          <div className="flex items-center space-x-3 group">
            <a href="#home" className="flex items-center space-x-3 group">
              {/* Updated placeholder for the logo */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm sm:text-lg font-bold transition-transform duration-300 group-hover:rotate-12">AI</div> 
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text transition-opacity duration-300 group-hover:opacity-80">DeepFake AI</span>
            </a>
          </div>

          {/* Hamburger Icon (Visible on small screens) */}
          <div className="md:hidden absolute top-4 right-4">
            <Button
              variant="outline"
              size="icon"
              aria-label="Open menu"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`rounded-md text-xl ${theme === 'dark' ? 'text-white/80 hover:text-white border-white/20' : 'text-gray-600 hover:text-gray-900 border-gray-300'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </Button>
          </div>

          {/* Right side group: Navigation Links (Hidden on small screens) */}
          <ul className="hidden md:flex space-x-8 ml-8">
            <li><a href="#home" onClick={() => setIsMobileMenuOpen(false)} className={`${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors text-base sm:text-lg font-medium`}>Home</a></li>
            <li><a href="#features" onClick={() => setIsMobileMenuOpen(false)} className={`${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors text-base sm:text-lg font-medium`}>Features</a></li>
            <li><a href="#about" onClick={() => setIsMobileMenuOpen(false)} className={`${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors text-base sm:text-lg font-medium`}>About</a></li>
          </ul>
        </nav>
      </header>

      {/* Mobile Menu Overlay and Panel */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          ></motion.div>
        )}
      </AnimatePresence>

       <AnimatePresence>
        {isMobileMenuOpen && (
           <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`fixed top-0 right-0 w-64 h-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg z-50 p-6 flex flex-col`}
           >
             <div className="flex justify-end mb-6">
               <Button
                 variant="outline"
                 size="icon"
                 aria-label="Close menu"
                 onClick={() => setIsMobileMenuOpen(false)}
                 className={`rounded-md text-xl ${theme === 'dark' ? 'text-white/80 hover:text-white border-white/20' : 'text-gray-600 hover:text-gray-900 border-gray-300'}`}
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </Button>
             </div>
             <nav className="flex flex-col space-y-4">
                <a href="#home" onClick={() => setIsMobileMenuOpen(false)} className={`${theme === 'dark' ? 'text-white hover:text-purple-400' : 'text-gray-800 hover:text-purple-600'} text-lg font-medium transition-colors`}>Home</a>
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className={`${theme === 'dark' ? 'text-white hover:text-purple-400' : 'text-gray-800 hover:text-purple-600'} text-lg font-medium transition-colors`}>Features</a>
                <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className={`${theme === 'dark' ? 'text-white hover:text-purple-400' : 'text-gray-800 hover:text-purple-600'} text-lg font-medium transition-colors`}>About</a>
                {/* Add more navigation links here if needed */}
             </nav>
             {/* You can add other items here, like the theme toggle if desired */}
           </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className={`hero-section relative min-h-screen flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent' : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent'}`}
      >
        {/* Animated background elements */}
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[linear-gradient(to_right,#4f46e5/10px_1px_transparent_1px),linear-gradient(to_bottom,#4f46e5/10px_1px_transparent_1px)]' : 'bg-[linear-gradient(to_right,#4f46e5/5px_1px_transparent_1px),linear-gradient(to_bottom,#4f46e5/5px_1px_transparent_1px)]'} bg-[size:14px_24px]`}></div>
        
        <div className="relative z-10 text-center px-4">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-7xl md:text-8xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text mb-6 leading-tight"
          >
            DeepFake Detection
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className={`text-xl md:text-2xl ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'} font-light max-w-2xl mx-auto`}
          >
            Advanced AI-powered video authentication system
          </motion.p>

          {/* Scroll down indicator */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-20 flex flex-col items-center cursor-pointer group"
            onClick={() => document.getElementById('video-upload')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-700'} text-lg font-medium mb-3 group-hover:${theme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors`}>Analyze Your Video</p>
            <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-purple-400 group-hover:text-purple-500' : 'text-purple-600 group-hover:text-purple-700'} transition-colors animate-bounce`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </motion.div>
        </div>
      </motion.div>

      <motion.section
        id="video-upload"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="py-16 px-4 relative"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text"
          >
            Analyze Your Video
          </motion.h2>
          
          <div className={`upload-container ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-3xl p-8 md:p-10 mx-auto text-center relative border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} shadow-2xl`}>
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
                      className={`block w-full p-8 border-2 border-dashed ${theme === 'dark' ? 'border-white/20 hover:border-purple-500' : 'border-gray-300 hover:border-purple-500'} rounded-2xl cursor-pointer transition-colors group`}
                    >
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className={`w-16 h-16 rounded-full ${theme === 'dark' ? 'bg-purple-500/10 group-hover:bg-purple-500/20' : 'bg-purple-500/5 group-hover:bg-purple-500/10'} flex items-center justify-center transition-colors`}>
                          <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-lg font-medium`}>Drop your video here</p>
                          <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'} text-sm mt-1`}>or click to browse</p>
                          <p className={`${theme === 'dark' ? 'text-white/40' : 'text-gray-500'} text-xs mt-2`}>Max file size: 100MB</p>
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
                    <div className="mt-4 flex items-center justify-center">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowTraining}
                          onChange={(e) => setAllowTraining(e.target.checked)}
                          className={`w-4 h-4 rounded ${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-300'} border-2 focus:ring-purple-500`}
                        />
                        <span className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'}`}>
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
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    <Button
                      type="submit"
                      disabled={isUploading || isAnalyzing || !videoFile}
                      className="px-12 py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 rounded-xl"
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
                <motion.div
                  key="result-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className={`result-container ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-3xl mx-auto`}
                >
                  <div className={`result-summary flex flex-col md:flex-row items-start justify-center gap-4 sm:gap-8 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="result-left flex flex-col items-start min-w-0 flex-grow">
                      <div className="text-left mb-4 sm:mb-6">
                        {analysisResult && (
                          <motion.p 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-2xl sm:text-3xl font-bold ${analysisResult.prediction === 'FAKE' ? 'text-red-400' : 'text-green-400'}`}
                          >
                            {analysisResult.prediction === 'FAKE' ? '⚠️ This video appears to be FAKE' : '✅ This video appears to be REAL'}
                          </motion.p>
                        )}
                      </div>
                      <div className={`${theme === 'dark' ? 'bg-black/40' : 'bg-white'} rounded-xl p-4 sm:p-6 w-full`}>
                        {analysisResult && (
                          <>
                            <h4 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3 sm:mb-4`}>Analysis Details:</h4>
                            <p className={`${theme === 'dark' ? 'text-white/90' : 'text-gray-700'} text-sm sm:text-base leading-relaxed`}>
                              {analysisResult.justification || 'No detailed analysis available.'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="result-right flex flex-col items-center justify-start min-w-[120px] sm:min-w-[140px] mt-4 md:mt-0">
                      <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold mb-3 sm:mb-4 text-center text-base sm:text-lg`}>Confidence:</p>
                      <div className="relative w-[120px] h-[120px] sm:w-[140px] sm:h-[140px]">
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
                            fontSize="20"
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
                      <div className={`${theme === 'dark' ? 'text-white/80' : 'text-gray-600'} font-medium mt-3 sm:mt-4 text-center text-sm sm:text-base`}>Confidence Score</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 sm:gap-4 px-2">
                    <Button
                      onClick={handleReset}
                      className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 ${theme === 'dark' ? 'text-white bg-white/10 hover:bg-white/20' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'} font-semibold transition-colors duration-300 rounded-xl text-sm sm:text-base`}
                    >
                      Analyze Another Video
                    </Button>
                    {showDownload && (
                      <Button
                        onClick={handleDownloadReport}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 transition-all duration-300 rounded-xl text-sm sm:text-base"
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
                            // Fallback for browsers that don't support Web Share API
                            navigator.clipboard.writeText(window.location.href);
                            alert('Link copied to clipboard!');
                          }
                        }}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 rounded-xl text-sm sm:text-base"
                      >
                        <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share Results
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Confidence Over Frames Chart Section (Moved) */}
      {(showResult && chartData) && (
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
      )}

      {(showResult && showFrames) && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="py-16 px-4 relative"
        >
          <div className="max-w-7xl mx-auto">
            <h4 className={`text-3xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Extracted Frames</h4>
            <div className={`frame-display-container flex space-x-6 overflow-x-auto p-4 w-full justify-start ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-3xl border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} shadow-2xl scroll-smooth pb-6`}>
              <AnimatePresence>
                {frames.map((url, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="relative group"
                  >
                    <img
                      src={`/static/frames/${url.split('/').pop()}`}
                      alt={`Extracted Frame ${idx + 1}`}
                      className={`w-64 h-36 object-cover rounded-xl shadow-lg border-2 border-transparent transition-all duration-300 group-hover:scale-105 group-hover:border-purple-500 cursor-pointer`}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black/60' : 'from-gray-900/60'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end justify-center p-4`}>
                      <span className="text-white text-sm font-medium">Frame {idx + 1}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>
      )}

      <motion.section
        id="features"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="py-16 px-4 relative"
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
                className={`feature-card ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl p-8 rounded-2xl text-center border ${theme === 'dark' ? 'border-white/10 hover:border-purple-500/50' : 'border-gray-200 hover:border-purple-500/50'} transition-colors duration-300`}
              >
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>{feature.title}</h3>
                <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-600'} leading-relaxed`}>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        id="how-it-works"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="py-16 px-4 relative"
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
                className={`step ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl p-8 rounded-2xl text-center border ${theme === 'dark' ? 'border-white/10 hover:border-purple-500/50' : 'border-gray-200 hover:border-purple-500/50'} transition-colors duration-300`}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                  {step.number}
                </div>
                <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>{step.title}</h3>
                <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-600'} leading-relaxed`}>{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* About Section */}
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
  );
}
