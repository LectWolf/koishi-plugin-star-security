import { Context, Session, h } from "koishi";
import { Config } from ".";

export const reusable = true;
export function apply(ctx: Context, config: Config) {
  // 入群处理
  ctx.on("guild-member-request", async (session) => {
    if (!config.autoJoin) return;

    console.log(session);
    const { _data: data } = session.event;
    // 自主加群
    if (data.sub_type === "add") {
      // 没写单词就直接过
      if (!config.wordList || config.wordList.length == 0) {
        session.bot.internal.setGroupAddRequest(data.flag, data.sub_type, true);
        return;
      }
      // 包含单词通过
      let comment = data.comment;
      // 只取答案
      const keyword = "答案：";
      const commentIndex = data.comment.indexOf(keyword);
      if (commentIndex !== -1) {
        comment = data.comment.substring(commentIndex + keyword.length);
      }

      // 忽略大小写匹配
      const allow = config.wordList.some((item) =>
        comment.toLowerCase().includes(item.toLowerCase())
      );

      if (allow) {
        session.bot.internal.setGroupAddRequest(data.flag, data.sub_type, true);
        return;
      }
    }
  });

  // 进群欢迎 & 人机验证
  ctx.on("guild-member-added", async (session) => {
    if (!config.autoJoin) return;
    // 最终的欢迎语
    let welcome: string;
    if (config.antiRobot) {
      welcome = session.text("star-security.antirobot.success");
    }
    if (config.welcomeText) {
      if (welcome) {
        welcome += "\r" + config.welcomeText;
      } else {
        welcome = config.welcomeText;
      }
    }

    if (config.antiRobot) {
      const code = Math.floor(100000 + Math.random() * 900000);
      // 发送验证消息
      await session.send(
        h.at(session.userId) +
          "\r" +
          session.text("star-security.antirobot.check", {
            limit: config.allowTime,
            code: code,
          })
      );

      const check = await waitcheck(
        ctx,
        session,
        code,
        config.allowTime,
        config.inkRemind
      );
      if (!check) {
        await session.bot.internal
          .setGroupKick(session.guildId, session.userId)
          .then(
            // 正确踢出后发送
            await session.send(
              session.text("star-security.antirobot.kick", {
                qq: session.userId,
              })
            )
          );
        return;
      }
    }
    await session.send(h.at(session.userId) + "\r" + welcome);
  });
}

// 等待验证
async function waitcheck(
  ctx: Context,
  session: Session,
  code: number,
  allowTime: number,
  inkRemind: number
) {
  console.log("测试", allowTime, inkRemind);
  return new Promise((resolve) => {
    // 当前时间
    let currentTime = Date.now();

    // 临时中间件
    const dispose = ctx
      .intersect((sess) => sess.userId === session.userId)
      .middleware(async (sess, next) => {
        if (sess.content.includes(code.toString())) {
          clearTimeout(timeout);
          resolve(true);
          // 取消中间件
          dispose();
          // 禁止其他操作
          return "";
        }
        // 提醒
        if (Date.now() > currentTime + inkRemind * 60 * 1000) {
          await sess.send([
            h.quote(sess.messageId),
            h.text(
              session.text("star-security.antirobot.remind", { code: code })
            ),
          ]);
          currentTime = Date.now();
        }
        return "";
      }, true);
    const timeout = setTimeout(() => {
      // 取消中间件
      dispose();
      resolve(false);
    }, allowTime * 60 * 1000);
  });
}
