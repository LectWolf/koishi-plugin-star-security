import { Schema } from "koishi";
import { join } from "path";

// 基础设置
export interface BaseConfig {
  autoJoin?: boolean;
  groupList?: string[];
  wordList?: string[];
  welcomeText?: string;
}

// 反机器人设置
export interface AntiConfig {
  antiRobot?: boolean;
  allowTime?: number;
  inkRemind?: number;
}

export const BaseConfig: Schema<BaseConfig> = Schema.intersect([
  Schema.object({
    autoJoin: Schema.boolean().description("是否自动批准入群").default(false),
  }).description("基础设置"),
  Schema.union([
    Schema.object({
      autoJoin: Schema.const(true).required(),
      groupList: Schema.array(String)
        .role("table")
        .description("启用的群组列表(笨蛋就是QQ群号"),
      wordList: Schema.array(String)
        .role("table")
        .description("自动审批的单词"),
      welcomeText: Schema.string()
        .role("textarea", { rows: [2, 8] })
        .description("进群欢迎文本")
        .default("欢迎来到交流群\r玩得愉快"),
    }),
    Schema.object({}),
  ]),
]);

export const AntiConfig: Schema<AntiConfig> = Schema.intersect([
  Schema.object({
    antiRobot: Schema.boolean().description("是否开启人机验证").default(false),
  }).description("反机器人设置"),
  Schema.union([
    Schema.object({
      antiRobot: Schema.const(true).required(),
      allowTime: Schema.number()
        .description("人机验证允许时长(分钟)")
        .default(30),
      inkRemind: Schema.number()
        .description("人机验证提醒间隔(分钟)")
        .default(5),
    }),
    Schema.object({}),
  ]),
]);

export type Config = BaseConfig & AntiConfig;

export const Config: Schema<Config> = Schema.intersect([
  BaseConfig,
  AntiConfig,
]);
