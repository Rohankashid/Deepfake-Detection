'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"; // Assuming you want to reuse the Button component

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  theme: 'dark' | 'light';
  analysisResult: any; // Pass the analysis result to generate text
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  theme,
  analysisResult,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const shareText = analysisResult 
    ? `Check out this deepfake analysis result: This video appears to be ${analysisResult?.prediction} with ${analysisResult?.confidence} confidence. Analyze your own videos here: ${shareUrl}`
    : `Check out this deepfake analysis tool: ${shareUrl}`;

  // Basic social share links (can be expanded) - using dummy placeholders for now
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
  const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('DeepFake Analysis')}&summary=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/70' : 'bg-gray-900/70'} backdrop-blur-sm`}
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className={`relative ${theme === 'dark' ? 'bg-black/60' : 'bg-white/60'} backdrop-blur-xl rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-lg border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} text-center`}>
        <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Share Analysis Results</h3>

        {/* Share Link */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className={`flex-grow px-3 py-2 rounded-md ${theme === 'dark' ? 'bg-white/10 text-white/90 border-white/20' : 'bg-gray-100 text-gray-800 border-gray-300'} border outline-none focus:border-purple-500 text-sm`}
          />
          <Button
            onClick={handleCopy}
            className={`px-4 py-2 text-sm font-semibold ${theme === 'dark' ? 'text-white bg-white/10 hover:bg-white/20' : 'text-gray-900 bg-gray-200 hover:bg-gray-300'} transition-colors rounded-md`}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>

        {/* Share Options */}
        <div className="flex justify-center gap-4">
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className={`text-2xl ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`} aria-label="Share on Twitter">
          🐦
          </a>
           <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={`text-2xl ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`} aria-label="Share on Facebook">
          📘
          </a>
           <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className={`text-2xl ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`} aria-label="Share on LinkedIn">
          👔
          </a>
          {/* Add more social icons/links as needed */}
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          className={`absolute top-3 right-3 rounded-md ${theme === 'dark' ? 'text-white/80 hover:text-white border-white/20' : 'text-gray-600 hover:text-gray-900 border-gray-300'}`} size="icon" variant="outline"
          aria-label="Close modal"
        >
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </Button>
      </div>
    </div>
  );
};

export default ShareModal; 