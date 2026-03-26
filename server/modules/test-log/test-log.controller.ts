import { Controller, Post, Get, Body, Param, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { TestLogService, LogAnalysisResult, TestSummary } from './test-log.service';

@Controller('api/test-log')
export class TestLogController {
  constructor(private readonly testLogService: TestLogService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLog(@UploadedFile() file: Express.Multer.File): Promise<LogAnalysisResult> {
    return this.testLogService.analyzeLog(file.buffer, file.originalname);
  }

  @Post('analyze-path')
  async analyzePath(@Body() body: { filePath: string }): Promise<LogAnalysisResult> {
    return this.testLogService.analyzeFilePath(body.filePath);
  }

  @Get('summary')
  async getSummary(@Query('filePath') filePath: string): Promise<TestSummary> {
    return this.testLogService.getTestSummary(filePath);
  }

  @Get('download/:filename')
  async downloadTemplate(@Param('filename') filename: string, @Res() res: Response) {
    const templatePath = path.join(process.cwd(), 'templates', filename);
    if (fs.existsSync(templatePath)) {
      res.download(templatePath);
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  }

  @Get('files')
  async listLogFiles(@Query('directory') directory?: string): Promise<string[]> {
    return this.testLogService.listLogFiles(directory);
  }

  @Post('export-excel')
  async exportToExcel(@Body() body: { data: any[]; filename: string }, @Res() res: Response) {
    const excelBuffer = await this.testLogService.exportToExcel(body.data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${body.filename}`);
    res.send(excelBuffer);
  }
}
