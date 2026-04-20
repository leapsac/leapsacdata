/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  UploadCloud, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  Megaphone, 
  Settings, 
  Users, 
  Wand2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download,
  Loader2,
  ChevronRight,
  Target,
  Share2,
  FileJson,
  Timer,
  AlertTriangle,
  GitPullRequest,
  Globe,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { GoogleGenAI, Type } from "@google/genai";

// Register ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Types
interface AnalysisResult {
  report_title: string;
  executive_summary: string;
  key_metrics: Array<{
    label: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
    change: string;
    context: string;
  }>;
  chart_primary: {
    type: 'bar' | 'line';
    title: string;
    x_column: string;
    y_column: string;
    insight: string;
  };
  chart_secondary: {
    title: string;
    column: string;
    insight: string;
  };
  key_findings: Array<{
    title: string;
    category: 'critical' | 'warning' | 'positive' | 'neutral';
    description: string;
  }>;
  recommendations: Array<{
    action: string;
    impact: 'High' | 'Medium' | 'Low';
    description: string;
    timeline: string;
  }>;
  data_quality: {
    completeness: number;
    consistency: number;
    accuracy: number;
    coverage: number;
  };
  risks: Array<{
    title: string;
    severity: 'critical' | 'medium' | 'low';
    description: string;
  }>;
  analysis_time: string;
}

const ANALYSIS_MODES = [
  { id: 'financial', label: 'Financial Analysis', icon: DollarSign, desc: 'P&L statements, cash flow, margins, burn rate, investment returns.', tag: 'Most Popular' },
  { id: 'sales', label: 'Sales Performance', icon: BarChart3, desc: 'Revenue trends, rep performance, pipeline health, conversion rates.' },
  { id: 'marketing', label: 'Marketing Attribution', icon: Target, desc: 'Campaign ROI, channel performance, CAC, ROAS, funnel analysis.' },
  { id: 'operations', label: 'Operations Audit', icon: Settings, desc: 'Process efficiency, cost centers, resource utilization, bottlenecks.' },
  { id: 'customer', label: 'Customer Behavior', icon: Users, desc: 'Retention, churn, LTV, segmentation, purchase patterns.' },
  { id: 'custom', label: 'Custom Analysis', icon: Wand2, desc: 'Describe what you need. The AI adapts to your specific dataset.' },
];

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('financial');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedFoundations, setExpandedFoundations] = useState<number[]>([]);
  const [lampOn, setLampOn] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to analysis result
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    let uploadedFile: File | null = null;
    if ('files' in e.target && e.target.files?.[0]) {
      uploadedFile = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files?.[0]) {
      uploadedFile = e.dataTransfer.files[0];
    }

    if (uploadedFile) {
      if (uploadedFile.type !== 'text/csv' && !uploadedFile.name.endsWith('.csv')) {
        setError('Please upload a valid CSV file.');
        return;
      }
      setFile(uploadedFile);
      setError(null);
      Papa.parse(uploadedFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          setCsvData(results.data);
          if (results.meta.fields) {
            setColumns(results.meta.fields);
          }
        }
      });
    }
  };

  const handleRunAnalysis = async () => {
    if (!file || !csvData.length) return;
    const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY || apiKey) as string | undefined;
    if (!apiKey && !geminiKey) {
      setError('Please provide a Gemini API key.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const finalApiKey = apiKey || (import.meta.env.VITE_GEMINI_API_KEY as string);
      const ai = new GoogleGenAI({ apiKey: finalApiKey! });
      
      const analysisMode = ANALYSIS_MODES.find(m => m.id === selectedMode)?.label || selectedMode;
      const csvPreview = Papa.unparse(csvData.slice(0, 200));

      const prompt = `
        You are a world-class senior data analyst. Analyze this ${analysisMode} dataset like a $10,000/month consultant would.
        
        CSV Data (first 200 rows max):
        ${csvPreview}
        
        Context: ${context || "General business analysis"}
        
        Return ONLY valid JSON, no markdown, no explanation:
        {
          "report_title": "Specific descriptive title for this analysis",
          "executive_summary": "4-5 sentence professional summary with specific numbers from data",
          "key_metrics": [
            {
              "label": "Metric Name",
              "value": "Actual value",
              "trend": "up|down|neutral",
              "change": "+23%",
              "context": "vs industry avg / vs last period"
            }
          ],
          "chart_primary": {
            "type": "bar|line",
            "title": "Chart title",
            "x_column": "exact column name from CSV",
            "y_column": "exact column name from CSV",
            "insight": "One line about what this chart shows"
          },
          "chart_secondary": {
            "title": "Distribution chart title",
            "column": "column name to show distribution of",
            "insight": "One line about distribution"
          },
          "key_findings": [
            {
              "title": "Finding headline",
              "category": "critical|warning|positive|neutral",
              "description": "2-3 sentence detailed explanation with actual numbers"
            }
          ],
          "recommendations": [
            {
              "action": "Specific action title",
              "impact": "High|Medium|Low",
              "description": "Exactly what to do, why, and expected outcome",
              "timeline": "Immediate|1-2 weeks|1 month"
            }
          ],
          "data_quality": {
            "completeness": 85,
            "consistency": 72,
            "accuracy": 90,
            "coverage": 68
          },
          "risks": [
            {
              "title": "Risk title",
              "severity": "critical|medium|low",
              "description": "What the risk is and why it matters"
            }
          ],
          "analysis_time": "Realistic time like 4.2"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              report_title: { type: Type.STRING },
              executive_summary: { type: Type.STRING },
              key_metrics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                    trend: { type: Type.STRING, enum: ['up', 'down', 'neutral'] },
                    change: { type: Type.STRING },
                    context: { type: Type.STRING }
                  },
                  required: ['label', 'value', 'trend']
                }
              },
              chart_primary: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['bar', 'line'] },
                  title: { type: Type.STRING },
                  x_column: { type: Type.STRING },
                  y_column: { type: Type.STRING },
                  insight: { type: Type.STRING }
                }
              },
              chart_secondary: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  column: { type: Type.STRING },
                  insight: { type: Type.STRING }
                }
              },
              key_findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['critical', 'warning', 'positive', 'neutral'] },
                    description: { type: Type.STRING }
                  }
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                    description: { type: Type.STRING },
                    timeline: { type: Type.STRING }
                  }
                }
              },
              data_quality: {
                type: Type.OBJECT,
                properties: {
                  completeness: { type: Type.NUMBER },
                  consistency: { type: Type.NUMBER },
                  accuracy: { type: Type.NUMBER },
                  coverage: { type: Type.NUMBER }
                }
              },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['critical', 'medium', 'low'] },
                    description: { type: Type.STRING }
                  }
                }
              },
              analysis_time: { type: Type.STRING }
            },
            required: ['report_title', 'executive_summary', 'key_metrics', 'key_findings', 'recommendations', 'risks', 'data_quality']
          }
        }
      });

      const parsedJSON = JSON.parse(response.text || '{}');
      setResult(parsedJSON);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setCsvData([]);
    setColumns([]);
    setContext('');
    setResult(null);
    setError(null);
    setExpandedFoundations([]);
  };

  const downloadReport = () => {
    if (!result) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${result.report_title}</title>
        <style>
          body { font-family: Inter, sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 40px auto; padding: 20px; background: #f9fafb; }
          .container { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          h1 { color: #111827; font-size: 32px; margin-bottom: 8px; }
          .header-meta { color: #6b7280; font-size: 14px; margin-bottom: 32px; border-bottom: 2px solid #e8622a; padding-bottom: 16px; }
          .section { margin-bottom: 40px; }
          h2 { color: #111827; font-size: 20px; border-left: 4px solid #e8622a; padding-left: 12px; margin-bottom: 20px; }
          .metrics-grid { display: grid; grid-template-cols: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
          .metric-card { padding: 20px; background: #f3f4f6; border-radius: 8px; border: 1px solid #e5e7eb; }
          .metric-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; }
          .metric-value { font-size: 28px; font-weight: bold; margin: 4px 0; }
          .finding { margin-bottom: 16px; padding: 16px; background: #fff7ed; border-radius: 8px; border: 1px solid #ffedd5; }
          .recommendation { padding: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; }
          .impact-high { border-top: 4px solid #ef4444; }
          .impact-medium { border-top: 4px solid #f59e0b; }
          .impact-low { border-top: 4px solid #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${result.report_title}</h1>
            <div class="header-meta">File: ${file?.name} | Generated by leapsac AI | ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <p>${result.executive_summary}</p>
          </div>

          <div class="section">
            <h2>Key Performance Indicators</h2>
            <div class="metrics-grid">
              ${result.key_metrics.map((m: any) => `
                <div class="metric-card">
                  <div class="metric-label">${m.label}</div>
                  <div class="metric-value">${m.value}</div>
                  <div style="font-size: 12px; color: ${m.trend === 'up' ? '#10b981' : m.trend === 'down' ? '#ef4444' : '#6b7280'}">${m.change} ${m.context}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="section">
            <h2>Strategic Findings</h2>
            ${result.key_findings.map((f: any) => `
              <div class="finding">
                <strong>${f.title}</strong>
                <p>${f.description}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>Recommendations</h2>
            ${result.recommendations.map((r: any) => `
              <div class="recommendation impact-${r.impact.toLowerCase()}">
                <strong>${r.action} (${r.impact} Impact)</strong>
                <p>${r.description}</p>
                <div style="font-size: 11px; color: #6b7280;">Timeline: ${r.timeline}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leapsac_Report_${file?.name?.replace('.csv', '')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    if (!result || !result.chart_primary || !csvData.length) return null;
    
    const { x_column, y_column } = result.chart_primary;
    const { column: distColumn } = result.chart_secondary || {};

    const availableColumns = columns.map((c: string) => c.toLowerCase());
    const xKey = columns.find((c: string) => c.toLowerCase() === x_column.toLowerCase()) || columns[0];
    const yKey = columns.find((c: string) => c.toLowerCase() === y_column.toLowerCase()) || columns[1];
    const distKey = distColumn ? columns.find((c: string) => c.toLowerCase() === distColumn.toLowerCase()) : null;

    const displayData = csvData.slice(0, 15);
    
    // Primary Chart Data
    const primary = {
      labels: displayData.map((d: any) => String(d[xKey] || '')),
      datasets: [{
        label: yKey,
        data: displayData.map((d: any) => {
          const val = d[yKey];
          if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]+/g, ""));
          return Number(val) || 0;
        }),
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return '#e8622a';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, '#e8622a');
          gradient.addColorStop(1, '#ff9a6c');
          return gradient;
        },
        borderColor: '#e8622a',
        borderWidth: 0,
        borderRadius: 4,
        tension: 0.4,
        pointBackgroundColor: '#ffffff',
      }],
    };

    // Distribution Data
    let secondary = null;
    if (distKey) {
      const distributionMap: {[key: string]: number} = {};
      csvData.slice(0, 100).forEach((row: any) => {
        const val = String(row[distKey] || 'Other');
        distributionMap[val] = (distributionMap[val] || 0) + 1;
      });
      const labels = Object.keys(distributionMap).slice(0, 6);
      secondary = {
        labels,
        datasets: [{
          data: labels.map(l => distributionMap[l]),
          backgroundColor: ['#e8622a', '#444', '#666', '#888', '#aaa', '#1a1a1a'],
          borderWidth: 1,
          borderColor: '#111',
        }]
      };
    }

    return { primary, secondary };
  }, [result, csvData, columns]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        borderColor: '#e8622a',
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: '#1a1a1a' }, ticks: { color: '#666', font: { family: 'Inter', size: 10 } } },
      y: { grid: { color: '#1a1a1a' }, ticks: { color: '#666', font: { family: 'Inter', size: 10 } } },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#888', font: { family: 'Inter', size: 10 }, padding: 20, usePointStyle: true }
      }
    }
  };

  const toggleAccordion = (index: number) => {
    setExpandedFoundations((prev: number[]) =>
      prev.includes(index) ? prev.filter((i: number) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-background selection:bg-brand-primary/30">
      {/* NAVBAR */}
      <nav className="h-16 px-8 flex items-center justify-between border-b border-brand-divider bg-brand-background/85 backdrop-blur-xl z-50 sticky top-0">
        <div className="max-w-7xl w-full flex items-center justify-between mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand-primary rounded-full" />
            <span className="text-xl font-bold tracking-tight text-white">leapsac</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-brand-text-secondary hover:text-white transition-colors">How it works</a>
            <a href="#features" className="text-sm font-medium text-brand-text-secondary hover:text-white transition-colors">Features</a>
            <a 
              href="#analysis-tool"
              className="bg-brand-primary hover:bg-brand-accent-hover text-white px-5 py-2 rounded-md text-sm font-semibold transition-all shadow-lg shadow-brand-primary/10"
            >
              Start Analysis
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center">
        {/* DASHBOARD HERO & TOOL SECTION */}
        <section className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 px-8 py-12 items-start">
          
          {/* Left Column: Hero & Modes */}
          <div className="lg:col-span-5 flex flex-col gap-12">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-[11px] font-semibold text-brand-primary tracking-[1.5px] uppercase block mb-3">
                AI-POWERED ANALYTICS ENGINE
              </span>
              <h1 className="text-[52px] font-bold leading-[1.1] tracking-[-1.5px] mb-4">
                Turn Raw Data<br />
                <span className="text-brand-primary">Into Decisions.</span>
              </h1>
              <p className="text-brand-text-secondary text-[15px] max-w-[420px] mb-8 leading-relaxed">
                Upload any CSV. Select your analysis type. Get professional-grade insights, charts, and recommendations — instantly.
              </p>
              
              <div className="flex flex-wrap gap-3 mb-12">
                <a 
                  href="#analysis-tool"
                  className="bg-brand-primary hover:bg-brand-accent-hover text-white px-6 py-4 rounded-md text-sm font-semibold flex items-center gap-2 transition-all"
                >
                  Upload & Analyze <ArrowRight size={18} />
                </a>
                <a 
                  href="#how-it-works"
                  className="border border-brand-border hover:bg-brand-surface text-white px-6 py-4 rounded-md text-sm font-semibold transition-all"
                >
                  See How It Works
                </a>
              </div>

              <div className="flex items-center gap-6 text-[11px] font-semibold text-brand-text-muted uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success-green" /> No account needed</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success-green" /> Messy data OK</span>
              </div>
            </motion.div>

            {/* Analysis Selector Fragment */}
            <div id="features" className="space-y-4">
              <span className="text-[11px] font-semibold text-brand-text-secondary tracking-widest uppercase block">
                SELECT ANALYSIS MODE
              </span>
              <div className="grid grid-cols-2 gap-3">
                {ANALYSIS_MODES.slice(0, 4).map((mode) => (
                  <div 
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 relative overflow-hidden group ${
                      selectedMode === mode.id 
                        ? 'border-brand-primary bg-brand-surface shadow-lg shadow-brand-primary/5' 
                        : 'border-brand-border bg-brand-surface hover:border-brand-text-muted'
                    }`}
                  >
                    {mode.tag && (
                      <span className="absolute top-2 right-2 bg-brand-primary text-[9px] text-white px-1.5 py-0.5 rounded font-bold uppercase">
                        {mode.id === 'financial' ? 'POPULAR' : mode.tag}
                      </span>
                    )}
                    <div className={`mb-3 transition-colors ${
                      selectedMode === mode.id ? 'text-brand-primary' : 'text-brand-text-muted group-hover:text-brand-primary'
                    }`}>
                      <mode.icon size={18} />
                    </div>
                    <h3 className="text-[13px] font-semibold leading-tight">{mode.label}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Key Feature - The Tool */}
          <div id="analysis-tool" className="lg:col-span-7 flex flex-col gap-6 w-full">
            <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col shadow-2xl relative min-h-[700px] overflow-hidden">
              {/* Tool Header - OS Style */}
              <div className="h-10 border-b border-brand-divider flex items-center px-4 justify-between bg-brand-surface/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <span className="text-[11px] font-semibold text-brand-text-muted tracking-widest uppercase truncate max-w-[200px]">
                  {file ? file.name : "Analysis_Dashboard_V2.csv"}
                </span>
                <div className="w-12" /> {/* Placeholder for balance */}
              </div>

              {/* Main Interaction Area */}
              <div className="p-6 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {!result && !isAnalyzing ? (
                    <motion.div 
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col"
                    >
                      {/* Upload Section Inline */}
                      <div className="space-y-8 flex-1 flex flex-col">
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleFileUpload}
                          onClick={() => fileInputRef.current?.click()}
                          className={`flex-1 border-2 border-dashed rounded-2xl p-12 transition-all group flex flex-col items-center justify-center text-center ${
                            isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-divider hover:border-brand-primary/50 bg-brand-background/40'
                          }`}
                        >
                          <input type="file" className="hidden" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} />
                          <div className={`mb-6 p-4 rounded-full bg-brand-background border border-brand-divider text-brand-primary transition-all ${isDragging ? 'scale-110 sleek-card-shadow' : 'group-hover:sleek-border-glow'}`}>
                            <UploadCloud size={32} />
                          </div>
                          <h3 className="text-base font-semibold mb-2">{file ? file.name : "Drop CSV to Analyze"}</h3>
                          <p className="text-brand-text-muted text-xs">Standard CSV format supported up to 10MB</p>
                          {file && (
                            <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-brand-primary/10 rounded-full text-brand-primary text-[10px] font-bold uppercase tracking-wider">
                              <CheckCircle2 size={12} /> File Loaded
                            </div>
                          )}
                        </div>

                        <div className="mt-8">
                          <button 
                            onClick={handleRunAnalysis}
                            disabled={!file || isAnalyzing}
                            className={`w-full py-4 rounded-xl font-bold text-sm transition-all h-[54px] flex items-center justify-center gap-2 ${
                              !file || isAnalyzing ? 'bg-brand-divider text-brand-text-muted' : 'bg-brand-primary hover:bg-brand-accent-hover text-white'
                            }`}
                          >
                            {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : "Run Deep Analysis"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : isAnalyzing ? (
                    <motion.div key="analyzing" className="flex-1 flex flex-col items-center justify-center py-20">
                      <div className="relative mb-8">
                        <div className="w-16 h-16 border-2 border-brand-divider rounded-full" />
                        <div className="absolute inset-0 border-t-2 border-brand-primary rounded-full animate-spin" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Analyzing Data Structure</h3>
                      <p className="text-brand-text-muted text-sm text-center max-w-[300px]">Extracting patterns and generating professional insights for your report...</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="report" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex-1 -mx-6 -mb-6 bg-[#0d0d0d] overflow-y-auto custom-scrollbar"
                      ref={resultRef}
                    >
                      {/* SECTION 1 — REPORT HEADER BAR */}
                      <div className="report-section px-8 py-6 border-b border-[#1a1a1a] flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-[#0d0d0d] z-20">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-[9px] font-bold tracking-[1.5px] uppercase rounded">
                            {selectedMode.toUpperCase()} AUDIT
                          </span>
                          <h2 className="text-2xl font-bold text-white tracking-tight">{result?.report_title}</h2>
                          <p className="text-[11px] text-brand-text-muted font-mono flex items-center gap-2">
                            <FileJson size={12} /> {file?.name} • {new Date().toLocaleTimeString()} • {csvData.length} records processed
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={downloadReport} className="px-4 py-1.5 border border-[#1a1a1a] hover:bg-brand-surface rounded text-xs font-semibold flex items-center gap-2 transition-all">
                            <Download size={14} /> Download Report
                          </button>
                          <button className="px-4 py-1.5 border border-[#1a1a1a] hover:bg-brand-surface rounded text-xs font-semibold flex items-center gap-2 transition-all">
                            <Share2 size={14} /> Share
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary/40 blur-[1px]" />
                      </div>

                      <div className="p-8 space-y-12">
                        {/* SECTION 2 — KEY METRICS STRIP */}
                        <div className="report-section grid grid-cols-1 md:flex md:flex-nowrap gap-4 overflow-x-auto pb-2 custom-scrollbar">
                          {result?.key_metrics.map((m, i) => (
                            <div key={i} className="min-w-[240px] flex-1 bg-[#111] border border-[#1e1e1e] p-6 rounded-[10px] hover:border-brand-primary/30 transition-all group">
                              <span className="text-[11px] text-brand-text-muted uppercase font-bold tracking-[1.5px] block mb-4">{m.label}</span>
                              <div className="text-4xl font-bold text-white mb-3 tracking-tight">{m.value}</div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold flex items-center gap-1 ${
                                  m.trend === 'up' ? 'text-success-green' : m.trend === 'down' ? 'text-red-400' : 'text-brand-text-muted'
                                }`}>
                                  {m.trend === 'up' && <ArrowUpRight size={14} />}
                                  {m.trend === 'down' && <ArrowDownRight size={14} />}
                                  {m.trend === 'neutral' && <ChevronRight size={14} />}
                                  {m.change}
                                </span>
                                <span className="text-[11px] text-brand-text-muted">{m.context}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* SECTION 3 — EXECUTIVE SUMMARY */}
                        <div className="report-section bg-[rgba(232,98,42,0.03)] border border-brand-primary/10 rounded-[10px] p-6 relative overflow-hidden">
                          <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-brand-primary rounded-full shadow-[0_0_10px_rgba(232,98,42,0.5)]" />
                          <span className="text-[11px] text-brand-primary uppercase font-bold tracking-[2px] block mb-3 ml-4">EXECUTIVE SUMMARY</span>
                          <div className="text-[15px] text-white/90 leading-[1.8] ml-4 font-normal">
                            {result?.executive_summary}
                          </div>
                        </div>

                        {/* SECTION 4 — VISUAL CHARTS */}
                        <div className="report-section grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* PRIMARY CHART */}
                          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6 flex flex-col h-[400px]">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h3 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">{result?.chart_primary.title}</h3>
                                <p className="text-[11px] text-brand-text-muted">{result?.chart_primary.insight}</p>
                              </div>
                              <BarChart3 size={16} className="text-brand-text-muted" />
                            </div>
                            <div className="flex-1 relative">
                              {chartData?.primary && (
                                result?.chart_primary.type === 'bar' ? (
                                  <Bar data={chartData.primary} options={chartOptions as any} />
                                ) : (
                                  <Line data={chartData.primary} options={chartOptions as any} />
                                )
                              )}
                            </div>
                            <div className="mt-4 text-[9px] text-[#333] font-mono self-end uppercase font-bold tracking-widest">Powered by leapsac</div>
                          </div>

                          {/* SECONDARY CHART */}
                          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6 flex flex-col h-[400px]">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h3 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">{result?.chart_secondary.title}</h3>
                                <p className="text-[11px] text-brand-text-muted">{result?.chart_secondary.insight}</p>
                              </div>
                              <PieChart size={16} className="text-brand-text-muted" />
                            </div>
                            <div className="flex-1 relative">
                              {chartData?.secondary && <Doughnut data={chartData.secondary} options={donutOptions as any} />}
                            </div>
                            <div className="mt-4 text-[9px] text-[#333] font-mono self-end uppercase font-bold tracking-widest">Powered by leapsac</div>
                          </div>
                        </div>

                        {/* SECTION 5 — KEY FINDINGS */}
                        <div className="report-section space-y-6">
                          <h3 className="text-xl font-bold text-white tracking-tight">Key Findings</h3>
                          <div className="border border-[#1a1a1a] rounded-xl overflow-hidden bg-[#111]">
                            {result?.key_findings.map((f, i) => (
                              <div key={i} className="border-b last:border-0 border-[#1a1a1a]">
                                <div 
                                  onClick={() => toggleAccordion(i)}
                                  className={`flex items-center gap-6 p-5 cursor-pointer transition-all ${
                                    expandedFoundations.includes(i) ? 'bg-[rgba(232,98,42,0.04)] border-l-[3px] border-brand-primary' : 'hover:bg-white/5 border-l-[3px] border-transparent'
                                  }`}
                                >
                                  <span className="font-mono text-[11px] text-brand-text-muted">0{i+1}</span>
                                  <div className="flex-1">
                                    <h4 className="text-[14px] font-semibold text-white">{f.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      f.category === 'critical' ? 'bg-red-400/20 text-red-500' :
                                      f.category === 'warning' ? 'bg-yellow-400/20 text-yellow-500' :
                                      f.category === 'positive' ? 'bg-success-green/20 text-success-green' :
                                      'bg-brand-text-muted/20 text-brand-text-muted'
                                    }`}>
                                      {f.category}
                                    </span>
                                    <ChevronDown size={16} className={`text-brand-text-muted transition-transform duration-300 ${expandedFoundations.includes(i) ? 'rotate-180 text-brand-primary' : ''}`} />
                                  </div>
                                </div>
                                <div className={`accordion-content ${expandedFoundations.includes(i) ? 'open' : ''}`}>
                                  <div className="p-5 pl-16 text-[13px] text-brand-text-secondary leading-relaxed border-t border-[#1a1a1a]/50">
                                    {f.description}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION 6 — RECOMMENDATIONS (KANBAN) */}
                        <div className="report-section space-y-6">
                          <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Recommended Actions</h3>
                            <p className="text-xs text-brand-text-muted mt-1">Prioritized by impact level and implementation timeline</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { id: 'High', label: '🔴 High Impact', border: 'border-t-red-500' },
                              { id: 'Medium', label: '🟡 Medium Impact', border: 'border-t-yellow-500' },
                              { id: 'Low', label: '🟢 Quick Wins', border: 'border-t-success-green' }
                            ].map((col) => (
                              <div key={col.id} className="space-y-4">
                                <div className={`bg-[#111] border-t-2 ${col.border} p-3 rounded-t-lg flex items-center justify-between`}>
                                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{col.label}</span>
                                  <span className="w-5 h-5 flex items-center justify-center bg-[#1a1a1a] rounded text-[10px] font-bold border border-[#1e1e1e]">
                                    {result?.recommendations.filter(r => r.impact === col.id).length}
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {result?.recommendations
                                    .filter(r => r.impact === col.id)
                                    .map((rec, ri) => (
                                      <div key={ri} className="bg-[#111] border border-[#1e1e1e] p-5 rounded-lg hover:border-brand-primary/40 transition-all hover:-translate-y-1 relative group">
                                        <h4 className="text-[13px] font-bold text-white mb-2">{rec.action}</h4>
                                        <p className="text-[12px] text-brand-text-secondary leading-relaxed mb-4">{rec.description}</p>
                                        <div className="flex items-center justify-between mt-auto">
                                          <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest flex items-center gap-1">
                                            <Timer size={10} /> {rec.timeline}
                                          </span>
                                          <span className="text-[10px] font-bold text-brand-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Take Action <ArrowRight size={10} />
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION 7 — DATA HEALTH SCORECARD */}
                        <div className="report-section space-y-6">
                          <h3 className="text-xl font-bold text-white tracking-tight">Data Quality Report</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: 'Completeness', value: result?.data_quality.completeness || 0, icon: Layers },
                              { label: 'Consistency', value: result?.data_quality.consistency || 0, icon: GitPullRequest },
                              { label: 'Accuracy', value: result?.data_quality.accuracy || 0, icon: Target },
                              { label: 'Coverage', value: result?.data_quality.coverage || 0, icon: Globe }
                            ].map((dq, di) => (
                              <div key={di} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 flex flex-col items-center text-center">
                                <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                                  <svg className="w-full h-full -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="#1a1a1a" strokeWidth="4" fill="transparent" />
                                    <circle 
                                      cx="32" cy="32" r="28" strokeWidth="4" fill="transparent" 
                                      strokeDasharray={2 * Math.PI * 28}
                                      strokeDashoffset={2 * Math.PI * 28 * (1 - dq.value / 100)}
                                      strokeLinecap="round"
                                      className="transition-all duration-1000"
                                      stroke={dq.value > 80 ? '#22c55e' : dq.value > 50 ? '#eab308' : '#ef4444'} 
                                    />
                                  </svg>
                                  <span className="absolute text-xs font-bold text-white">{dq.value}%</span>
                                </div>
                                <h4 className="text-[11px] font-bold text-brand-text-secondary uppercase tracking-[1.5px] mb-1">{dq.label}</h4>
                                <span className="text-[10px] text-brand-text-muted">Data integrity score</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION 8 — RISK RADAR */}
                        <div className="report-section space-y-6">
                          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                             <AlertTriangle size={20} className="text-brand-primary" /> Areas to Watch
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result?.risks.map((risk, ri) => (
                              <div key={ri} className={`relative p-5 rounded-lg border-l-[3px] flex gap-4 ${
                                risk.severity === 'critical' ? 'bg-red-400/5 border-red-500' :
                                risk.severity === 'medium' ? 'bg-yellow-400/5 border-yellow-500' :
                                'bg-blue-400/5 border-blue-500'
                              }`}>
                                <div className="mt-1">
                                  {risk.severity === 'critical' && <AlertCircle size={18} className="text-red-500" />}
                                  {risk.severity === 'medium' && <ShieldAlert size={18} className="text-yellow-500" />}
                                  {risk.severity === 'low' && <AlertCircle size={18} className="text-blue-500" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-[14px] font-bold text-white">{risk.title}</h4>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 ${
                                      risk.severity === 'critical' ? 'text-red-400' :
                                      risk.severity === 'medium' ? 'text-yellow-400' :
                                      'text-blue-400'
                                    }`}>
                                      {risk.severity}
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-brand-text-secondary leading-relaxed">{risk.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION 9 — REPORT FOOTER */}
                        <div className="report-section pt-12 border-t border-[#1a1a1a] flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="text-[11px] text-brand-text-muted font-mono uppercase tracking-widest">
                            Analysis completed in {result?.analysis_time}s · Powered by leapsac AI
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={downloadReport} className="px-6 py-2 border border-[#1a1a1a] hover:bg-brand-surface rounded text-xs font-bold transition-all">
                              Download PDF
                            </button>
                            <button onClick={resetAnalysis} className="px-6 py-2 bg-brand-primary hover:bg-brand-accent-hover text-white rounded text-xs font-bold transition-all">
                              Run New Analysis
                            </button>
                          </div>
                          <p className="md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2 text-[9px] text-[#444] text-center w-full max-w-[500px]">
                            This report is AI-generated for decision support. Validate critical findings with your team.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pulsing overlay for tool card */}
              <div className="absolute inset-0 border border-brand-primary/10 rounded-2xl pointer-events-none" />
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="h-12 w-full bg-brand-background border-y border-brand-divider flex items-center overflow-hidden whitespace-nowrap mb-24">
          <div className="animate-marquee gap-12">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-12 text-brand-primary font-bold text-[11px] tracking-[2px] uppercase">
                <span>FINANCIAL ANALYSIS • SALES INTELLIGENCE • MARKETING ATTRIBUTION • OPERATIONS AUDIT • CUSTOMER BEHAVIOR • INVENTORY OPTIMIZATION • REVENUE FORECASTING •</span>
              </div>
            ))}
          </div>
        </div>

        {/* LAMP COMPONENT WRAPPING HOW IT WORKS */}
        <section className={`lamp-section ${lampOn ? 'lamp-on' : ''}`} id="lamp-container">
          {/* Toggle */}
          <div className="lamp-toggle-wrapper">
            <span className="toggle-label-off">OFF</span>
            <button 
              className={`lamp-toggle ${lampOn ? 'active' : ''}`} 
              onClick={() => setLampOn(!lampOn)}
              aria-label="Toggle lamp"
            >
              <span className="toggle-thumb"></span>
            </button>
            <span className="toggle-label-on">ON</span>
          </div>

          {/* Lamp Line */}
          <div className="lamp-line-wrapper">
            <div className="lamp-line"></div>
          </div>

          {/* Light Cone (absolute, behind content) */}
          <div className="lamp-cone"></div>

          {/* How It Works content — Illuminating this area */}
          <div className="how-it-works-content">
            <section id="how-it-works" className="max-w-7xl w-full px-8 py-24 border-t border-brand-divider space-y-16 mx-auto">
              <div className="text-center">
                <span className="text-[11px] font-semibold text-brand-primary tracking-[1.5px] uppercase">HOW IT WORKS</span>
                <h2 className="text-3xl font-bold mt-2">Professional insight, simplified</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: 'Data Ingestion', icon: UploadCloud, desc: 'Securely upload your structured dataset in CSV format.' },
                  { title: 'Neural Analysis', icon: Wand2, desc: 'Advanced LLM core parses patterns, outliers, and key opportunities.' },
                  { title: 'Actionable Audit', icon: BarChart3, desc: 'Receive a professional-grade report with strategic next steps.' },
                ].map((step, i) => (
                  <div key={i} className="bg-brand-surface border border-brand-divider p-8 rounded-2xl hover:border-brand-primary/30 transition-all shadow-lg shadow-black/50">
                    <div className="w-12 h-12 bg-brand-background rounded-lg flex items-center justify-center text-brand-primary mb-6 border border-brand-divider">
                      <step.icon size={20} />
                    </div>
                    <h3 className="text-base font-bold mb-3">{step.title}</h3>
                    <p className="text-brand-text-secondary text-[14px] leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="h-16 px-8 flex items-center justify-between border-t border-brand-divider bg-brand-surface">
        <div className="max-w-7xl w-full flex items-center justify-between mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-bold tracking-tight text-white uppercase">leapsac</span>
            <span className="text-[11px] text-brand-text-muted hidden sm:block">Professional data intelligence, powered by AI.</span>
          </div>
          <div className="flex items-center gap-6 text-[11px] font-semibold text-brand-text-secondary uppercase tracking-wider">
            <span className="text-brand-text-muted">© 2025 leapsac AI</span>
          </div>
        </div>
      </footer>
    </div>
  );

}

