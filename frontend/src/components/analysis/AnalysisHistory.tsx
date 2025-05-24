import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAnalysisHistory, AnalysisResult, deleteAnalysisResult } from '@/services/analysisService';
import { Timestamp } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalysisRecord extends AnalysisResult {
  thumbnail: string;
  date: string;
}

export const AnalysisHistory = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setHistory([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const results = await getUserAnalysisHistory(user.uid);
        
        // Transform the results to include thumbnails and formatted date
        const transformedResults = results.map(result => {
          const timestamp = result.timestamp instanceof Timestamp ? result.timestamp.toMillis() : new Date(result.timestamp).getTime();
          return {
            ...result,
            thumbnail: result.frames?.[0] 
              ? `/static/frames/${result.frames[0].split('/').pop()}?t=${timestamp}` 
              : '/static/frames/default.jpg',
            date: new Date(timestamp).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        });

        setHistory(transformedResults);
        setError(null);
      } catch (err) {
        console.error('Error fetching analysis history:', err);
        setError('Failed to load analysis history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  // Enhanced filtering and sorting
  const filteredHistory = history
    .filter(record => {
      const matchesSearch = record.videoName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'real' && record.prediction === 'REAL') ||
        (filterType === 'fake' && record.prediction === 'FAKE');
      const matchesConfidence = record.confidence >= confidenceRange[0] && record.confidence <= confidenceRange[1];
      return matchesSearch && matchesFilter && matchesConfidence;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const handleViewDetails = (analysis: AnalysisRecord) => {
    setSelectedAnalysis(analysis);
    setShowDetailsModal(true);
  };

  const handleDownloadReport = (analysis: AnalysisRecord) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yOffset = 20;

      // Add header
      doc.setFontSize(24);
      doc.setTextColor(139, 92, 246);
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
      const predictionColor = analysis.prediction === 'REAL' ? [40, 167, 69] : [220, 53, 69];
      doc.setTextColor(predictionColor[0], predictionColor[1], predictionColor[2]);
      doc.text(`Prediction: ${analysis.prediction}`, 20, yOffset);
      yOffset += 15;

      // Add confidence score
      doc.setTextColor(0);
      doc.text(`Confidence Score: ${analysis.confidence}%`, 20, yOffset);
      yOffset += 20;

      // Add detailed analysis
      doc.setFontSize(16);
      doc.text('Detailed Analysis', 20, yOffset);
      yOffset += 15;

      // Add justification
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(analysis.justification || 'No detailed analysis available.', pageWidth - 40);
      doc.text(splitText, 20, yOffset);
      yOffset += splitText.length * 7 + 20;

      // Add frame analysis if available
      if (analysis.frameProbs && analysis.frameProbs.length > 0) {
        if (yOffset > pageHeight - 50) {
          doc.addPage();
          yOffset = 20;
        }

        doc.setFontSize(16);
        doc.text('Frame Analysis', 20, yOffset);
        yOffset += 15;

        const tableData = analysis.frameProbs.map((probs, index) => [
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

      doc.save(`deepfake_analysis_${analysis.videoName.replace(/\.[^/.]+$/, '')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  // Add delete handler
  const handleDelete = async (analysisId: string) => {
    if (!user) return;
    
    try {
      setIsDeleting(analysisId);
      await deleteAnalysisResult(analysisId);
      // Remove from local state
      setHistory(prev => prev.filter(item => item.id !== analysisId));
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto p-6"
      >
        <div className={`${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-2xl p-8 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto p-6"
      >
        <div className={`${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-2xl p-8 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="text-center text-red-400">
            <p>{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 rounded-xl"
            >
              Retry
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-6"
    >
      <div className={`${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-2xl p-8 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text mb-2">
              Analysis History
            </h2>
            <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              View and manage your past video analyses
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search analyses..."
                className={`w-full px-4 py-3 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} rounded-xl ${theme === 'dark' ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-500'} focus:outline-none focus:border-purple-500 pl-10`}
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Results</option>
              <option value="real">Real</option>
              <option value="fake">Fake</option>
            </select>
          </div>
        </div>

        {/* Analysis List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'} text-lg`}>
                {user ? 'No analysis history found.' : 'Please log in to view your analysis history.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((analysis) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/5 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                  <img
                    src={analysis.thumbnail}
                    alt={analysis.videoName}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/static/frames/default.jpg';
                    }}
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-white mb-2">{analysis.videoName}</h3>
                  <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    Analyzed on {analysis.date}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`inline-block px-4 py-2 rounded-full ${
                    analysis.prediction === 'REAL' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {analysis.prediction}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          analysis.prediction === 'REAL' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${analysis.confidence}%` }}
                      />
                    </div>
                    <span className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                      {analysis.confidence}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleViewDetails(analysis)}
                    className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 rounded-xl group-hover:shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Details
                  </Button>
                  <Button
                    onClick={() => handleDownloadReport(analysis)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 rounded-xl group-hover:shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Report
                  </Button>
                  <Button
                    onClick={() => handleDelete(analysis.id!)}
                    disabled={isDeleting === analysis.id}
                    className={`px-4 py-2 ${theme === 'dark' ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-red-100 hover:bg-red-200'} text-red-500 transition-all duration-300 rounded-xl group-hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isDeleting === analysis.id ? (
                      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedAnalysis && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={() => setShowDetailsModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl p-6 rounded-2xl z-50 ${
                  theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                } shadow-2xl`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Analysis Details
                  </h3>
                  <Button
                    onClick={() => setShowDetailsModal(false)}
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
                <div className={`${theme === 'dark' ? 'text-white/90' : 'text-gray-700'} text-base leading-relaxed`}>
                  {selectedAnalysis.justification || 'No detailed analysis available.'}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Pagination */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
            Showing {filteredHistory.length} of {history.length} analyses
          </p>
          <div className="flex gap-2">
            <Button
              className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Previous
            </Button>
            <Button
              className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 