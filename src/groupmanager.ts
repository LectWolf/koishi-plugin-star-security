import { Context, Session, h, Bot } from "koishi";
import { Config } from ".";

export const reusable = true;

async function getAvailableGroup(groupList: string[], bot: Bot<Context, any>) {
  for (const groupId of groupList) {
    const groupInfo = await bot.internal.getGroupInfo(groupId);
    if (groupInfo.member_count < groupInfo.max_member_count) {
      return groupId;
    }
  }
  return null;
}

async function allowGroupRequest(
  session: Session,
  config: Config,
  data: any,
  approve: boolean,
  reason?: string
) {
  if (!approve) {
    // 拒绝
    if (!reason) {
      // 换群
      const availableGroup = await getAvailableGroup(
        config.groupList,
        session.bot
      );
      if (availableGroup) {
        await session.bot.internal.setGroupAddRequest(
          data.flag,
          data.sub_type,
          false,
          `群已满,请加群:${availableGroup}`
        );
      } else {
        await session.bot.internal.setGroupAddRequest(
          data.flag,
          data.sub_type,
          false,
          `群已满,请联系管理员`
        );
      }
    } else {
      await session.bot.internal.setGroupAddRequest(
        data.flag,
        data.sub_type,
        approve,
        reason
      );
    }
    return;
  }
  const groupInfo = await session.bot.internal.getGroupInfo(
    session.guildId,
    true
  );
  if (groupInfo.member_count >= groupInfo.max_member_count) {
    // 换群
    const availableGroup = await getAvailableGroup(
      config.groupList,
      session.bot
    );
    if (availableGroup) {
      await session.bot.internal.setGroupAddRequest(
        data.flag,
        data.sub_type,
        false,
        `群已满,请加新群`
      );
    } else {
      await session.bot.internal.setGroupAddRequest(
        data.flag,
        data.sub_type,
        false,
        `群已满,当前无新群可用`
      );
    }
  } else {
    await session.bot.internal.setGroupAddRequest(
      data.flag,
      data.sub_type,
      true
    );
  }
}

export function apply(ctx: Context, config: Config) {
  // 入群处理
  ctx.on("guild-member-request", async (session) => {
    if (!config.autoJoin) return;

    const { _data: data } = session.event;
    // 自主加群
    if (data.sub_type === "add") {
      const groupInfo = await session.bot.internal.getGroupInfo(
        session.guildId,
        true
      );
      if (groupInfo.member_count >= groupInfo.max_member_count) {
        // 群满换群
        await allowGroupRequest(session, config, data, false);
        return;
      }
      // 没写单词就直接过
      if (!config.wordList || config.wordList.length == 0) {
        allowGroupRequest(session, config, data, true);
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
        allowGroupRequest(session, config, data, true);
      }
    }
  });

  // 进群欢迎 & 人机验证
  ctx.on("guild-member-added", async (session) => {
    const { _data: data } = session.event;
    if (data.operator_id != session.selfId && !config.alwaysWelcome) {
      return;
    }

    if (!config.autoJoin) return;
    // 最终的欢迎语
    let welcome: string;
    if (config.antiRobot) {
      if (
        data.operator_id == session.selfId ||
        (data.operator_id != session.selfId && config.alwaysAnti)
      ) {
        welcome = session.text("star-security.antirobot.success");
      }
    }
    if (config.welcomeText) {
      if (welcome) {
        welcome += "\r" + config.welcomeText;
      } else {
        welcome = config.welcomeText;
      }
    }

    if (config.antiRobot) {
      if (
        data.operator_id == session.selfId ||
        (data.operator_id != session.selfId && config.alwaysAnti)
      ) {
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
    }
    if (welcome) {
      await session.send(h.at(session.userId) + "\r" + welcome);
    }
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
