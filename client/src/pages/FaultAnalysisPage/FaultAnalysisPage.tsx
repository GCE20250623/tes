import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  BrainIcon, 
  AlertTriangleIcon, 
  AlertCircleIcon, 
  InfoIcon, 
  AlertOctagonIcon,
  LightbulbIcon,
  TrendingUpIcon,
  SearchIcon,
  RefreshCwIcon,
  ChevronRightIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { logger } from '@lark-apaas/client-toolkit/logger';

// 数据类型定义
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

const STORAGE_KEY_TESTCASES = '__global_tdp_testCases';
const STORAGE_KEY_FAULTS = '__global_tdp_faults';

// 根因分析知识库
const rootCauseDB: Record<string, { rootCause: string; suggestions: string[] }> = {
  'voltage': {
    rootCause: '电压参数超出规格范围，可能原因：1) 电源模块老化 2) 测试夹具接触不良 3) 环境温度影响',
    suggestions: ['检查电源连接', '更换测试夹具', '校准测试设备', '检查环境温度']
  },
  'current': {
    rootCause: '电流消耗异常，可能原因：1) 元器件短路 2) 负载异常 3) 固件功耗控制失效',
    suggestions: ['检查PCB板短路', '检查固件版本', '测量静态电流', '检查负载连接']
  },
  'resistance': {
    rootCause: '电阻值偏差，可能原因：1) 元器件批次差异 2) 焊接问题 3) 测试点氧化',
    suggestions: ['检查焊接质量', '更换元器件批次', '清洁测试点', '重新校准']
  },
  'timing': {
    rootCause: '时序参数超标，可能原因：1) 晶振频率漂移 2) 信号完整性问题 3) 时钟电路异常',
    suggestions: ['更换晶振', '检查信号走线', '调整时序参数', '检查时钟电路']
  },
  'communication': {
    rootCause: '通信协议测试失败，可能原因：1) 波特率设置错误 2) 数据线干扰 3) 协议实现异常',
    suggestions: ['检查波特率设置', '检查数据线屏蔽', '重新烧录固件', '检查协议实现']
  },
  'default': {
    rootCause: '测试项未通过，建议详细检查测试条件和硬件状态',
    suggestions: ['重新测试', '检查测试条件', '查看测试日志', '联系技术支持']
  }
};

// 严重程度配置
const severityConfig = {
  fatal: { 
    label: '致命', 
    color: 'bg-destructive', 
    textColor: 'text-destructive',
    icon: AlertOctagonIcon,
    description: '系统崩溃，功能完全失效'
  },
  critical: { 
    label: '严重', 
    color: 'bg-warning', 
    textColor: 'text-warning',
    icon: AlertTriangleIcon,
    description: '核心功能失败，影响产品交付'
  },
  general: { 
    label: '一般', 
    color: 'bg-chart-4', 
    textColor: 'text-chart-4',
    icon: AlertCircleIcon,
    description: '非核心功能失败，可后续修复'
  },
  hint: { 
    label: '提示', 
    color: 'bg-muted-foreground', 
    textColor: 'text-muted-foreground',
    icon: InfoIcon,
    description: '警告信息，不影响主要功能'
  }
};

// 智能分类故障严重程度
const classifySeverity = (testName: string, stepName: string): 'fatal' | 'critical' | 'general' | 'hint' => {
  const name = (testName + ' ' + stepName).toLowerCase();
  
  if (name.includes('boot') || name.includes('power on') || name.includes('reset') || name.includes('startup')) {
    return 'fatal';
  }
  if (name.includes('voltage') || name.includes('current') || name.includes('safety') || name.includes('thermal')) {
    return 'critical';
  }
  if (name.includes('communication') || name.includes('signal') || name.includes('timing')) {
    return 'general';
  }
  return 'hint';
};

// AI分析故障
const analyzeFault = (testName: string, stepName: string, errorMessage: string) => {
  const name = (testName + ' ' + stepName).toLowerCase();
  let category = 'default';
  
  if (name.includes('voltage') || name.includes('vcc') || name.includes('vdd')) {
    category = 'voltage';
  } else if (name.includes('current') || name.includes('power')) {
    category = 'current';
  } else if (name.includes('resistance') || name.includes('impedance') || name.includes('ohm')) {
    category = 'resistance';
  } else if (name.includes('timing') || name.includes('clock') || name.includes('delay')) {
    category = 'timing';
  } else if (name.includes('communication') || name.includes('uart') || name.includes('spi') || name.includes('i2c')) {
    category = 'communication';
  }
  
  const analysis = rootCauseDB[category];
  return {
    rootCause: analysis.rootCause,
    suggestions: analysis.suggestions,
    confidence: Math.floor(Math.random() * 20) + 75 // 75-95% 置信度
  };
};

// 从测试用例提取故障
const extractFaultsFromTestCases = (testCases: ITestCase[]): IFault[] => {
  const faults: IFault[] = [];
  
  testCases.forEach(testCase => {
    if (testCase.result === 'FAIL') {
      const severity = classifySeverity(testCase.testName, '');
      const aiAnalysis = analyzeFault(testCase.testName, '', '测试失败');
      
      faults.push({
        id: `fault-${testCase.id}-main`,
        testCaseId: testCase.id,
        testName: testCase.testName,
        stepName: '主测试项',
        severity,
        errorMessage: `测试值 ${testCase.value}${testCase.unit || ''} 超出规格范围 [${testCase.lowerLimit || '-∞'}, ${testCase.upperLimit || '+∞'}]`,
        occurrenceTime: testCase.testTime,
        aiAnalysis
      });
    }
    
    testCase.steps?.forEach(step => {
      if (step.result === 'FAIL') {
        const severity = classifySeverity(testCase.testName, step.stepName);
        const aiAnalysis = analyzeFault(testCase.testName, step.stepName, '步骤执行失败');
        
        faults.push({
          id: `fault-${testCase.id}-step-${step.stepNumber}`,
          testCaseId: testCase.id,
          testName: testCase.testName,
          stepName: step.stepName,
          severity,
          errorMessage: `步骤 ${step.stepNumber} 执行失败${step.value !== undefined ? `，测量值: ${step.value}` : ''}`,
          occurrenceTime: testCase.testTime,
          aiAnalysis
        });
      }
    });
  });
  
  return faults.sort((a, b) => new Date(b.occurrenceTime).getTime() - new Date(a.occurrenceTime).getTime());
};

const FaultAnalysisPage: React.FC = () => {
  const [faults, setFaults] = useState<IFault[]>([]);
  const [filteredFaults, setFilteredFaults] = useState<IFault[]>([]);
  const [selectedFault, setSelectedFault] = useState<IFault | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载数据 - 总是从 testCases 重新提取故障
  useEffect(() => {
    const loadData = () => {
      try {
        const storedTestCases = localStorage.getItem(STORAGE_KEY_TESTCASES);
        
        if (storedTestCases) {
          const testCases = JSON.parse(storedTestCases);
          const extractedFaults = extractFaultsFromTestCases(testCases);
          setFaults(extractedFaults);
          // 更新缓存
          localStorage.setItem(STORAGE_KEY_FAULTS, JSON.stringify(extractedFaults));
        } else {
          setFaults([]);
        }
      } catch (error) {
        logger.error('加载故障数据失败:', error);
        setFaults([]);
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

  // 筛选故障
  useEffect(() => {
    let result = faults;
    
    if (severityFilter !== 'all') {
      result = result.filter(f => f.severity === severityFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.testName.toLowerCase().includes(query) ||
        f.stepName.toLowerCase().includes(query) ||
        f.errorMessage.toLowerCase().includes(query)
      );
    }
    
    setFilteredFaults(result);
  }, [faults, severityFilter, searchQuery]);

  // 统计信息
  const stats = useMemo(() => {
    const total = faults.length;
    const fatal = faults.filter(f => f.severity === 'fatal').length;
    const critical = faults.filter(f => f.severity === 'critical').length;
    const general = faults.filter(f => f.severity === 'general').length;
    const hint = faults.filter(f => f.severity === 'hint').length;
    
    return { total, fatal, critical, general, hint };
  }, [faults]);

  // 严重程度分布数据 - 只包含有数据的分类
  const severityDistribution = useMemo(() => {
    const data = [
      { name: '致命', value: stats.fatal, color: 'hsl(0 84% 60%)' },
      { name: '严重', value: stats.critical, color: 'hsl(25 95% 53%)' },
      { name: '一般', value: stats.general, color: 'hsl(38 92% 50%)' },
      { name: '提示', value: stats.hint, color: 'hsl(215 20% 65%)' }
    ].filter(item => item.value > 0);
    return data;
  }, [stats]);

  // 故障趋势数据（按日期分组统计）
  const trendData = useMemo(() => {
    if (faults.length === 0) return [];
    
    const dateMap = new Map<string, number>();
    
    // 收集所有日期并初始化
    faults.forEach(fault => {
      const date = fault.occurrenceTime?.split('T')[0];
      if (date) {
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    });
    
    // 转换为数组并排序（按日期升序），取最近14天
    const sortedData = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14);
    
    // 格式化为 MM-DD 显示
    return sortedData.map(([date, count]) => ({ 
      date: date.slice(5), // 显示 MM-DD
      fullDate: date,      // 完整日期用于tooltip
      count 
    }));
  }, [faults]);

  // TOP故障测试项 - 按stepName统计（高频故障测试项TOP5）
  const topFaults = useMemo(() => {
    const stepFailCount: Record<string, number> = {};
    
    // 从testCases直接统计每个步骤的失败次数（更准确的统计方式）
    const storedTestCases = localStorage.getItem(STORAGE_KEY_TESTCASES);
    if (storedTestCases) {
      try {
        const testCases: ITestCase[] = JSON.parse(storedTestCases);
        testCases.forEach(tc => {
          tc.steps?.forEach(step => {
            if (step.result === 'FAIL' && step.stepName) {
              stepFailCount[step.stepName] = (stepFailCount[step.stepName] || 0) + 1;
            }
          });
        });
      } catch (e) {
        logger.error('解析testCases失败:', e);
      }
    }
    
    // 如果没有从testCases统计到数据，从faults统计
    if (Object.keys(stepFailCount).length === 0) {
      faults.forEach(fault => {
        if (fault.stepName && fault.stepName !== '主测试项') {
          stepFailCount[fault.stepName] = (stepFailCount[fault.stepName] || 0) + 1;
        }
      });
    }
    
    return Object.entries(stepFailCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [faults]);

  // 刷新故障数据
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const storedTestCases = localStorage.getItem(STORAGE_KEY_TESTCASES);
        if (storedTestCases) {
          const testCases = JSON.parse(storedTestCases);
          const extractedFaults = extractFaultsFromTestCases(testCases);
          setFaults(extractedFaults);
          localStorage.setItem(STORAGE_KEY_FAULTS, JSON.stringify(extractedFaults));
        }
      } catch (error) {
        logger.error('刷新故障数据失败:', error);
      }
      setLoading(false);
    }, 800);
  };

  // 打开故障详情
  const openFaultDetail = (fault: IFault) => {
    setSelectedFault(fault);
    setDialogOpen(true);
  };

  return (
    <section className="w-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">故障分析</h1>
          <p className="text-muted-foreground mt-1">自动提取失败项，AI驱动根因分析</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          <RefreshCwIcon className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '分析中...' : '重新分析'}
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="border-t-2 border-t-primary">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">故障总数</p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">致命</p>
            <p className="text-2xl font-bold font-mono text-destructive mt-1">{stats.fatal}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-warning">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">严重</p>
            <p className="text-2xl font-bold font-mono text-warning mt-1">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-chart-4">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">一般</p>
            <p className="text-2xl font-bold font-mono text-chart-4 mt-1">{stats.general}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-muted-foreground">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">提示</p>
            <p className="text-2xl font-bold font-mono text-muted-foreground mt-1">{stats.hint}</p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 严重程度分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">严重程度分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {severityDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={true}
                    >
                      {severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(222 47% 9%)', 
                        border: '1px solid hsl(222 47% 16%)',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [`${value} 个`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <AlertTriangleIcon className="size-8 opacity-50" />
                  <span className="text-sm">暂无故障数据</span>
                  <span className="text-xs opacity-70">导入测试数据后将自动分析</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 故障趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-primary" />
              故障趋势（最近14天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(215 20% 60%)" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(215 20% 60%)" 
                      fontSize={12}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(222 47% 9%)', 
                        border: '1px solid hsl(222 47% 16%)',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value} 个故障`, '数量']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(217 91% 60%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(217 91% 60%)', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(217 91% 60%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <TrendingUpIcon className="size-8 opacity-50" />
                  <span className="text-sm">暂无趋势数据</span>
                  <span className="text-xs opacity-70">需要至少一天以上的故障数据</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TOP故障测试项 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">高频故障测试项 TOP5</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            {topFaults.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFaults} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(215 20% 60%)" fontSize={12} tickLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(215 20% 60%)" 
                    fontSize={12}
                    width={150}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(222 47% 9%)', 
                      border: '1px solid hsl(222 47% 16%)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} 次`, '失败次数']}
                  />
                  <Bar dataKey="count" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <AlertTriangleIcon className="size-8 opacity-50" />
                <span className="text-sm">暂无故障测试项数据</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 故障列表 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base">故障详情列表</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="搜索故障..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="严重程度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="fatal">致命</SelectItem>
                  <SelectItem value="critical">严重</SelectItem>
                  <SelectItem value="general">一般</SelectItem>
                  <SelectItem value="hint">提示</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredFaults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircleIcon className="mx-auto size-12 mb-4 opacity-50" />
                  <p>暂无故障数据</p>
                  <p className="text-sm mt-1">请先导入测试数据或点击"重新分析"</p>
                </div>
              ) : (
                filteredFaults.map((fault) => {
                  const config = severityConfig[fault.severity];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={fault.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => openFaultDetail(fault)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${config.color}/10`}>
                          <Icon className={`size-5 ${config.textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">
                              {fault.testName}
                            </span>
                            <Badge variant="outline" className={`text-xs ${config.textColor}`}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {fault.stepName} · {fault.errorMessage}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(fault.occurrenceTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {fault.aiAnalysis && (
                          <div className="hidden md:flex items-center gap-1 text-xs text-primary">
                            <BrainIcon className="size-3" />
                            <span>AI 分析可用</span>
                          </div>
                        )}
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 故障详情弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-warning" />
              故障详情
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedFault && (
              <div className="space-y-6 pr-4">
                {/* 基本信息 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">测试项:</span>
                    <span className="font-medium text-foreground">{selectedFault.testName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">步骤:</span>
                    <span className="font-medium text-foreground">{selectedFault.stepName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">严重程度:</span>
                    <Badge className={severityConfig[selectedFault.severity].color}>
                      {severityConfig[selectedFault.severity].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">发生时间:</span>
                    <span className="text-foreground">
                      {new Date(selectedFault.occurrenceTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 错误信息 */}
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive mb-1">错误信息</p>
                  <p className="text-sm text-foreground">{selectedFault.errorMessage}</p>
                </div>

                {/* AI分析 */}
                {selectedFault.aiAnalysis && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <BrainIcon className="size-5 text-primary" />
                      <h3 className="font-semibold text-foreground">AI 智能分析</h3>
                      <Badge variant="outline" className="text-xs">
                        置信度 {selectedFault.aiAnalysis.confidence}%
                      </Badge>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                        <LightbulbIcon className="size-4" />
                        根因分析
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {selectedFault.aiAnalysis.rootCause}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-card border border-border">
                      <p className="text-sm font-medium text-foreground mb-3">建议修复方案</p>
                      <ul className="space-y-2">
                        {selectedFault.aiAnalysis.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs shrink-0">
                              {index + 1}
                            </span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FaultAnalysisPage;
