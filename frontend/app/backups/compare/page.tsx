'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

interface ComparisonData {
  summary: {
    label1: string;
    label2: string;
    totalLines1: number;
    totalLines2: number;
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    unchangedLines: number;
  };
  categorized: {
    [key: string]: {
      added: string[];
      removed: string[];
    };
  };
  diffReport: string;
}

export default function CompareBackupsPage() {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'summary' | 'diff'>('summary');

  useEffect(() => {
    const data = sessionStorage.getItem('backupComparison');
    if (data) {
      setComparison(JSON.parse(data));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-slate-400">Loading comparison...</p>
        </div>
      </Layout>
    );
  }

  if (!comparison) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">No comparison data found</p>
          <Link href="/backups" className="text-blue-400 hover:text-blue-300">
            Back to Backups
          </Link>
        </div>
      </Layout>
    );
  }

  const downloadDiffReport = () => {
    const element = document.createElement('a');
    const file = new Blob([comparison.diffReport], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `diff_report_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">Backup Comparison</h1>
            <p className="text-slate-400 mt-1">Analyze differences between configurations</p>
          </div>
          <Link
            href="/backups"
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <i className="fas fa-arrow-left" />
            Back to Backups
          </Link>
        </div>

        {/* Comparison Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-6 border-l-4 border-blue-500">
            <p className="text-slate-400 text-sm mb-2">Earlier Backup</p>
            <p className="text-white font-semibold">{comparison.summary.label1}</p>
            <p className="text-slate-500 text-xs mt-2">{comparison.summary.totalLines1} lines</p>
          </div>
          <div className="card p-6 border-l-4 border-green-500">
            <p className="text-slate-400 text-sm mb-2">Later Backup</p>
            <p className="text-white font-semibold">{comparison.summary.label2}</p>
            <p className="text-slate-500 text-xs mt-2">{comparison.summary.totalLines2} lines</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-red-400 text-2xl font-bold">{comparison.summary.removedLines}</p>
            <p className="text-slate-400 text-sm mt-1">Removed Lines</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-green-400 text-2xl font-bold">{comparison.summary.addedLines}</p>
            <p className="text-slate-400 text-sm mt-1">Added Lines</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-yellow-400 text-2xl font-bold">{comparison.summary.modifiedLines}</p>
            <p className="text-slate-400 text-sm mt-1">Modified Lines</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-blue-400 text-2xl font-bold">{comparison.summary.unchangedLines}</p>
            <p className="text-slate-400 text-sm mt-1">Unchanged Lines</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <i className="fas fa-chart-bar mr-2" />
            Summary by Category
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'diff'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <i className="fas fa-code-branch mr-2" />
            Full Diff Report
          </button>
          <button
            onClick={downloadDiffReport}
            className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600 transition ml-auto"
          >
            <i className="fas fa-download mr-2" />
            Download Report
          </button>
        </div>

        {/* Content Area */}
        <div className="card p-6">
          {viewMode === 'summary' ? (
            // Summary View
            <div className="space-y-6">
              {Object.entries(comparison.categorized).map(([category, changes]) => {
                if (changes.added.length === 0 && changes.removed.length === 0) {
                  return null;
                }
                return (
                  <div key={category} className="border-b border-slate-700 pb-4 last:border-0">
                    <h3 className="text-lg font-semibold text-white capitalize mb-3">
                      {category.replace('_', ' ')}
                    </h3>
                    {changes.removed.length > 0 && (
                      <div className="mb-3">
                        <p className="text-red-400 text-sm font-semibold mb-2">
                          Removed ({changes.removed.length}):
                        </p>
                        <div className="bg-red-950/30 rounded p-3 space-y-1">
                          {changes.removed.map((line, idx) => (
                            <p key={idx} className="text-red-300 text-sm font-mono">
                              - {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {changes.added.length > 0 && (
                      <div>
                        <p className="text-green-400 text-sm font-semibold mb-2">
                          Added ({changes.added.length}):
                        </p>
                        <div className="bg-green-950/30 rounded p-3 space-y-1">
                          {changes.added.map((line, idx) => (
                            <p key={idx} className="text-green-300 text-sm font-mono">
                              + {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Full Diff Report
            <pre className="bg-slate-950 p-4 rounded text-xs text-slate-300 overflow-x-auto max-h-96 overflow-y-auto font-mono">
              {comparison.diffReport}
            </pre>
          )}
        </div>
      </div>
    </Layout>
  );
}
