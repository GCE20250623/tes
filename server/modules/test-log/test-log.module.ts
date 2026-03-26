import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TestLogController } from './test-log.controller';
import { TestLogService } from './test-log.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [TestLogController],
  providers: [TestLogService],
  exports: [TestLogService],
})
export class TestLogModule {}
