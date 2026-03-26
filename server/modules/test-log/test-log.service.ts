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
   * 支持多种日志格式：
   * - 标准格式：[001] Test Name - PASS - 150ms
   * - 符号格式：✓ Test Name (PASS)
   * - 时间戳格式：2026-03-26 10:00:01 | Test Name - PASS
   * 
   * @param content - 日志文本内容
   * @param filename - 文件名
   * @returns 解析后的分析结果
   */
  private parseLog(content: string, filename: string): LogAnalysisResult {
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

    // 遍历每一行日志，解析测试结果
    for (const line of lines) {
      // 匹配模式：
      // passMatch: 匹配通过标记（✓, PASS, 成功, 通过, passed）
      // failMatch: 匹配失败标记（✗, FAIL, 失败, failed）
      // timeMatch: 匹配耗时（150ms 或 1.5s）
      // idMatch: 匹配测试ID（[001], (001), #001）
      // nameMatch: 匹配测试名称（test: xxx）
      
      const passMatch = line.match(/✓|PASS|成功|通过|passed/i);
      const failMatch = line.match(/✗|FAIL|失败|failed/i);
      const timeMatch = line.match(/(\d+)ms|(\d+\.?\d*)s/);
      const idMatch = line.match(/\[(\d+)\]|\((\d+)\)|#(\d+)/);
      const nameMatch = line.match(/test[:\s]+(.+)/i);
      
      // 判断是通过还是失败
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

      // 提取时间戳 - 匹配格式：2026-03-26 10:00:01 或 2026-03-26T10:00:01
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

    // 计算通过率
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
   * 解析CSV/Excel格式的测试数据
   * 支持的列名：id, name, status, result, duration, error, 耗时, 结果, etc.
   * 
   * @param content - CSV文本内容
   * @param filename - 文件名
   * @returns 解析后的分析结果
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

  /**
   * 获取测试汇总信息
   * @param filePath - 日志文件路径
   * @returns 测试汇总信息
   */
  async getTestSummary(filePath: string): Promise<TestSummary> {
    const result = await this.analyzeFilePath(filePath);
    return result.summary;
  }

  /**
   * 列出目录中的所有日志文件
   * @param directory - 要搜索的目录（默认当前目录）
   * @returns 日志文件路径列表
   */
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

  /**
   * 导出分析结果为CSV格式
   * @param data - 要导出的数据数组
   * @returns CSV格式的Buffer
   */
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

  /**
   * 解析耗时字符串为毫秒数
   * 支持格式：150ms, 1.5s, 1000ms
   */
  private parseDuration(duration: string): number {
    const msMatch = duration.match(/(\d+)ms/);
    const sMatch = duration.match(/(\d+\.?\d*)s/);
    
    if (msMatch) return parseInt(msMatch[1]);
    if (sMatch) return parseFloat(sMatch[1]) * 1000;
    return 0;
  }

  /**
   * 格式化毫秒为可读字符串
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * 从日志行中提取时间戳
   */
  private extractTimestamp(line: string): string | undefined {
    const match = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : undefined;
  }

  /**
   * 从日志行中提取错误信息
   */
  private extractError(line: string): string | undefined {
    const errorMatch = line.match(/error[:\s]+(.+)/i);
    return errorMatch ? errorMatch[1].trim() : undefined;
  }
}
