import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UploadIcon, 
  FileIcon, 
  XIcon, 
  AlertTriangleIcon, 
  DatabaseIcon,
  CheckCircleIcon,
  Settings2Icon,
  FileJsonIcon,
  BugIcon,
  RefreshCwIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as XLSX from 'xlsx';

// 测试步骤接口
interface ITestStep {
  stepNumber: number;
  stepName: string;
  result: 'PASS' | 'FAIL' | 'SKIP';
  value?: number;
  lowerLimit?: number;
  upperLimit?: number;
  unit?: string;
  errorMessage?: string;
}

// 测试用例接口
interface ITestCase {
  id: string;
  sn: string;
  testName: string;
  result: 'PASS' | 'FAIL' | 'SKIP';
  value?: number;
  lowerLimit?: number;
  upperLimit?: number;
  unit?: string;
  testTime: string;
  steps: ITestStep[];
  operator?: string;
  station?: string;
  rawData?: Record<string, string>; // 保留原始数据用于调试
}

// 字段映射接口
interface IFieldMapping {
  csvField: string;
  targetField: string;
  index: number;
}

// 目标字段定义
const TARGET_FIELDS = [
  { value: 'sn', label: '产品序列号 (SN)' },
  { value: 'testName', label: '测试名称' },
  { value: 'result', label: '测试结果' },
  { value: 'value', label: '测试值' },
  { value: 'lowerLimit', label: '下限' },
  { value: 'upperLimit', label: '上限' },
  { value: 'unit', label: '单位' },
  { value: 'testTime', label: '测试时间' },
  { value: 'operator', label: '操作员' },
  { value: 'station', label: '工位' },
  { value: 'stepName', label: '步骤名称' },
  { value: 'stepResult', label: '步骤结果' },
  { value: 'stepValue', label: '步骤值' },
  { value: 'errorMessage', label: '错误信息' },
  { value: 'ignore', label: '忽略' },
];

const STORAGE_KEY = '__global_tdp_testCases';

// 尝试多种编码解码
const decodeWithFallback = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);
  
  // 编码尝试顺序
  const encodings = [
    'utf-8',
    'gbk',
    'gb2312',
    'gb18030',
    'big5',
    'shift_jis',
    'euc-jp',
    'iso-8859-1',
  ];
  
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const result = decoder.decode(uint8Array);
      
      // 检查解码结果是否包含乱码特征
      // 如果包含大量�字符，说明解码失败
      const replacementCount = (result.match(/�/g) || []).length;
      if (replacementCount < result.length * 0.01) {
        logger.info(`[Import] Successfully decoded with ${encoding}`);
        return result;
      }
    } catch (e) {
      // 继续尝试下一个编码
    }
  }
  
  // 默认使用 UTF-8
  return new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
};

// 增强型 CSV 解析器 - 支持多种分隔符
const parseCSV = (content: string): string[][] => {
  // 统一换行符
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  // 检测分隔符
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  
  const separator = tabCount > commaCount ? '\t' : semicolonCount > commaCount ? ';' : ',';
  logger.info(`[Import] Detected separator: "${separator === '\t' ? 'TAB' : separator}"`);
  
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
};

// 智能字段检测 - 支持模糊匹配
const detectFieldMapping = (headers: string[]): IFieldMapping[] => {
  const mappings: IFieldMapping[] = [];
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim();
    const lowerHeader = header.toLowerCase().replace(/[_\-\s\.]/g, '');
    let targetField = 'ignore';
    
    // SN / 序列号检测
    if (/^(sn|serial|序列号|产品序列号|序号|机台号|产品号|条形码|barcode|sn码)/i.test(header) || 
        lowerHeader.includes('sn') || lowerHeader.includes('serialno') || lowerHeader.includes('serialnumber')) {
      targetField = 'sn';
    }
    // 测试名称检测
    else if (lowerHeader.includes('testname') || (lowerHeader.includes('test') && lowerHeader.includes('name')) ||
             lowerHeader.includes('测试名称') || lowerHeader.includes('测试项') || lowerHeader.includes('测试项目') ||
             lowerHeader.includes('项目名称') || lowerHeader.includes('testitem')) {
      targetField = 'testName';
    }
    // 测试结果检测
    else if ((lowerHeader.includes('result') || lowerHeader.includes('status')) && !lowerHeader.includes('step') && !lowerHeader.includes('sub') ||
             lowerHeader.includes('测试结果') || lowerHeader.includes('总结果') || lowerHeader.includes('判定') || 
             lowerHeader.includes('测试状态') || lowerHeader.includes('结论')) {
      targetField = 'result';
    }
    // 测试值检测
    else if ((lowerHeader.includes('value') || lowerHeader.includes('measure') || lowerHeader.includes('data') || lowerHeader.includes('reading')) &&
             !lowerHeader.includes('step') && !lowerHeader.includes('min') && !lowerHeader.includes('max') &&
             !lowerHeader.includes('lower') && !lowerHeader.includes('upper') && !lowerHeader.includes('limit')) {
      targetField = 'value';
    }
    // 下限检测
    else if (lowerHeader.includes('lower') || lowerHeader.includes('min') || lowerHeader.includes('low') ||
             lowerHeader.includes('下限') || lowerHeader.includes('最小值') || lowerHeader.includes('lsl') ||
             lowerHeader.includes('minvalue') || lowerHeader.includes('minimum')) {
      targetField = 'lowerLimit';
    }
    // 上限检测
    else if (lowerHeader.includes('upper') || lowerHeader.includes('max') || lowerHeader.includes('high') ||
             lowerHeader.includes('上限') || lowerHeader.includes('最大值') || lowerHeader.includes('usl') ||
             lowerHeader.includes('maxvalue') || lowerHeader.includes('maximum')) {
      targetField = 'upperLimit';
    }
    // 单位检测
    else if (lowerHeader.includes('unit') || lowerHeader.includes('单位') || lowerHeader.includes('uom')) {
      targetField = 'unit';
    }
    // 时间检测
    else if (lowerHeader.includes('time') || lowerHeader.includes('date') || lowerHeader.includes('timestamp') ||
             lowerHeader.includes('时间') || lowerHeader.includes('日期') || lowerHeader.includes('测试时间')) {
      targetField = 'testTime';
    }
    // 操作员检测
    else if (lowerHeader.includes('operator') || lowerHeader.includes('user') || lowerHeader.includes('tester') ||
             lowerHeader.includes('操作员') || lowerHeader.includes('操作人') || lowerHeader.includes('测试员') ||
             lowerHeader.includes('人员') || lowerHeader.includes('worker')) {
      targetField = 'operator';
    }
    // 工位检测
    else if (lowerHeader.includes('station') || lowerHeader.includes('position') || lowerHeader.includes('line') ||
             lowerHeader.includes('工位') || lowerHeader.includes('站位') || lowerHeader.includes('线别') ||
             lowerHeader.includes('工站') || lowerHeader.includes('位置')) {
      targetField = 'station';
    }
    // 步骤名称检测 - Step列可能包含复合数据如 "PWM占空比 3 15 2.46 Fail"
    // 支持 "Step 1", "Step 2", "Step_1", "步骤1", "步骤 1" 等格式
    else if (lowerHeader === 'step' || 
             /^step[\s_-]?\d+$/.test(lowerHeader) ||  // 匹配 "Step 1", "Step_1", "Step1"
             lowerHeader.includes('stepname') ||
             (lowerHeader.includes('step') && (lowerHeader.includes('name') || lowerHeader.includes('desc'))) ||
             /步骤[\s_-]?\d+/.test(lowerHeader) ||  // 匹配 "步骤1", "步骤 1"
             lowerHeader.includes('步骤名称') || lowerHeader.includes('步骤描述') || lowerHeader.includes('子项目') ||
             lowerHeader.includes('subtest') || lowerHeader.includes('subitem')) {
      targetField = 'stepName';
    }
    // 步骤结果检测
    else if ((lowerHeader.includes('step') && lowerHeader.includes('result')) ||
             lowerHeader.includes('步骤结果') || lowerHeader.includes('子结果') || lowerHeader.includes('subresult')) {
      targetField = 'stepResult';
    }
    // 步骤值检测
    else if ((lowerHeader.includes('step') && (lowerHeader.includes('value') || lowerHeader.includes('data') || lowerHeader.includes('measure'))) ||
             lowerHeader.includes('步骤值') || lowerHeader.includes('子测试值')) {
      targetField = 'stepValue';
    }
    // 错误信息检测
    else if (lowerHeader.includes('error') || lowerHeader.includes('message') || lowerHeader.includes('fail') ||
             lowerHeader.includes('错误') || lowerHeader.includes('失败原因') || lowerHeader.includes('异常') ||
             lowerHeader.includes('备注') || lowerHeader.includes('说明') || lowerHeader.includes('comment')) {
      targetField = 'errorMessage';
    }
    
    mappings.push({ csvField: header, targetField, index: i });
  }
  
  return mappings;
};

// 解析测试结果值
const parseResult = (value: string): 'PASS' | 'FAIL' | 'SKIP' => {
  if (!value) return 'SKIP';
  const upper = value.toUpperCase().trim();
  if (upper === 'PASS' || upper === 'PASSED' || upper === '通过' || upper === '合格' || upper === 'OK' || upper === 'TRUE' || upper === '1' || upper === '是' || upper === 'YES' || upper === '良') {
    return 'PASS';
  }
  if (upper === 'FAIL' || upper === 'FAILED' || upper === '失败' || upper === '不合格' || upper === 'NG' || upper === 'FALSE' || upper === '0' || upper === '否' || upper === 'NO' || upper === '不良') {
    return 'FAIL';
  }
  return 'SKIP';
};

// 解析数值
const parseNumber = (value: string): number | undefined => {
  if (!value || value.trim() === '' || value.trim() === '-' || value.trim() === 'N/A' || value.trim() === 'NA') {
    return undefined;
  }
  const cleaned = value.replace(/,/g, '').replace(/\s/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
};

// 解析Step列的复合数据格式
// 例如: "PWM占空比  3  15  2.46    Fail" -> { stepName: "PWM占空比", result: "FAIL", value: 2.46 }
interface IParsedStep {
  stepName: string;
  result: 'PASS' | 'FAIL' | 'SKIP';
  value?: number;
}

// 全局步骤名称映射表，确保相同的步骤名称使用相同的标识
const globalStepNameMap: Map<string, string> = new Map();
let stepNameCounter = 0;

const parseStepCell = (cellValue: string, testName?: string): IParsedStep => {
  if (!cellValue) {
    return { stepName: testName || '', result: 'SKIP' };
  }
  
  // 按空格或制表符分割
  const parts = cellValue.split(/\s+/).filter(p => p.trim());
  
  if (parts.length === 0) {
    return { stepName: testName || '', result: 'SKIP' };
  }
  
  // 检查结果标识（最后一项或最后几项）
  const lastPart = parts[parts.length - 1].toUpperCase();
  const isResult = lastPart === 'PASS' || lastPart === 'FAIL' || lastPart === 'PASSED' || lastPart === 'FAILED' ||
                   lastPart === '通过' || lastPart === '失败' || lastPart === 'NG' || lastPart === 'OK' ||
                   lastPart === '通过' || lastPart === '不通过' || lastPart === '合格' || lastPart === '不合格';
  
  // 如果只有一项
  if (parts.length === 1) {
    const part = parts[0].toUpperCase();
    if (part === 'PASS' || part === 'FAIL' || part === '通过' || part === '失败' || 
        part === 'PASSED' || part === 'FAILED' || part === 'NG' || part === 'OK') {
      return { stepName: testName || '', result: parseResult(parts[0]) };
    }
    return { stepName: parts[0], result: 'SKIP' };
  }
  
  // 检查倒数第二项是否可能是数值（测量值）
  let value: number | undefined;
  if (isResult && parts.length >= 3) {
    const secondLastPart = parts[parts.length - 2];
    const parsedValue = parseNumber(secondLastPart);
    if (parsedValue !== undefined) {
      value = parsedValue;
    }
  }
  
  if (isResult) {
    // 最后一项是结果，前面的都是步骤名称和中间值
    // 步骤名称通常是第一个有意义的非数值文本
    let stepName = '';
    
    // 优先找包含中文的部分作为步骤名称
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (/[\u4e00-\u9fa5]/.test(part)) {
        stepName = part;
        break;
      }
    }
    
    // 如果没找到中文，找第一个非纯数字的部分
    if (!stepName) {
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!/^\d+(\.\d+)?$/.test(part)) {
          stepName = part;
          break;
        }
      }
    }
    
    // 如果还是没找到，使用第一部分（只要不是纯数字）
    if (!stepName && !/^\d+(\.\d+)?$/.test(parts[0])) {
      stepName = parts[0];
    }
    
    // 如果仍然无法提取步骤名称，使用testName或返回空（让上层处理）
    if (!stepName && testName) {
      stepName = testName;
    }
    
    return {
      stepName,
      result: parseResult(parts[parts.length - 1]),
      value
    };
  }
  
  // 没有检测到结果，尝试提取名称或返回testName
  // 检查是否有非数字部分可以作为名称
  let extractedName = '';
  for (const part of parts) {
    if (/[\u4e00-\u9fa5]/.test(part) || !/^\d+(\.\d+)?$/.test(part)) {
      extractedName = part;
      break;
    }
  }
  
  // 没有检测到结果，使用提取的名称或testName
  return { stepName: extractedName || testName || cellValue, result: 'SKIP' };
};

// 解析测试数据 - 每行作为一个独立的测试用例
const parseTestData = (rows: string[][], mapping: IFieldMapping[], headers: string[]): ITestCase[] => {
  const testCases: ITestCase[] = [];
  
  // 获取各字段索引
  const getFieldIndex = (field: string) => mapping.find(m => m.targetField === field)?.index ?? -1;
  // 获取所有映射为stepName的列索引
  const getAllStepNameIndices = () => mapping.filter(m => m.targetField === 'stepName').map(m => m.index);
  
  const snIdx = getFieldIndex('sn');
  const testNameIdx = getFieldIndex('testName');
  const resultIdx = getFieldIndex('result');
  const valueIdx = getFieldIndex('value');
  const lowerLimitIdx = getFieldIndex('lowerLimit');
  const upperLimitIdx = getFieldIndex('upperLimit');
  const unitIdx = getFieldIndex('unit');
  const testTimeIdx = getFieldIndex('testTime');
  const operatorIdx = getFieldIndex('operator');
  const stationIdx = getFieldIndex('station');
  const stepNameIndices = getAllStepNameIndices();
  const stepResultIdx = getFieldIndex('stepResult');
  const stepValueIdx = getFieldIndex('stepValue');
  const errorMessageIdx = getFieldIndex('errorMessage');
  
  logger.info('[Import] Field indices:', { snIdx, testNameIdx, resultIdx, valueIdx, stepNameCount: stepNameIndices.length });
  logger.info('[Import] Step name columns:', stepNameIndices.map(idx => headers[idx]));
  
  // 如果没有检测到测试名称字段，使用第一列作为测试名称
  const effectiveTestNameIdx = testNameIdx >= 0 ? testNameIdx : 0;
  // 如果没有检测到SN字段，使用第二列或生成序号
  const effectiveSnIdx = snIdx >= 0 ? snIdx : (effectiveTestNameIdx === 0 ? 1 : 0);
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(cell => !cell.trim())) continue;
    
    // 获取测试名称（必须有测试名称才创建记录）
    const testName = row[effectiveTestNameIdx]?.trim();
    if (!testName) continue;
    
    // 获取SN
    let sn = effectiveSnIdx >= 0 && effectiveSnIdx < row.length ? row[effectiveSnIdx]?.trim() : '';
    if (!sn) sn = `AUTO_${String(i + 1).padStart(4, '0')}`;
    
    // 构建测试用例
    const testCase: ITestCase = {
      id: `TC_${Date.now()}_${i}`,
      sn,
      testName,
      result: resultIdx >= 0 ? parseResult(row[resultIdx]) : 'SKIP',
      testTime: new Date().toISOString(),
      steps: [],
    };
    
    // 解析数值字段
    if (valueIdx >= 0 && row[valueIdx]) {
      testCase.value = parseNumber(row[valueIdx]);
    }
    if (lowerLimitIdx >= 0 && row[lowerLimitIdx]) {
      testCase.lowerLimit = parseNumber(row[lowerLimitIdx]);
    }
    if (upperLimitIdx >= 0 && row[upperLimitIdx]) {
      testCase.upperLimit = parseNumber(row[upperLimitIdx]);
    }
    if (unitIdx >= 0 && row[unitIdx]) {
      testCase.unit = row[unitIdx].trim();
    }
    
    // 解析时间
    if (testTimeIdx >= 0 && row[testTimeIdx]) {
      const timeStr = row[testTimeIdx].trim();
      if (timeStr) {
        const parsedTime = new Date(timeStr);
        if (!isNaN(parsedTime.getTime())) {
          testCase.testTime = parsedTime.toISOString();
        }
      }
    }
    
    // 解析操作员和工位
    if (operatorIdx >= 0 && row[operatorIdx]) {
      testCase.operator = row[operatorIdx].trim();
    }
    if (stationIdx >= 0 && row[stationIdx]) {
      testCase.station = row[stationIdx].trim();
    }
    
    // 保留原始数据用于调试
    testCase.rawData = {};
    row.forEach((cell, idx) => {
      const header = mapping[idx]?.csvField || `Column_${idx}`;
      testCase.rawData![header] = cell;
    });
    
    // 处理多列Step数据
    if (stepNameIndices.length > 0) {
      // 有多列Step数据，每列代表一个步骤
      stepNameIndices.forEach((stepColIdx, stepIndex) => {
        const stepCellValue = row[stepColIdx]?.trim() || '';
        const stepHeader = headers[stepColIdx] || `Step${stepIndex + 1}`;
        
        // 从列标题提取步骤编号（如 "Step 1" -> "Step1"）
        let stepName = `Step${stepIndex + 1}`;
        const stepMatch = stepHeader.match(/(?:step|步骤|item)[\s_-]*(\d+)/i);
        if (stepMatch) {
          stepName = `Step${stepMatch[1]}`;
        }
        
        // 确定步骤结果：检查单元格内容是否包含Fail或Pass
        let stepResult: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
        const upperValue = stepCellValue.toUpperCase();
        if (upperValue.includes('FAIL') || upperValue === 'F') {
          stepResult = 'FAIL';
        } else if (upperValue.includes('PASS') || upperValue === 'P' || upperValue === 'OK') {
          stepResult = 'PASS';
        }
        
        const step: ITestStep = {
          stepNumber: stepIndex + 1,
          stepName: stepName,
          result: stepResult,
        };
        
        if (errorMessageIdx >= 0 && row[errorMessageIdx]) {
          step.errorMessage = row[errorMessageIdx].trim();
        }
        
        testCase.steps.push(step);
      });
    } else {
      // 如果没有步骤字段，将整个测试作为一个步骤
      testCase.steps.push({
        stepNumber: 1,
        stepName: testName,
        result: testCase.result,
        value: testCase.value,
        lowerLimit: testCase.lowerLimit,
        upperLimit: testCase.upperLimit,
        unit: testCase.unit,
        errorMessage: errorMessageIdx >= 0 ? row[errorMessageIdx]?.trim() : undefined,
      });
    }
    
    testCases.push(testCase);
  }
  
  return testCases;
};

const ImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [parsedData, setParsedData] = useState<ITestCase[]>([]);
  const [fieldMapping, setFieldMapping] = useState<IFieldMapping[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 读取 CSV 文件
  const readCSVFile = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const content = decodeWithFallback(arrayBuffer);
          resolve(content);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // 读取 Excel 文件
  const readExcelFile = useCallback((file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 转换为 JSON 数组（带表头）
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // 转换为字符串二维数组
          const result: string[][] = jsonData.map(row => 
            row.map(cell => cell === null || cell === undefined ? '' : String(cell).trim())
          );
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Excel文件读取失败'));
      reader.readAsBinaryString(file);
    });
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setParseError(null);
    setDebugInfo('');
    
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('请上传CSV或Excel文件');
      return;
    }

    setIsLoading(true);
    setFile(selectedFile);

    try {
      let parsed: string[][] = [];
      
      // 根据文件类型选择解析方式
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setDebugInfo(prev => prev + `文件类型: Excel\n`);
        parsed = await readExcelFile(selectedFile);
        setDebugInfo(prev => prev + `解析行数: ${parsed.length}\n`);
      } else {
        // CSV 文件
        setDebugInfo(prev => prev + `文件类型: CSV\n`);
        const content = await readCSVFile(selectedFile);
        setDebugInfo(prev => prev + `文件大小: ${content.length} 字符\n`);
        setDebugInfo(prev => prev + `前100字符: ${content.substring(0, 100)}\n`);
        parsed = parseCSV(content);
        setDebugInfo(prev => prev + `解析行数: ${parsed.length}\n`);
      }
      
      if (parsed.length < 1) {
        toast.error('文件为空或格式不正确');
        setIsLoading(false);
        return;
      }

      const headers = parsed[0];
      const dataRows = parsed.slice(1).filter(row => row.some(cell => cell.trim()));
      
      setDebugInfo(prev => prev + `表头: ${headers.join(', ')}\n`);
      setDebugInfo(prev => prev + `数据行数: ${dataRows.length}\n`);
      
      if (dataRows.length === 0) {
        toast.error('文件中没有数据行');
        setIsLoading(false);
        return;
      }
      
      setRawData([headers, ...dataRows]);
      
      const mapping = detectFieldMapping(headers);
      setFieldMapping(mapping);
      
      const detectedFields = mapping.filter(m => m.targetField !== 'ignore').map(m => `${m.csvField}->${m.targetField}`);
      setDebugInfo(prev => prev + `检测到字段: ${detectedFields.join(', ')}\n`);
      
      const testCases = parseTestData(dataRows, mapping, headers);
      setParsedData(testCases);
      
      setDebugInfo(prev => prev + `成功解析: ${testCases.length} 条测试数据\n`);
      
      if (testCases.length === 0) {
        setParseError('未能识别到有效测试数据，请检查字段映射设置');
        toast.warning('未能识别到有效测试数据');
      } else if (testCases.length < dataRows.length * 0.5) {
        setParseError(`只解析出 ${testCases.length}/${dataRows.length} 条数据，部分行可能缺少测试名称`);
        toast.warning(`部分数据未解析，请检查调试信息`);
      } else {
        toast.success(`成功解析 ${testCases.length} 条测试数据`);
      }
    } catch (error) {
      logger.error('Parse error:', error);
      setParseError(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
      toast.error('文件解析失败');
    } finally {
      setIsLoading(false);
    }
  }, [readCSVFile, readExcelFile]);

  // 拖拽处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 导入数据 - 清除历史数据，只保留当次导入
  const handleImport = () => {
    if (parsedData.length === 0) {
      toast.error('没有可导入的数据');
      return;
    }

    try {
      // 清理 rawData 后保存（直接替换，不清除历史数据）
      const cleanData = parsedData.map(({ rawData, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
      
      // 清除故障数据缓存（下次访问故障分析页面时会重新提取）
      localStorage.removeItem('__global_tdp_faults');
      
      toast.success(`成功导入 ${parsedData.length} 条测试数据`);
      
      setFile(null);
      setRawData([]);
      setParsedData([]);
      setFieldMapping([]);
      setParseError(null);
      setDebugInfo('');
    } catch (error) {
      toast.error('数据保存失败');
    }
  };

  // 更新字段映射
  const updateFieldMapping = (csvField: string, targetField: string) => {
    const newMapping = fieldMapping.map(m => 
      m.csvField === csvField ? { ...m, targetField } : m
    );
    setFieldMapping(newMapping);
    
    if (rawData.length > 1) {
      const headers = rawData[0];
      const dataRows = rawData.slice(1);
      const testCases = parseTestData(dataRows, newMapping, headers);
      setParsedData(testCases);
      setDebugInfo(prev => prev + `重新解析: ${testCases.length} 条数据\n`);
    }
  };

  // 统计信息
  const stats = useMemo(() => {
    const total = parsedData.length;
    const pass = parsedData.filter(t => t.result === 'PASS').length;
    const fail = parsedData.filter(t => t.result === 'FAIL').length;
    const skip = parsedData.filter(t => t.result === 'SKIP').length;
    const totalSteps = parsedData.reduce((sum, t) => sum + t.steps.length, 0);
    return { total, pass, fail, skip, totalSteps };
  }, [parsedData]);

  return (
    <div className="w-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">数据导入</h1>
          <p className="text-muted-foreground mt-1">支持CSV/Excel文件上传，智能解析测试数据</p>
        </div>
        {parsedData.length > 0 && (
          <Button onClick={handleImport} className="gap-2">
            <DatabaseIcon className="h-4 w-4" />
            导入数据 ({parsedData.length})
          </Button>
        )}
      </div>

      {/* 上传区域 */}
      {!file && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-muted-foreground'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                点击或拖拽上传文件
              </p>
              <p className="text-sm text-muted-foreground">
                支持 CSV, Excel (.xlsx, .xls) 格式文件
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 文件信息和错误提示 */}
      {file && (
        <Alert>
          <FileIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>已选择: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleFileSelect(file)}>
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                重新解析
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setRawData([]);
                  setParsedData([]);
                  setFieldMapping([]);
                  setParseError(null);
                  setDebugInfo('');
                }}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {parseError && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {/* 统计卡片 */}
      {parsedData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-2">
              <p className="text-xs text-muted-foreground">总测试数</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-2">
              <p className="text-xs text-green-600">通过</p>
              <p className="text-2xl font-bold text-green-600">{stats.pass}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-2">
              <p className="text-xs text-red-600">失败</p>
              <p className="text-2xl font-bold text-red-600">{stats.fail}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-2">
              <p className="text-xs text-muted-foreground">跳过</p>
              <p className="text-2xl font-bold">{stats.skip}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-2">
              <p className="text-xs text-muted-foreground">总步骤数</p>
              <p className="text-2xl font-bold">{stats.totalSteps}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 数据预览和调试 */}
      {rawData.length > 0 && (
        <Tabs defaultValue="parsed" className="w-full">
          <TabsList>
            <TabsTrigger value="parsed">解析结果 ({parsedData.length})</TabsTrigger>
            <TabsTrigger value="raw">原始数据 ({rawData.length - 1}行)</TabsTrigger>
            <TabsTrigger value="mapping">字段映射</TabsTrigger>
            <TabsTrigger value="debug">
              <BugIcon className="h-4 w-4 mr-1" />
              调试
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parsed">
            <Card>
              <CardHeader>
                <CardTitle>解析后的测试数据</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">序列号</TableHead>
                        <TableHead>测试名称</TableHead>
                        <TableHead className="w-[80px]">结果</TableHead>
                        <TableHead className="w-[100px]">测试值</TableHead>
                        <TableHead className="w-[120px]">上下限</TableHead>
                        <TableHead className="w-[80px]">步骤</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 20).map((testCase) => (
                        <TableRow key={testCase.id}>
                          <TableCell className="font-mono text-xs">{testCase.sn}</TableCell>
                          <TableCell className="font-medium max-w-[300px] truncate" title={testCase.testName}>
                            {testCase.testName}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={testCase.result === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 
                                         testCase.result === 'FAIL' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              {testCase.result}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {testCase.value !== undefined ? testCase.value.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {testCase.lowerLimit !== undefined && testCase.upperLimit !== undefined
                              ? `[${testCase.lowerLimit.toFixed(2)}, ${testCase.upperLimit.toFixed(2)}]`
                              : '-'}
                          </TableCell>
                          <TableCell>{testCase.steps.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangleIcon className="mx-auto h-8 w-8 mb-2" />
                      <p>未识别到有效测试数据</p>
                    </div>
                  )}
                  {parsedData.length > 20 && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      还有 {parsedData.length - 20} 条数据未显示
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>原始CSV数据</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {rawData[0]?.map((header, idx) => (
                          <TableHead key={idx} className="font-mono text-xs whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawData.slice(1, 11).map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx} className="font-mono text-xs max-w-[150px] truncate">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {rawData.length > 11 && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      还有 {rawData.length - 11} 行数据未显示
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping">
            <Card>
              <CardHeader>
                <CardTitle>字段映射配置</CardTitle>
                <CardDescription>调整CSV列与系统字段的对应关系</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fieldMapping.map((mapping) => (
                    <div key={mapping.csvField} className="space-y-2">
                      <Label className="text-xs text-muted-foreground truncate block" title={mapping.csvField}>
                        {mapping.csvField}
                      </Label>
                      <Select
                        value={mapping.targetField}
                        onValueChange={(value) => updateFieldMapping(mapping.csvField, value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug">
            <Card>
              <CardHeader>
                <CardTitle>调试信息</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded text-xs font-mono whitespace-pre-wrap">
                  {debugInfo || '暂无调试信息'}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 text-muted-foreground">正在解析文件...</span>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
