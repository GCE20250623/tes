/**
 * 测试日志分析服务 (Test Log Analysis Service)
 * 
 * 功能说明：
 * - 解析多种格式的测试日志（.log, .txt, .csv, .xlsx）
 * - 计算测试通过率、失败数、耗时等统计信息
 * - 提取测试用例详情（ID、名称、状态、错误信息）
 * - 导出分析结果为CSV格式
 * 
 * 支持的日志格式：
 * - 标准格式化日志（带[PASS]/[FAIL]标记）
 * - 时间戳格式日志
 * - CSV格式测试结果
 * - Excel格式测试结果
 * - 结构化测试日志（包含头部信息和步骤表格）
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 测试日志分析结果接口
 */
export interface LogAnalysisResult {
  /** 分析是否成功 */
  success: boolean;
  
  /** 文件名 */
  filename: string;
  
  /** 测试用例总数 */
  totalTests: number;
  
  /** 通过的测试数量 */
  passedTests: number;
  
  /** 失败的测试数量 */
  failedTests: number;
  
  /** 通过率（百分比） */
  passRate: number;
  
  /** 总耗时 */
  duration: string;
  
  /** 错误信息列表 */
  errors: string[];
  
  /** 所有测试用例详情 */
  testCases: TestCase[];
  
  /** 测试汇总信息 */
  summary: TestSummary;

  /** 额外信息（针对特定格式） */
  metadata?: Record<string, string>;
}

/**
 * 单个测试用例接口
 */
export interface TestCase {
  /** 测试用例ID */
  id: string;
  
  /** 测试用例名称 */
  name: string;
  
  /** 测试状态：PASS=通过，FAIL=失败，SKIP=跳过 */
  status: 'PASS' | 'FAIL' | 'SKIP';
  
  /** 执行耗时 */
  duration: string;
  
  /** 错误信息（如果失败） */
  error?: string;
  
  /** 执行时间戳 */
  timestamp?: string;
  
  /** 额外字段（用于特定格式） */
  range?: string;
  testValue?: string;
}

/**
 * 测试汇总信息接口
 */
export interface TestSummary {
  /** 测试用例总数 */
  totalTests: number;
  
  /** 通过的测试数量 */
  passedTests: number;
  
  /** 失败的测试数量 */
  failedTests: number;
  
  /** 通过率（百分比） */
  passRate: number;
  
  /** 平均耗时 */
  avgDuration: string;
  
  /** 开始时间 */
  startTime?: string;
  
  /** 结束时间 */
  endTime?: string;
}

@Injectable()
export class TestLogService {
  
  /**
   * 分析上传的日志文件
   * @param buffer - 文件内容的Buffer
   * @param filename - 文件名
   * @returns 分析结果
   */
  async analyzeLog(buffer: Buffer, filename: string): Promise<LogAnalysisResult> {
    const content = buffer.toString('utf-8');
    return this.parseLog(content, filename);
  }

  /**
   * 分析指定路径的日志文件
   * @param filePath - 文件完整路径
   * @returns 分析结果
   */
  async analyzeFilePath(filePath: string): Promise<LogAnalysisResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    return this.parseLog(content, filename);
  }

  /**
   * 解析日志内容
   * 支持多种日志格式
   */
  private parseLog(content: string, filename: string): LogAnalysisResult {
    // 检测是否为结构化格式（包含 ProdName:, Step Item Range 等）
    if (this.isStructuredFormat(content)) {
      return this.parseStructuredLog(content, filename);
    }
    
    // 按行分割日志内容
    const lines = content.split('\n');
    const testCases: TestCase[] = [];
    const errors: string[] = [];
    
    // 统计计数器
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let totalDuration = 0;
    let startTime: string | undefined;
    let endTime: string | undefined;

    for (const line of lines) {
      const passMatch = line.match(/✓|PASS|成功|通过|passed|Pass/i);
      const failMatch = line.match(/✗|FAIL|失败|failed|Fail/i);
      const timeMatch = line.match(/(\d+)ms|(\d+\.?\d*)s/);
      const idMatch = line.match(/\[(\d+)\]|\((\d+)\)|#(\d+)/);
      const nameMatch = line.match(/test[:\s]+(.+)/i);
      
      if (passMatch && !failMatch) {
        totalTests++;
        passedTests++;
        
        const id = idMatch ? idMatch[1] : `${totalTests}`;
        const name = nameMatch ? nameMatch[1].trim() : `Test ${id}`;
        const duration = timeMatch ? timeMatch[0] : '0ms';
        
        totalDuration += this.parseDuration(duration);
        
        testCases.push({
          id,
          name,
          status: 'PASS',
          duration,
          timestamp: this.extractTimestamp(line)
        });
        
      } else if (failMatch) {
        totalTests++;
        failedTests++;
        
        const id = idMatch ? idMatch[1] : `${totalTests}`;
        const name = nameMatch ? nameMatch[1].trim() : `Test ${id}`;
        const duration = timeMatch ? timeMatch[0] : '0ms';
        const error = this.extractError(line);
        
        totalDuration += this.parseDuration(duration);
        
        if (error) errors.push(error);
        
        testCases.push({
          id,
          name,
          status: 'FAIL',
          duration,
          error,
          timestamp: this.extractTimestamp(line)
        });
      }

      const tsMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
      if (tsMatch) {
        if (!startTime) startTime = tsMatch[1];
        endTime = tsMatch[1];
      }
    }

    // 处理Excel/CSV文件
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      return this.parseExcelData(content, filename);
    }

    const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : '0';

    return {
      success: failedTests === 0,
      filename,
      totalTests,
      passedTests,
      failedTests,
      passRate: parseFloat(passRate),
      duration: this.formatDuration(totalDuration),
      errors,
      testCases,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate: parseFloat(passRate),
        avgDuration: totalTests > 0 ? this.formatDuration(totalDuration / totalTests) : '0ms',
        startTime,
        endTime
      }
    };
  }

  /**
   * 检测是否为结构化格式
   * 结构化格式包含：ProdName:, Step Item Range 等标记
   */
  private isStructuredFormat(content: string): boolean {
    return content.includes('ProdName:') && 
           content.includes('Step Item Range') &&
           content.includes('TestResult:');
  }

  /**
   * 解析结构化测试日志格式
   * 格式示例：
   * ProdName:CORN5_2054D
   * SerialNumber:2
   * TestResult:PASS
   * Step Item Range TestValue Result
   * 1 输入端X32高电平 1~ 1 Pass
   */
  private parseStructuredLog(content: string, filename: string): LogAnalysisResult {
    const lines = content.split('\n');
    const testCases: TestCase[] = [];
    const errors: string[] = [];
    const metadata: Record<string, string> = {};
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let startTime: string | undefined;
    let endTime: string | undefined;
    let overallResult = 'UNKNOWN';

    // 解析头部信息
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过空行和步骤表头
      if (!trimmedLine || trimmedLine.startsWith('Step Item')) continue;
      
      // 解析 ProdName:xxx 格式
      const keyValueMatch = trimmedLine.match(/^([^:]+):(.*)$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        metadata[key.trim()] = value.trim();
        
        // 提取特定字段
        if (key === 'TestResult') {
          overallResult = value.trim().toUpperCase();
        } else if (key === 'TestTime') {
          // 解析时间格式：20250915184748 -> 2025-09-15 18:47:48
          const timeMatch = trimmedLine.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
          if (timeMatch) {
            startTime = `${timeMatch[1]}-${timeMatch[2]}-${timeMatch[3]} ${timeMatch[4]}:${timeMatch[5]}:${timeMatch[6]}`;
            endTime = startTime;
          }
        }
      }
    }

    // 解析步骤表格
    // 格式：1 输入端X32高电平 1~ 1 Pass
    const stepRegex = /^(\d+)\s+(.+?)\s+([\d.~]+|~)\s+([\d.ONtrueFalsen/a]+|[\u4e00-\u9fa5]+)\s+(Pass|Fail|PASS|FAIL)/i;
    
    for (const line of lines) {
      const match = line.trim().match(stepRegex);
      if (match) {
        const [, id, item, range, testValue, result] = match;
        const status = result.toUpperCase().includes('PASS') || result.toUpperCase().includes('Pass') ? 'PASS' : 'FAIL';
        
        totalTests++;
        if (status === 'PASS') {
          passedTests++;
        } else {
          failedTests++;
        }

        testCases.push({
          id: id.trim(),
          name: item.trim(),
          status,
          duration: 'N/A',
          range: range.trim(),
          testValue: testValue.trim()
        });
      }
    }

    const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : '0';

    return {
      success: failedTests === 0,
      filename,
      totalTests,
      passedTests,
      failedTests,
      passRate: parseFloat(passRate),
      duration: startTime && endTime ? 'N/A' : 'N/A',
      errors,
      testCases,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate: parseFloat(passRate),
        avgDuration: 'N/A',
        startTime,
        endTime
      },
      metadata
    };
  }

  /**
   * 解析CSV/Excel格式的测试数据
   */
  private parseExcelData(content: string, filename: string): LogAnalysisResult {
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0]?.split(',') || [];
    const testCases: TestCase[] = [];
    
    let passedTests = 0;
    let failedTests = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx]?.trim() || '';
      });

      const status = (row['status'] || row['结果'] || row['Result'] || '').toUpperCase();
      const isPass = status.includes('PASS') || status.includes('成功') || status.includes('通过');
      
      if (isPass) {
        passedTests++;
      } else if (status.includes('FAIL') || status.includes('失败')) {
        failedTests++;
      }

      testCases.push({
        id: row['id'] || row['ID'] || `${i}`,
        name: row['name'] || row['测试名称'] || row['Test Name'] || `Test ${i}`,
        status: isPass ? 'PASS' : (status.includes('FAIL') ? 'FAIL' : 'SKIP'),
        duration: row['duration'] || row['耗时'] || row['Duration'] || '0ms'
      });
    }

    const totalTests = passedTests + failedTests;
    const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : '0';

    return {
      success: failedTests === 0,
      filename,
      totalTests,
      passedTests,
      failedTests,
      passRate: parseFloat(passRate),
      duration: 'N/A',
      errors: [],
      testCases,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate: parseFloat(passRate),
        avgDuration: 'N/A'
      }
    };
  }

  async getTestSummary(filePath: string): Promise<TestSummary> {
    const result = await this.analyzeFilePath(filePath);
    return result.summary;
  }

  async listLogFiles(directory?: string): Promise<string[]> {
    const searchDir = directory || process.cwd();
    const files: string[] = [];
    
    const extensions = ['.log', '.txt', '.xlsx', '.xls', '.csv'];
    
    const search = (dir: string): void => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          
          try {
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.')) {
              search(fullPath);
            } else if (extensions.some(ext => item.endsWith(ext))) {
              files.push(fullPath);
            }
          } catch (e) {
            // 跳过无法访问的文件
          }
        }
      } catch (e) {
        // 跳过无法访问的目录
      }
    };
    
    search(searchDir);
    return files.slice(0, 100);
  }

  async exportToExcel(data: any[]): Promise<Buffer> {
    if (data.length === 0) {
      return Buffer.from('No data');
    }

    const headers = Object.keys(data[0]);
    
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => `"${row[h] || ''}"`).join(',')
      )
    ].join('\n');

    return Buffer.from(csv);
  }

  private parseDuration(duration: string): number {
    const msMatch = duration.match(/(\d+)ms/);
    const sMatch = duration.match(/(\d+\.?\d*)s/);
    
    if (msMatch) return parseInt(msMatch[1]);
    if (sMatch) return parseFloat(sMatch[1]) * 1000;
    return 0;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private extractTimestamp(line: string): string | undefined {
    const match = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : undefined;
  }

  private extractError(line: string): string | undefined {
    const errorMatch = line.match(/error[:\s]+(.+)/i);
    return errorMatch ? errorMatch[1].trim() : undefined;
  }
}
