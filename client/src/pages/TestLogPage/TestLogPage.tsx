import { useState } from 'react';

interface TestCase {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: string;
  error?: string;
  timestamp?: string;
}

interface LogAnalysis {
  success: boolean;
  filename: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  duration: string;
  errors: string[];
  testCases: TestCase[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    avgDuration: string;
  };
}

export default function TestLogPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/test-log/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze log file');
      }

      const data: LogAnalysis = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePathAnalysis = async () => {
    const filePath = prompt('请输入日志文件路径 (C:\\path\\to\\file.log):');
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test-log/analyze-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze log file');
      }

      const data: LogAnalysis = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = analysis?.testCases.filter(tc => {
    if (filter === 'ALL') return true;
    return tc.status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          测试日志分析平台
        </h1>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">上传日志文件</h2>
          
          <div className="flex gap-4 items-center flex-wrap">
            <input
              type="file"
              accept=".log,.txt,.xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full max-w-md text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              {loading ? '分析中...' : '上传分析'}
            </button>

            <span className="text-gray-500">或</span>

            <button
              onClick={handlePathAnalysis}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 transition"
            >
              输入路径分析
            </button>
          </div>

          {file && (
            <p className="mt-4 text-sm text-gray-600">
              已选择: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results Section */}
        {analysis && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">总测试数</div>
                <div className="text-2xl font-bold">{analysis.totalTests}</div>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4">
                <div className="text-sm text-green-600">通过</div>
                <div className="text-2xl font-bold text-green-600">{analysis.passedTests}</div>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-4">
                <div className="text-sm text-red-600">失败</div>
                <div className="text-2xl font-bold text-red-600">{analysis.failedTests}</div>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4">
                <div className="text-sm text-blue-600">通过率</div>
                <div className="text-2xl font-bold text-blue-600">{analysis.passRate}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">耗时</div>
                <div className="text-2xl font-bold">{analysis.duration}</div>
              </div>
            </div>

            {/* Status Banner */}
            <div className={`rounded-lg shadow p-6 mb-6 ${analysis.success ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
              <div className="flex items-center gap-4">
                <div className={`text-4xl ${analysis.success ? 'text-green-500' : 'text-red-500'}`}>
                  {analysis.success ? '✓' : '✗'}
                </div>
                <div>
                  <div className="text-xl font-bold">{analysis.success ? '测试全部通过' : '存在测试失败'}</div>
                  <div className="text-gray-600">{analysis.filename}</div>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4">
              {(['ALL', 'PASS', 'FAIL'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg transition ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {f === 'ALL' ? `全部 (${analysis.totalTests})` : f === 'PASS' ? `通过 (${analysis.passedTests})` : `失败 (${analysis.failedTests})`}
                </button>
              ))}
            </div>

            {/* Test Cases Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">测试名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">耗时</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间戳</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">错误信息</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCases?.map((tc, idx) => (
                      <tr key={idx} className={tc.status === 'FAIL' ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tc.status === 'PASS' ? 'bg-green-100 text-green-800' : tc.status === 'FAIL' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {tc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tc.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tc.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tc.duration}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tc.timestamp || '-'}</td>
                        <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">{tc.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Button */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  const csv = [
                    ['ID', 'Name', 'Status', 'Duration', 'Error'],
                    ...analysis.testCases.map(tc => [tc.id, tc.name, tc.status, tc.duration, tc.error || ''])
                  ].map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `test-results-${Date.now()}.csv`;
                  a.click();
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                导出CSV
              </button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!analysis && !loading && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无分析数据</h3>
            <p className="text-gray-500">请上传日志文件或输入文件路径进行分析</p>
          </div>
        )}
      </div>
    </div>
  );
}
