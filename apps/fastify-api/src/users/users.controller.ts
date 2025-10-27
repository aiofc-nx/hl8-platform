import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

/**
 * 用户控制器
 * @description 处理用户相关的 HTTP 请求
 */
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 创建新用户
   * @param createUserDto 创建用户的数据
   * @returns 创建的用户对象
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * 获取所有用户
   * @returns 用户列表
   */
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * 根据ID获取用户
   * @param id 用户ID
   * @returns 用户对象
   */
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param updateUserDto 更新用户的数据
   * @returns 更新后的用户对象
   */
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 删除操作结果
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
