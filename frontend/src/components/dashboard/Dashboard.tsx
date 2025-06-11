'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAnalysisHistory, AnalysisResult } from '@/services/analysisService';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardStats {
  totalAnalyses: number;
  realCount: number;
  fakeCount: number;
  averageConfidence: number;
  recentAnalyses: AnalysisResult[];
  dailyAnalyses: { date: string; count: number }[];
}

export const Dashboard = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    realCount: 0,
    fakeCount: 0,
    averageConfidence: 0,
    recentAnalyses: [],
    dailyAnalyses: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const analyses = await getUserAnalysisHistory(user.uid);
        
        // Calculate statistics
        const realCount = analyses.filter(a => a.prediction === 'Real').length;
        const fakeCount = analyses.filter(a => a.prediction === 'Fake').length;
        const totalConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0);
        
        // Group analyses by date
        const dailyAnalyses = analyses.reduce((acc, analysis) => {
          const date = new Date(analysis.timestamp).toLocaleDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const dailyData = Object.entries(dailyAnalyses).map(([date, count]) => ({
          date,
          count
        }));

        setStats({
          totalAnalyses: analyses.length,
          realCount,
          fakeCount,
          averageConfidence: totalConfidence / analyses.length || 0,
          recentAnalyses: analyses.slice(0, 5),
          dailyAnalyses: dailyData
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const COLORS = ['#28a745', '#dc3545'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-6"
    >
      <div className={`${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl rounded-2xl p-8 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text mb-2">
            Analysis Dashboard
          </h2>
          <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
            Overview of your video analysis statistics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-transparent p-6 rounded-xl shadow-lg">
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Total Analyses</h3>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>{stats.totalAnalyses}</p>
          </div>
          <div className="bg-transparent p-6 rounded-xl shadow-lg">
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Real Videos</h3>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{stats.realCount}</p>
          </div>
          <div className="bg-transparent p-6 rounded-xl shadow-lg">
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Fake Videos</h3>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{stats.fakeCount}</p>
          </div>
          <div className="bg-transparent p-6 rounded-xl shadow-lg">
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Avg. Confidence</h3>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{stats.averageConfidence.toFixed(1)}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Analysis Chart */}
          <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-white'} p-6 rounded-xl shadow-lg`}>
            <h3 className="text-lg font-semibold mb-4">Daily Analysis Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyAnalyses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prediction Distribution Chart */}
          <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-white'} p-6 rounded-xl shadow-lg`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              Prediction Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Real', value: stats.realCount },
                      { name: 'Fake', value: stats.fakeCount }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-white'} p-6 rounded-xl shadow-lg`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            Recent Analyses
          </h3>
          <div className="space-y-4">
            {stats.recentAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{analysis.videoName}</h4>
                    <p className={`${theme === 'dark' ? 'text-white/60' : 'text-gray-600'} text-sm`}>
                      {new Date(analysis.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full ${
                      analysis.prediction === 'Real' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {analysis.prediction}
                    </span>
                    <span className="font-semibold">{analysis.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};