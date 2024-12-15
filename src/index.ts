import { Context } from "koishi";
import zh from "./locales/zh-CN.yml";
import * as groupmanager from "./groupmanager";
import { Config } from "./config";

export const name = "star-security";
export const inject = ["cache"];
export const reusable = true;

export * from "./config";

declare module "@koishijs/cache" {
  interface Tables {
    [key: `star_security_${string}`]: boolean;
  }
}
export function apply(ctx: Context, config: Config) {
  // 加载语言
  ctx.i18n.define("zh-CN", zh);

  ctx
    .intersect(
      (session) => config.autoJoin && config.groupList.includes(session.guildId)
    )
    .platform("onebot")
    .plugin(groupmanager, config);
}
