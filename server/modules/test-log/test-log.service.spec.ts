/**
 * 测试日志分析服务 - 单元测试
 */

import { TestLogService } from './test-log.service';

describe('TestLogService', () => {
  let service: TestLogService;

  beforeEach(() => {
    service = new TestLogService();
  });

  // ==================== 标准格式日志测试 ====================

  describe('标准格式日志解析', () => {
    it('应正确解析包含PASS/FAIL的日志', () => {
      const logContent = `
[001] Test User Login - PASS - 150ms
[002] Test Product Search - PASS - 230ms
[003] Test Add to Cart - FAIL - 500ms - Error: Database timeout
[004] Test Checkout - PASS - 1200ms
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.totalTests).toBe(4);
      expect(result.passedTests).toBe(3);
      expect(result.failedTests).toBe(1);
      expect(result.passRate).toBe(75);
    });

    it('应正确计算通过率', () => {
      const logContent = `
[001] Test 1 - PASS - 100ms
[002] Test 2 - PASS - 100ms
[003] Test 3 - FAIL - 100ms
[004] Test 4 - PASS - 100ms
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.totalTests).toBe(4);
      expect(result.passRate).toBe(75); // 3/4 = 75%
    });
  });

  // ==================== 结构化格式日志测试 ====================

  describe('结构化格式日志解析', () => {
    it('应正确识别结构化格式', () => {
      const logContent = `
ProdName:CORN5_2054D
SerialNumber:2
TestUser:调试用户
TestRack:CJ001725-02
TestFixture:CJ001725-02
Cavity:1
TestTime:20250915184748
TestResult:PASS
Step Item Range TestValue Result
1 输入端X32高电平 1~ 1 Pass
2 闭合继电器6 ~ True Pass
3 上电 ~ True Pass
4 延时2s ~ True Pass
5 +12V 11.5~12.5 12.039 Pass
      `.trim();

      const result = service.parseLog(logContent, 'structured.log');

      expect(result.totalTests).toBe(5);
      expect(result.passedTests).toBe(5);
      expect(result.failedTests).toBe(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.ProdName).toBe('CORN5_2054D');
      expect(result.metadata?.SerialNumber).toBe('2');
      expect(result.metadata?.TestUser).toBe('调试用户');
    });

    it('应正确解析TestTime时间格式', () => {
      const logContent = `
ProdName:TEST
TestTime:20250915184748
TestResult:PASS
Step Item Range TestValue Result
1 Step1 ~ 1 Pass
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.summary.startTime).toBe('2025-09-15 18:47:48');
      expect(result.summary.endTime).toBe('2025-09-15 18:47:48');
    });

    it('应正确识别FAIL结果', () => {
      const logContent = `
ProdName:CORN5_2054D
TestResult:FAIL
Step Item Range TestValue Result
1 Step1 ~ 1 Pass
2 Step2 ~ 0 Fail
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.totalTests).toBe(2);
      expect(result.passedTests).toBe(1);
      expect(result.failedTests).toBe(1);
      expect(result.success).toBe(false);
    });

    it('应正确提取测试项信息', () => {
      const logContent = `
ProdName:TEST
TestResult:PASS
Step Item Range TestValue Result
1 输入端X32高电平 1~ 1 Pass
2 +12V电压 11.5~12.5 12.039 Pass
3 版本号 CL2552_Brush~ CL2552_Brush Pass
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.testCases).toHaveLength(3);
      expect(result.testCases[0].name).toBe('输入端X32高电平');
      expect(result.testCases[0].range).toBe('1~');
      expect(result.testCases[0].testValue).toBe('1');
      expect(result.testCases[1].name).toBe('+12V电压');
      expect(result.testCases[1].range).toBe('11.5~12.5');
      expect(result.testCases[1].testValue).toBe('12.039');
    });

    it('应处理复杂的Range值', () => {
      const logContent = `
ProdName:TEST
TestResult:PASS
Step Item Range TestValue Result
1 电压检测 3.2~3.4 3.315 Pass
2 电流检测 0.1~0.5 0.32 Pass
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.testCases).toHaveLength(2);
      expect(result.testCases[0].range).toBe('3.2~3.4');
      expect(result.testCases[1].range).toBe('0.1~0.5');
    });
  });

  // ==================== CSV格式测试 ====================

  describe('CSV格式解析', () => {
    it('应正确解析CSV格式', () => {
      const csvContent = `
id,name,status,duration
001,User Login,PASS,150ms
002,Product Search,FAIL,500ms
003,Checkout,PASS,200ms
      `.trim();

      const result = service.parseLog(csvContent, 'test.csv');

      expect(result.totalTests).toBe(3);
      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(1);
    });
  });

  // ==================== 边界条件测试 ====================

  describe('边界条件处理', () => {
    it('应处理空日志', () => {
      const result = service.parseLog('', 'empty.log');

      expect(result.totalTests).toBe(0);
      expect(result.passedTests).toBe(0);
      expect(result.failedTests).toBe(0);
    });

    it('应处理无测试用例的日志', () => {
      const logContent = `
ProdName:TEST
TestResult:PASS
Step Item Range TestValue Result
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.totalTests).toBe(0);
      expect(result.passedTests).toBe(0);
    });

    it('应处理纯中文测试项名称', () => {
      const logContent = `
ProdName:TEST
TestResult:PASS
Step Item Range TestValue Result
1 输入电压检测 1~ 1 Pass
2 继电器闭合测试 ~ True Pass
3 版本号比对 ~ 通过 Pass
      `.trim();

      const result = service.parseLog(logContent, 'test.log');

      expect(result.totalTests).toBe(3);
      expect(result.testCases[0].name).toBe('输入电压检测');
      expect(result.testCases[2].name).toBe('版本号比对');
    });
  });

  // ==================== 辅助方法测试 ====================

  describe('辅助方法', () => {
    it('parseDuration应正确解析ms格式', () => {
      const ms = (service as any).parseDuration('150ms');
      expect(ms).toBe(150);
    });

    it('parseDuration应正确解析s格式', () => {
      const ms = (service as any).parseDuration('1.5s');
      expect(ms).toBe(1500);
    });

    it('formatDuration应正确格式化输出', () => {
      const formatted = (service as any).formatDuration(1500);
      expect(formatted).toBe('1.50s');
    });

    it('formatDuration应处理小于1秒的情况', () => {
      const formatted = (service as any).formatDuration(500);
      expect(formatted).toBe('500ms');
    });
  });
});
