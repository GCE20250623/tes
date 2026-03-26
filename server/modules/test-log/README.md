# 测试日志分析模块 (Test Log Analysis Module)

## 功能说明

支持解析多种格式的测试日志文件，自动计算通过率、失败率，并提供详细的数据导出功能。

## 支持的日志格式

### 1. 标准格式日志

```
[001] Test User Login - PASS - 150ms
[002] Test Product Search - PASS - 230ms
[003] Test Add to Cart - FAIL - 500ms - Error: Database timeout
```

### 2. 结构化格式日志 (推荐)

```
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
4 +12V 11.5~12.5 12.039 Pass
```

**解析的元数据字段：**
| 字段 | 说明 |
|------|------|
| ProdName | 产品名称 |
| SerialNumber | 序列号 |
| TestUser | 测试用户 |
| TestRack | 测试工位 |
| TestFixture | 测试夹具 |
| Cavity | 腔体号 |
| TestTime | 测试时间 |
| TestResult | 测试结果 (PASS/FAIL) |

### 3. CSV 格式

```csv
id,name,status,duration
001,User Login,PASS,150ms
002,Product Search,FAIL,500ms
```

## API 接口

### 上传文件分析
```
POST /api/test-log/upload
Content-Type: multipart/form-data
```

### 路径分析
```
POST /api/test-log/analyze-path
Content-Type: application/json
Body: { "filePath": "C:\\path\\to\\log.txt" }
```

### 获取汇总
```
GET /api/test-log/summary?filePath=/path/to/file.log
```

### 列出日志文件
```
GET /api/test-log/files?directory=/path/to/dir
```

### 导出 Excel
```
POST /api/test-log/export-excel
Content-Type: application/json
Body: { "data": [...], "filename": "report.xlsx" }
```

## 响应格式

```json
{
  "success": true,
  "filename": "test.log",
  "totalTests": 10,
  "passedTests": 8,
  "failedTests": 2,
  "passRate": 80.0,
  "duration": "5.2s",
  "errors": ["Database timeout"],
  "testCases": [
    {
      "id": "001",
      "name": "User Login",
      "status": "PASS",
      "duration": "150ms",
      "timestamp": "2025-09-15 18:47:48"
    }
  ],
  "summary": {
    "totalTests": 10,
    "passedTests": 8,
    "failedTests": 2,
    "passRate": 80.0,
    "avgDuration": "520ms",
    "startTime": "2025-09-15 18:47:48",
    "endTime": "2025-09-15 18:47:53"
  },
  "metadata": {
    "ProdName": "CORN5_2054D",
    "SerialNumber": "2",
    "TestResult": "PASS"
  }
}
```

## 运行测试

```bash
cd server
npm test -- --testPathPattern=test-log
```

## 文件结构

```
server/modules/test-log/
├── test-log.controller.ts    # API控制器
├── test-log.module.ts         # NestJS模块
├── test-log.service.ts        # 业务逻辑
├── test-log.service.spec.ts   # 单元测试
├── README.md                  # 本文档
└── test-data/
    ├── sample-test.log        # 标准格式示例
    ├── sample-test.csv       # CSV格式示例
    └── sample-test-structured.txt  # 结构化格式示例
```
