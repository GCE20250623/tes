import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ActivityIcon,
  BarChart3Icon,
} from 'lucide-react';
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
  Cell,
  BarChart,
  Bar,
} from 'recharts';
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

interface CPKData {
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
}

const STORAGE_KEY = '__global_tdp_testCases';

const COLORS = {
  primary: 'hsl(217 91% 60%)',
  secondary: 'hsl(250 80% 65%)',
  tertiary: 'hsl(280 70% 60%)',
  quaternary: 'hsl(190 80% 50%)',
  quinary: 'hsl(320 70% 55%)',
  success: 'hsl(142 71% 45%)',
  warning: 'hsl(38 92% 50%)',
  error: 'hsl(0 84% 60%)',
};

const PIE_COLORS = [
  COLORS.error,
  COLORS.warning,
  COLORS.primary,
  COLORS.secondary,
  COLORS.tertiary,
];

// 计算CPK指标
const calculateCPK = (values: number[], lowerLimit?: number, upperLimit?: number): CPKData => {
  if (values.length === 0 || !lowerLimit || !upperLimit) {
    return { cp: 0, cpk: 0, pp: 0, ppk: 0 };
  }

  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const usl = upperLimit;
  const lsl = lowerLimit;
  const target = (usl + lsl) / 2;

  // Cp = (USL - LSL) / (6 * σ)
  const cp = stdDev > 0 ? (usl - lsl) / (6 * stdDev) : 0;

  // Cpk = min[(USL - μ) / (3σ), (μ - LSL) / (3σ)]
  const cpu = stdDev > 0 ? (usl - mean) / (3 * stdDev) : 0;
  const cpl = stdDev > 0 ? (mean - lsl) / (3 * stdDev) : 0;
  const cpk = Math.min(cpu, cpl);

  // Pp = (USL - LSL) / (6 * s)
  const s = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1 || 1));
  const pp = s > 0 ? (usl - lsl) / (6 * s) : 0;

  // Ppk = min[(USL - μ) / (3s), (μ - LSL) / (3s)]
  const ppu = s > 0 ? (usl - mean) / (3 * s) : 0;
  const ppl = s > 0 ? (mean - lsl) / (3 * s) : 0;
  const ppk = Math.min(ppu, ppl);

  return {
    cp: Number(cp.toFixed(3)),
    cpk: Number(cpk.toFixed(3)),
    pp: Number(pp.toFixed(3)),
    ppk: Number(ppk.toFixed(3)),
  };
};



const DashboardPage: React.FC = () => {
  const [testCases, setTestCases] = useState<ITestCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setTestCases(parsed);
        } else {
          setTestCases([]);
        }
      } catch (error) {
        logger.error('Failed to load test cases:', error);
        setTestCases([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 统计数据
  const stats = useMemo(() => {
    const total = testCases.length;
    const passCount = testCases.filter(tc => tc.result === 'PASS').length;
    const failCount = testCases.filter(tc => tc.result === 'FAIL').length;
    const skipCount = testCases.filter(tc => tc.result === 'SKIP').length;
    const passRate = total > 0 ? (passCount / total) * 100 : 0;

    return { total, passCount, failCount, skipCount, passRate };
  }, [testCases]);

  // CPK计算
  const cpkData = useMemo(() => {
    const values = testCases
      .filter(tc => tc.value !== undefined && tc.lowerLimit !== undefined && tc.upperLimit !== undefined)
      .map(tc => tc.value!);

    const lowerLimit = testCases[0]?.lowerLimit;
    const upperLimit = testCases[0]?.upperLimit;

    return calculateCPK(values, lowerLimit, upperLimit);
  }, [testCases]);

  // 测试趋势图数据 - 按日期统计每日测试结果分布（PASS/FAIL/SKIP数量）
  const trendData = useMemo(() => {
    const dateMap = new Map<string, { date: string; PASS: number; FAIL: number; SKIP: number }>();

    testCases.forEach(tc => {
      const date = tc.testTime.split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { date: date.slice(5), PASS: 0, FAIL: 0, SKIP: 0 });
      }
      const dayData = dateMap.get(date)!;
      dayData[tc.result]++;
    });

    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [testCases]);

  // 步骤名称映射：直接使用stepName，如果已经是StepX格式则保持不变
  const stepNameMapping = useMemo(() => {
    const uniqueStepNames = new Set<string>();
    testCases.forEach(tc => {
      tc.steps.forEach(step => {
        if (step.stepName) {
          uniqueStepNames.add(step.stepName);
        }
      });
    });
    
    // 调试：记录实际收集到的步骤名称数量
    logger.info('[Dashboard] Unique step names count:', uniqueStepNames.size);
    logger.info('[Dashboard] Unique step names:', Array.from(uniqueStepNames).slice(0, 20));
    
    const mapping: Record<string, string> = {};
    
    // 直接使用stepName，假设ImportPage已经正确设置为Step1, Step2...
    Array.from(uniqueStepNames).forEach((name) => {
      // 如果已经是StepX格式，直接使用
      if (/^Step\d+$/i.test(name)) {
        mapping[name] = name;
      } else {
        // 否则保留原名
        mapping[name] = name;
      }
    });
    
    return mapping;
  }, [testCases]);

  // FAIL分布数据 - 按步骤名称统计，显示为Step编号
  const failDistribution = useMemo(() => {
    const stepFailCount: Record<string, number> = {};

    testCases.forEach(tc => {
      tc.steps.forEach(step => {
        if (step.result === 'FAIL' && step.stepName) {
          stepFailCount[step.stepName] = (stepFailCount[step.stepName] || 0) + 1;
        }
      });
    });

    return Object.entries(stepFailCount)
      .map(([name, value]) => ({ 
        name: name, 
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [testCases, stepNameMapping]);

  // FAIL步骤TOP5 - 按步骤名称展示（失败次数最多的前5个步骤），出现次数多的在上面
  const failStepTop5 = useMemo(() => {
    const stepFailCount: Record<string, number> = {};

    testCases.forEach(tc => {
      tc.steps.forEach(step => {
        if (step.result === 'FAIL' && step.stepName) {
          stepFailCount[step.stepName] = (stepFailCount[step.stepName] || 0) + 1;
        }
      });
    });

    return Object.entries(stepFailCount)
      .map(([name, value]) => ({ 
        name: name, 
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [testCases, stepNameMapping]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">数据仪表板</h1>
          <p className="text-muted-foreground mt-1">测试数据核心指标与可视化分析</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          数据更新时间: {new Date().toLocaleString('zh-CN')}
        </Badge>
      </div>

      {/* 测试统计卡片 */}
      <section className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3Icon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">测试统计概览</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-t-2 border-t-primary bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总测试数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">全部测试用例</p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-success bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                通过
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{stats.passCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                占比 {stats.total > 0 ? ((stats.passCount / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-error bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4" />
                失败
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{stats.failCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                占比 {stats.total > 0 ? ((stats.failCount / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-warning bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4" />
                测试直通率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{stats.passRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.passRate >= 95 ? '优秀' : stats.passRate >= 85 ? '良好' : '需改进'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CPK指标卡片 */}
      <section className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <ActivityIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">CPK过程能力指数</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-t-2 border-t-primary bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cp (潜在能力)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{cpkData.cp.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {cpkData.cp >= 1.33 ? '优秀' : cpkData.cp >= 1.0 ? '良好' : '需改进'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-primary bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cpk (实际能力)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{cpkData.cpk.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {cpkData.cpk >= 1.33 ? '优秀' : cpkData.cpk >= 1.0 ? '良好' : '需改进'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-primary bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pp (性能指数)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{cpkData.pp.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {cpkData.pp >= 1.33 ? '优秀' : cpkData.pp >= 1.0 ? '良好' : '需改进'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-primary bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ppk (性能能力)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-foreground">{cpkData.ppk.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {cpkData.ppk >= 1.33 ? '优秀' : cpkData.ppk >= 1.0 ? '良好' : '需改进'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 图表区域 */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 测试趋势图 */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-primary" />
              测试趋势（最近14天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(215 20% 60%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(215 20% 60%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222 47% 9%)',
                        border: '1px solid hsl(222 47% 16%)',
                        borderRadius: '8px',
                      }}
                      itemStyle={{
                        color: 'hsl(210 40% 98%)',
                      }}
                      labelStyle={{
                        color: 'hsl(210 40% 98%)',
                      }}
                      formatter={(value: number, name: string) => [`${value} 次`, name]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="PASS"
                      name="通过"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      dot={{ fill: COLORS.success, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: COLORS.success }}
                    />
                    <Line
                      type="monotone"
                      dataKey="FAIL"
                      name="失败"
                      stroke={COLORS.error}
                      strokeWidth={2}
                      dot={{ fill: COLORS.error, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: COLORS.error }}
                    />
                    <Line
                      type="monotone"
                      dataKey="SKIP"
                      name="跳过"
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      dot={{ fill: COLORS.warning, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: COLORS.warning }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无趋势数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* FAIL分布饼图 */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-error" />
              FAIL分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {failDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={failDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {failDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222 47% 9%)',
                        border: '1px solid hsl(222 47% 16%)',
                        borderRadius: '8px',
                      }}
                      itemStyle={{
                        color: 'hsl(210 40% 98%)',
                      }}
                      labelStyle={{
                        color: 'hsl(210 40% 98%)',
                      }}
                      formatter={(value: number, name: string) => [`${value} 次`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无失败数据
                </div>
              )}
            </div>
            {failDistribution.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {failDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                    <span className="font-mono text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* FAIL步骤TOP5 */}
      <section className="w-full">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-warning" />
              FAIL步骤 TOP5
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {failStepTop5.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={failStepTop5} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="hsl(215 20% 60%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(215 20% 60%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222 47% 9%)',
                        border: '1px solid hsl(222 47% 16%)',
                        borderRadius: '8px',
                      }}
                      itemStyle={{
                        color: 'hsl(210 40% 98%)',
                      }}
                      labelStyle={{
                        color: 'hsl(210 40% 98%)',
                      }}
                      formatter={(value: number) => [`${value} 次`, '失败次数']}
                    />
                    <Bar dataKey="value" fill={COLORS.warning} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无步骤失败数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default DashboardPage;
