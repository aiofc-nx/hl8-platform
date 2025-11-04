/**
 * @fileoverview 邀请用户DTO
 * @description 邀请用户加入租户的请求数据传输对象
 */

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";

/**
 * 邀请用户DTO
 * @description 用于接收邀请用户加入租户的HTTP请求数据
 */
export class InviteUserDto {
  /** 被邀请用户邮箱 */
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email!: string;

  /** 邀请码（6-20位字母数字） */
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9]{6,20}$/, {
    message: "邀请码必须是6-20位字母数字",
  })
  invitationCode!: string;
}
