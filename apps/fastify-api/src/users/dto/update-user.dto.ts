import { PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";

/**
 * 更新用户 DTO
 * @description 用于更新用户信息的数据传输对象，继承自 CreateUserDto 的所有字段但都是可选的
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
