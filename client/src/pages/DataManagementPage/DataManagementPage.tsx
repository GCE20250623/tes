import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchIcon, FilterIcon, EyeIcon, HistoryIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { logger } from '@lark-apaas/client-toolkit/logger';

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

const STORAGE_KEY = '__global_tdp_testCases';

const getTestCasesFromStorage = (): ITestCase[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    logger.error('读取存储数据失败:', e);
  }
  return [];
};

const DataManagementPage: React.FC = () => {
  const [testCases, setTestCases] = useState<ITestCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<ITestCase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<ITestCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const data = getTestCasesFromStorage();
    setTestCases(data);
    setFilteredCases(data);
  }, []);

  useEffect(() => {
    let filtered = testCases;
    
    if (searchQuery) {
      filtered = filtered.filter(tc => 
        tc.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tc.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (resultFilter !== 'all') {
      filtered = filtered.filter(tc => tc.result === resultFilter);
    }
    
    setFilteredCases(filtered);
    setCurrentPage(1);
  }, [searchQuery, resultFilter, testCases]);

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASS':
        return <Badge className="bg-success/20 text-success hover:bg-success/20">PASS</Badge>;
      case 'FAIL':
        return <Badge className="bg-error/20 text-error hover:bg-error/20">FAIL</Badge>;
      case 'SKIP':
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/20">SKIP</Badge>;
      default:
        return <Badge variant="secondary">{result}</Badge>;
    }
  };

  const columns = [
    {
      title: '测试ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => <span className="font-mono text-sm">{id}</span>,
    },
    {
      title: '测试名称',
      dataIndex: 'testName',
      key: 'testName',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: '测试结果',
      dataIndex: 'result',
      key: 'result',
      width: 120,
      render: (result: string) => getResultBadge(result),
    },
    {
      title: '测试值',
      key: 'value',
      width: 150,
      render: (_: unknown, record: ITestCase) => (
        <span className="font-mono">
          {record.value !== undefined ? `${record.value} ${record.unit || ''}` : '-'}
        </span>
      ),
    },
    {
      title: '测试时间',
      dataIndex: 'testTime',
      key: 'testTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: ITestCase) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCase(record);
              setDetailOpen(true);
            }}
          >
            <EyeIcon className="size-4 mr-1" />
            详情
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCase(record);
              setHistoryOpen(true);
            }}
          >
            <HistoryIcon className="size-4 mr-1" />
            历史
          </Button>
        </div>
      ),
    },
  ];

  const paginatedData = filteredCases.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredCases.length / pageSize);

  return (
    <>
      <style jsx>{`
        .data-management-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <section className="w-full data-management-page">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">测试数据管理</h1>
          <p className="text-muted-foreground mt-1">查看、筛选和管理所有测试用例数据</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="搜索测试名称或ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={resultFilter} onValueChange={setResultFilter}>
                  <SelectTrigger className="w-[140px]">
                    <FilterIcon className="size-4 mr-2" />
                    <SelectValue placeholder="结果筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部结果</SelectItem>
                    <SelectItem value="PASS">通过</SelectItem>
                    <SelectItem value="FAIL">失败</SelectItem>
                    <SelectItem value="SKIP">跳过</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setResultFilter('all');
                  }}
                >
                  重置
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              测试用例列表
              <span className="text-muted-foreground text-sm font-normal ml-2">
                共 {filteredCases.length} 条记录
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={columns}
              dataSource={paginatedData}
              rowKey="id"
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  第 {currentPage} / {totalPages} 页
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>测试详情</DialogTitle>
            </DialogHeader>
            {selectedCase && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">测试ID</label>
                    <p className="font-mono">{selectedCase.id}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">测试结果</label>
                    <p>{getResultBadge(selectedCase.result)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">测试名称</label>
                    <p className="font-medium">{selectedCase.testName}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">测试时间</label>
                    <p>{new Date(selectedCase.testTime).toLocaleString('zh-CN')}</p>
                  </div>
                  {selectedCase.value !== undefined && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">测试值</label>
                        <p className="font-mono text-primary">{selectedCase.value} {selectedCase.unit}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">标准范围</label>
                        <p className="font-mono">
                          {selectedCase.lowerLimit} ~ {selectedCase.upperLimit} {selectedCase.unit}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">测试步骤</h4>
                  <div className="space-y-2">
                    {selectedCase.steps.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <span className="size-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-mono">
                            {step.stepNumber}
                          </span>
                          <span>{step.stepName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {step.value !== undefined && (
                            <span className="font-mono text-sm text-muted-foreground">
                              {step.value} {step.limit?.includes('V') ? 'V' : step.limit?.includes('A') ? 'A' : ''}
                            </span>
                          )}
                          {getResultBadge(step.result)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>执行历史</DialogTitle>
            </DialogHeader>
            {selectedCase && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">测试名称</p>
                  <p className="font-medium">{selectedCase.testName}</p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { date: '2026-03-05', result: selectedCase.result, duration: '2m 35s' },
                    { date: '2026-03-04', result: 'PASS', duration: '2m 28s' },
                    { date: '2026-03-03', result: 'PASS', duration: '2m 41s' },
                    { date: '2026-03-02', result: 'FAIL', duration: '1m 52s' },
                  ].map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <HistoryIcon className="size-4 text-muted-foreground" />
                        <span>{record.date}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground font-mono">{record.duration}</span>
                        {getResultBadge(record.result)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
};

export default DataManagementPage;
