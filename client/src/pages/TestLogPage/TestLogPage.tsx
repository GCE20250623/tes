/**
 * 测试日志分析页面
 * 
 * 功能：
 * - 上传日志文件分析
 * - 支持多种日志格式（标准、结构化、CSV）
 * - 显示测试结果统计
 * - 支持按状态筛选
 * - 导出CSV
 */

import { useState } from 'react';

// 测试用例接口
interface TestCase {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: string;
  error?: string;
  timestamp?: string;
  // 结构化日志专用字段
  range?: string;
  testValue?: string;
}

// 日志分析结果接口
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
    startTime?: string;
    endTime?: string;
  };
  // 结构化日志元数据
  metadata?: Record<string, string>;
}

// 主组件
export default function TestLogPage() {
  // 状态定义
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  // 上传并分析文件
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
        throw new Error('分析失败，请检查文件格式');
      }

      const data: LogAnalysis = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 通过路径分析文件
  const handlePathAnalysis = async () => {
    const filePath = prompt('请输入日志文件路径:');
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
        throw new Error('分析失败，请检查文件路径');
      }

      const data: LogAnalysis = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 筛选测试用例
  const filteredCases = analysis?.testCases.filter(tc => {
    if (filter === 'ALL') return true;
    return tc.status === filter;
  });

  // 判断是否为结构化日志
  const isStructuredLog = analysis?.metadata && Object.keys(analysis.metadata).length > 0;

  // 导出CSV
  const handleExport = () => {
    if (!analysis) return;

    const headers = isStructuredLog
      ? ['ID', '测试项', '范围', '测试值', '状态', '耗时', '错误']
      : ['ID', '测试项', '状态', '耗时', '时间戳', '错误'];

    const rows = analysis.testCases.map(tc =>
      isStructuredLog
        ? [tc.id, tc.name, tc.range || '', tc.testValue || '', tc.status, tc.duration, tc.error || '']
        : [tc.id, tc.name, tc.status, tc.duration, tc.timestamp || '', tc.error || '']
    );

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          📊 测试日志分析平台
        </h1>

        {/* 上传区域 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">上传日志文件</h2>
          
          <div className="flex gap-4 items-center flex-wrap">
            <input
              type="file"
              accept=".log,.txt,.xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full max-w-md text-sm text-gray-500 
                file:mr-4 file:py-2 file:px-4 file:rounded-full 
                file:border-0 file:text-sm file:font-semibold 
                file:bg-blue-50 file:text-blue-700 
                hover:file:bg-blue-100"
            />
            
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg 
                disabled:opacity-50 disabled:cursor-not-allowed 
                hover:bg-blue-700 transition"
            >
              {loading ? '⏳ 分析中...' : '📤 上传分析'}
            </button>

            <span className="text-gray-400">或</span>

            <button
              onClick={handlePathAnalysis}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg 
                disabled:opacity-50 hover:bg-green-700 transition"
            >
              📁 输入路径
            </button>
          </div>

          {/* 支持的格式 */}
          <div className="mt-4 text-sm text-gray-500">
            <span className="font-medium">支持的格式:</span>
            <span className="ml-2">标准日志</span>
            <span className="mx-1">|</span>
            <span className="ml-1">结构化日志 (ProdName, SerialNumber, TestResult)</span>
            <span className="mx-1">|</span>
            <span className="ml-1">CSV</span>
          </div>

          {file && (
            <p className="mt-4 text-sm text-green-600">
              ✅ 已选择: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* 分析结果 */}
        {analysis && (
          <>
            {/* 元数据显示（结构化日志） */}
            {isStructuredLog && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">📋 测试信息</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analysis.metadata || {}).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase">{key}</div>
                      <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-500">总测试数</div>
                <div className="text-3xl font-bold">{analysis.totalTests}</div>
              </div>
              <div className="bg-green-50 rounded-xl shadow-lg p-4">
                <div className="text-sm text-green-600">通过</div>
                <div className="text-3xl font-bold text-green-600">{analysis.passedTests}</div>
              </div>
              <div className="bg-red-50 rounded-xl shadow-lg p-4">
                <div className="text-sm text-red-600">失败</div>
                <div className="text-3xl font-bold text-red-600">{analysis.failedTests}</div>
              </div>
              <div className="bg-blue-50 rounded-xl shadow-lg p-4">
                <div className="text-sm text-blue-600">通过率</div>
                <div className="text-3xl font-bold text-blue-600">{analysis.passRate}%</div>
              </div>
              <div className="bg-gray-100 rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-500">平均耗时</div>
                <div className="text-3xl font-bold">{analysis.summary.avgDuration}</div>
              </div>
            </div>

            {/* 状态横幅 */}
            <div className={`rounded-xl shadow-lg p-6 mb-6 ${
              analysis.success 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500' 
                : 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-500'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`text-5xl ${analysis.success ? 'text-green-500' : 'text-red-500'}`}>
                  {analysis.success ? '✅' : '❌'}
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {analysis.success ? '🎉 测试全部通过' : '⚠️ 存在测试失败'}
                  </div>
                  <div className="text-gray-600">{analysis.filename}</div>
                  {analysis.summary.startTime && (
                    <div className="text-sm text-gray-500 mt-1">
                      测试时间: {analysis.summary.startTime}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 筛选按钮 */}
            <div className="flex gap-2 mb-4">
              {(['ALL', 'PASS', 'FAIL'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === f 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                  }`}
                >
                  {f === 'ALL' ? `全部 (${analysis.totalTests})` : 
                   f === 'PASS' ? `✅ 通过 (${analysis.passedTests})` : 
                   `❌ 失败 (${analysis.failedTests})`}
                </button>
              ))}
            </div>

            {/* 测试用例表格 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">测试项</th>
                      {isStructuredLog && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">范围</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">测试值</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">耗时</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">错误信息</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCases?.map((tc, idx) => (
                      <tr key={idx} className={tc.status === 'FAIL' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            tc.status === 'PASS' ? 'bg-green-100 text-green-800' : 
                            tc.status === 'FAIL' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {tc.status === 'PASS' ? '✅' : tc.status === 'FAIL' ? '❌' : '⏭️'} {tc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{tc.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{tc.name}</td>
                        {isStructuredLog && (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{tc.range || '-'}</td>
                            <td className="px-4 py-3 text-sm text-blue-600 font-mono font-bold">{tc.testValue || '-'}</td>
                          </>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-500">{tc.duration}</td>
                        <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">{tc.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredCases?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  没有符合条件的测试用例
                </div>
              )}
            </div>

            {/* 导出按钮 */}
            <div className="flex gap-4">
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-green-600 text-white rounded-lg 
                  hover:bg-green-700 transition shadow-lg flex items-center gap-2"
              >
                📥 导出CSV
              </button>
              <button
                onClick={() => setAnalysis(null)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg 
                  hover:bg-gray-300 transition"
              >
                🔄 清空
              </button>
            </div>
          </>
        )}

        {/* 空状态 */}
        {!analysis && !loading && !error && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-8xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无分析数据</h3>
            <p className="text-gray-500">请上传日志文件或输入文件路径进行分析</p>
          </div>
        )}
      </div>
    </div>
  );
}
