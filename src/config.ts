import { Schema } from "koishi";

// 基础设置
export interface BaseConfig {
  name?: string;
  debug?: boolean;
  autoJoin?: boolean;
  groupList?: string[];
  fullblock?: boolean;
  wordList?: string[];
  blackWordList?: string[];
  limitlevel?: number;
  limitleveljoin?: number;
  alwaysWelcome?: boolean;
  welcomeText?: string;
}

// 反机器人设置
export interface AntiConfig {
  antiRobot?: boolean;
  alwaysAnti?: boolean;
  allowTime?: number;
  inkRemind?: number;
}

export const BaseConfig: Schema<BaseConfig> = Schema.intersect([
  Schema.object({
    name: Schema.string().default("name").description("名称(标记给自己看的)"),
    debug: Schema.boolean().description("调试模式").default(false),
    autoJoin: Schema.boolean().description("是否自动批准入群").default(false),
  }).description("基础设置"),
  Schema.union([
    Schema.object({
      autoJoin: Schema.const(true).required(),
      groupList: Schema.array(String)
        .role("table")
        .description(
          "启用的群组列表 > 就是QQ群号 | 如果需要不同群不同审批词,右上角管理多份配置->添加新配置"
        ),
      fullblock: Schema.boolean().description("群满禁止入群").default(false),
      wordList: Schema.array(String)
        .role("table")
        .description("自动审批的单词"),
      blackWordList: Schema.array(String)
        .role("table")
        .description("黑名单单词(遇到即拒绝)"),
      limitlevel: Schema.number()
        .description("最低自动审批等级(QQ等级)")
        .default(0),
      limitleveljoin: Schema.number()
        .description("退群后N天内禁止入群")
        .default(0),
      alwaysWelcome: Schema.boolean()
        .description("无论谁批准都进行进群欢迎")
        .default(false),
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
      alwaysAnti: Schema.boolean()
        .description("无论谁批准都进行人机验证")
        .default(false),
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
