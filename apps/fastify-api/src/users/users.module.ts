import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

/**
 * 用户模块
 * @description 用户相关的功能模块，包含控制器和服务
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 导出服务以便其他模块使用
})
export class UsersModule {}
