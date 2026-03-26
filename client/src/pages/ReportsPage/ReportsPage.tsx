import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileTextIcon, 
  PlusIcon, 
  SearchIcon, 
  EyeIcon, 
  DownloadIcon, 
  Trash2Icon,
  FileSpreadsheetIcon,
  FileBarChartIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

// 类型定义
interface ITestStep {
  stepNumber: number;
  stepName: string;
  result: 'PASS' | 'FAIL' | 'SKIP';
  value?: number;
  limit?: string;
}

interface ITestCase {
  id: string;
  testName: string;
  result: 'PASS' | 'FAIL' | 'SKIP';
  value?: number;
  lowerLimit?: number;
  upperLimit?: number;
  unit?: string;
  testTime: string;
  steps: ITestStep[];
}

interface IFault {
  id: string;
  testCaseId: string;
  testName: string;
  stepName: string;
  severity: 'fatal' | 'critical' | 'general' | 'hint';
  errorMessage: string;
  occurrenceTime: string;
  aiAnalysis?: {
    rootCause: string;
    suggestions: string[];
    confidence: number;
  };
}

interface IReport {
  id: string;
  title: string;
  type: 'test' | 'fault';
  createTime: string;
  content: any;
  status: 'draft' | 'completed';
}

const TEST_CASES_KEY = '__global_tdp_testCases';
const FAULTS_KEY = '__global_tdp_faults';
const REPORTS_KEY = '__global_tdp_reports';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<IReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewReport, setPreviewReport] = useState<IReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testCases, setTestCases] = useState<ITestCase[]>([]);
  const [faults, setFaults] = useState<IFault[]>([]);

  // 从 LocalStorage 加载数据
  useEffect(() => {
    const loadData = () => {
      try {
        const savedReports = localStorage.getItem(REPORTS_KEY);
        const savedTestCases = localStorage.getItem(TEST_CASES_KEY);
        const savedFaults = localStorage.getItem(FAULTS_KEY);

        if (savedReports) {
          setReports(JSON.parse(savedReports));
        }
        if (savedTestCases) {
          setTestCases(JSON.parse(savedTestCases));
        } else {
          setTestCases([]);
        }
        if (savedFaults) {
          setFaults(JSON.parse(savedFaults));
        } else {
          setFaults([]);
        }
      } catch (error) {
        logger.error('加载数据失败:', error);
      }
    };

    loadData();
    
    // 添加 visibilitychange 监听，页面重新可见时刷新数据
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 保存报告到 LocalStorage
  const saveReports = (newReports: IReport[]) => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(newReports));
    setReports(newReports);
  };

  // 生成测试报告
  const generateTestReport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const passCount = testCases.filter(tc => tc.result === 'PASS').length;
      const failCount = testCases.filter(tc => tc.result === 'FAIL').length;
      const skipCount = testCases.filter(tc => tc.result === 'SKIP').length;
      const totalCount = testCases.length;
      const passRate = totalCount > 0 ? (passCount / totalCount * 100).toFixed(2) : '0.00';

      // 按测试名称分组统计
      const testNameStats = testCases.reduce((acc, tc) => {
        if (!acc[tc.testName]) {
          acc[tc.testName] = { total: 0, pass: 0, fail: 0 };
        }
        acc[tc.testName].total++;
        if (tc.result === 'PASS') acc[tc.testName].pass++;
        if (tc.result === 'FAIL') acc[tc.testName].fail++;
        return acc;
      }, {} as Record<string, { total: number; pass: number; fail: number }>);

      const newReport: IReport = {
        id: `report_${Date.now()}`,
        title: `测试报告 - ${new Date().toLocaleDateString('zh-CN')}`,
        type: 'test',
        createTime: new Date().toISOString(),
        status: 'completed',
        content: {
          summary: {
            totalTests: totalCount,
            passCount,
            failCount,
            skipCount,
            passRate: `${passRate}%`
          },
          testNameStats,
          details: testCases
        }
      };

      const updatedReports = [newReport, ...reports];
      saveReports(updatedReports);
      setIsGenerating(false);
    }, 1500);
  };

  // 生成故障分析报告
  const generateFaultReport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const severityStats = faults.reduce((acc, fault) => {
        acc[fault.severity] = (acc[fault.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const newReport: IReport = {
        id: `fault_report_${Date.now()}`,
        title: `故障分析报告 - ${new Date().toLocaleDateString('zh-CN')}`,
        type: 'fault',
        createTime: new Date().toISOString(),
        status: 'completed',
        content: {
          summary: {
            totalFaults: faults.length,
            fatalCount: severityStats.fatal || 0,
            criticalCount: severityStats.critical || 0,
            generalCount: severityStats.general || 0,
            hintCount: severityStats.hint || 0
          },
          severityStats,
          details: faults
        }
      };

      const updatedReports = [newReport, ...reports];
      saveReports(updatedReports);
      setIsGenerating(false);
    }, 1500);
  };

  // 删除报告
  const deleteReport = (reportId: string) => {
    const updatedReports = reports.filter(r => r.id !== reportId);
    saveReports(updatedReports);
  };

  // 导出报告为 JSON
  const exportReport = (report: IReport) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${report.title.replace(/\s+/g, '_')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 获取严重程度标签
  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { color: string; label: string }> = {
      fatal: { color: 'bg-destructive text-destructive-foreground', label: '致命' },
      critical: { color: 'bg-warning text-warning-foreground', label: '严重' },
      general: { color: 'bg-chart-2 text-primary-foreground', label: '一般' },
      hint: { color: 'bg-muted text-muted-foreground', label: '提示' }
    };
    const { color, label } = config[severity] || config.general;
    return <Badge className={color}>{label}</Badge>;
  };

  // 筛选报告
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <>
      <div className="w-full flex flex-col gap-6">
        {/* 页面标题 */}
        <section className="w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">报告中心</h1>
              <p className="text-muted-foreground mt-1">生成和导出各类测试分析报告</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={generateFaultReport}
                disabled={isGenerating || faults.length === 0}
              >
                <AlertTriangleIcon className="w-4 h-4 mr-2" />
                {isGenerating ? '生成中...' : '生成故障报告'}
              </Button>
              <Button 
                onClick={generateTestReport}
                disabled={isGenerating || testCases.length === 0}
              >
                <FileBarChartIcon className="w-4 h-4 mr-2" />
                {isGenerating ? '生成中...' : '生成测试报告'}
              </Button>
            </div>
          </div>
        </section>

        {/* 统计卡片 */}
        <section className="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">报告总数</p>
                  <p className="text-2xl font-mono font-bold text-foreground mt-1">{reports.length}</p>
                </div>
                <FileTextIcon className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">测试报告</p>
                  <p className="text-2xl font-mono font-bold text-foreground mt-1">
                    {reports.filter(r => r.type === 'test').length}
                  </p>
                </div>
                <FileSpreadsheetIcon className="w-8 h-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">故障报告</p>
                  <p className="text-2xl font-mono font-bold text-foreground mt-1">
                    {reports.filter(r => r.type === 'fault').length}
                  </p>
                </div>
                <AlertTriangleIcon className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-mono font-bold text-foreground mt-1">
                    {reports.filter(r => r.status === 'completed').length}
                  </p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 筛选栏 */}
        <section className="w-full">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索报告..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="报告类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="test">测试报告</SelectItem>
                    <SelectItem value="fault">故障报告</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 报告列表 */}
        <section className="w-full">
          <Card>
            <CardHeader>
              <CardTitle>报告列表</CardTitle>
              <CardDescription>共 {filteredReports.length} 个报告</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无报告</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {testCases.length === 0 && faults.length === 0 
                      ? '请先导入测试数据或故障数据' 
                      : '点击上方按钮生成报告'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>报告名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {report.type === 'test' ? (
                              <FileSpreadsheetIcon className="w-4 h-4 text-chart-2" />
                            ) : (
                              <AlertTriangleIcon className="w-4 h-4 text-warning" />
                            )}
                            <span className="font-medium">{report.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.type === 'test' ? 'secondary' : 'default'}>
                            {report.type === 'test' ? '测试报告' : '故障报告'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.status === 'completed' ? 'default' : 'outline'}>
                            {report.status === 'completed' ? '已完成' : '草稿'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(report.createTime).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewReport(report)}
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => exportReport(report)}
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteReport(report.id)}
                            >
                              <Trash2Icon className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* 报告预览对话框 */}
      <Dialog open={!!previewReport} onOpenChange={() => setPreviewReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewReport?.type === 'test' ? (
                <FileSpreadsheetIcon className="w-5 h-5 text-chart-2" />
              ) : (
                <AlertTriangleIcon className="w-5 h-5 text-warning" />
              )}
              {previewReport?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-4">
              {/* 摘要信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewReport?.content?.summary && Object.entries(previewReport.content.summary).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground capitalize">
                        {key === 'totalTests' ? '测试总数' :
                         key === 'passCount' ? '通过数' :
                         key === 'failCount' ? '失败数' :
                         key === 'skipCount' ? '跳过数' :
                         key === 'passRate' ? '通过率' :
                         key === 'totalFaults' ? '故障总数' :
                         key === 'fatalCount' ? '致命' :
                         key === 'criticalCount' ? '严重' :
                         key === 'generalCount' ? '一般' :
                         key === 'hintCount' ? '提示' : key}
                      </p>
                      <p className="text-xl font-mono font-bold text-foreground mt-1">{String(value)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 详情表格 */}
              {previewReport?.type === 'fault' && previewReport?.content?.details && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">故障详情</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>测试项</TableHead>
                        <TableHead>步骤</TableHead>
                        <TableHead>严重程度</TableHead>
                        <TableHead>错误信息</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewReport.content.details.slice(0, 10).map((fault: IFault) => (
                        <TableRow key={fault.id}>
                          <TableCell>{fault.testName}</TableCell>
                          <TableCell>{fault.stepName}</TableCell>
                          <TableCell>{getSeverityBadge(fault.severity)}</TableCell>
                          <TableCell className="max-w-xs truncate">{fault.errorMessage}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewReport.content.details.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      还有 {previewReport.content.details.length - 10} 条数据...
                    </p>
                  )}
                </div>
              )}

              {previewReport?.type === 'test' && previewReport?.content?.details && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">测试详情</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>测试名称</TableHead>
                        <TableHead>结果</TableHead>
                        <TableHead>数值</TableHead>
                        <TableHead>测试时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewReport.content.details.slice(0, 10).map((test: ITestCase) => (
                        <TableRow key={test.id}>
                          <TableCell>{test.testName}</TableCell>
                          <TableCell>
                            <Badge variant={test.result === 'PASS' ? 'default' : test.result === 'FAIL' ? 'destructive' : 'secondary'}>
                              {test.result}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {test.value !== undefined ? `${test.value}${test.unit || ''}` : '-'}
                          </TableCell>
                          <TableCell>{new Date(test.testTime).toLocaleString('zh-CN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewReport.content.details.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      还有 {previewReport.content.details.length - 10} 条数据...
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewReport(null)}>
              关闭
            </Button>
            {previewReport && (
              <Button onClick={() => exportReport(previewReport)}>
                <DownloadIcon className="w-4 h-4 mr-2" />
                导出报告
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportsPage;
