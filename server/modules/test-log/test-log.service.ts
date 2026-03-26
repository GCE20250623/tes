import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LogAnalysisResult {
  success: boolean;
  filename: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  duration: string;
  errors: string[];
  testCases: TestCase[];
  summary: TestSummary;
}

export interface TestCase {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: string;
  error?: string;
  timestamp?: string;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  avgDuration: string;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class TestLogService {
  async analyzeLog(buffer: Buffer, filename: string): Promise<LogAnalysisResult> {
    const content = buffer.toString('utf-8');
    return this.parseLog(content, filename);
  }

  async analyzeFilePath(filePath: string): Promise<LogAnalysisResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    return this.parseLog(content, filename);
  }

  private parseLog(content: string, filename: string): LogAnalysisResult {
    const lines = content.split('\n');
    const testCases: TestCase[] = [];
    const errors: string[] = [];
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let totalDuration = 0;
    let startTime: string | undefined;
    let endTime: string | undefined;

    // Parse test results from log
    for (const line of lines) {
      // Match test results patterns
      const passMatch = line.match(/✓|PASS|成功|通过|passed/i);
      const failMatch = line.match(/✗|FAIL|失败|失败|failed/i);
      const timeMatch = line.match(/(\d+)ms|(\d+\.?\d*)s/);
      const idMatch = line.match(/\[(\d+)\]|\((\d+)\)|#(\d+)/);
      const nameMatch = line.match(/test[:\s]+(.+)/i);
      
      if (passMatch) {
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

      // Extract timestamps
      const tsMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
      if (tsMatch && !startTime) startTime = tsMatch[1];
      if (tsMatch) endTime = tsMatch[1];
    }

    // Parse Excel data if present
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
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

  private parseExcelData(content: string, filename: string): LogAnalysisResult {
    // Simple CSV/Excel text parsing
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
      
      if (isPass) passedTests++;
      else if (status.includes('FAIL') || status.includes('失败')) failedTests++;

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
    
    const search = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.')) {
            search(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    };
    
    search(searchDir);
    return files.slice(0, 100); // Limit to 100 files
  }

  async exportToExcel(data: any[]): Promise<Buffer> {
    // Generate simple CSV as Excel-compatible format
    if (data.length === 0) {
      return Buffer.from('No data');
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
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
