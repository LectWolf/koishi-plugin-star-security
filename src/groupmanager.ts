import { Context, Session, h, Bot, Time } from "koishi";
import { Config } from ".";
import {} from "@koishijs/cache";

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

function debuglog(config: Config, type: string, text: string) {
  if (config.debug) {
    console.log(`[${type}]: ${text}`);
  }
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
        debuglog(config, "进群审批处理", "拒绝 理由: 群已满,请加新群");
        await session.bot.internal.setGroupAddRequest(
          data.flag,
          data.sub_type,
          false,
          `群已满,请加新群`
        );
      } else {
        debuglog(config, "进群审批处理", "拒绝 理由: 群已满,当前无新群可用");
        await session.bot.internal.setGroupAddRequest(
          data.flag,
          data.sub_type,
          false,
          `群已满,当前无新群可用`
        );
      }
    } else {
      debuglog(config, "进群审批处理", "拒绝 理由: " + reason);
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
  if (config.fullblock) {
    if (groupInfo.member_count >= groupInfo.max_member_count) {
      // 换群
      const availableGroup = await getAvailableGroup(
        config.groupList,
        session.bot
      );
      if (availableGroup) {
        debuglog(config, "进群审批处理", "拒绝 理由: 群已满,请加新群");
        await session.bot.internal.setGroupAddRequest(
          data.flag,
          data.sub_type,
          false,
          `群已满,请加新群`
        );
      } else {
        debuglog(config, "进群审批处理", "拒绝 理由: 群已满,当前无新群可用");
        await session.bot.internal.setGroupAddRequest(
          data.flag,
          data.sub_type,
          false,
          `群已满,当前无新群可用`
        );
      }
      return;
    }
  }
  debuglog(config, "进群审批处理", "同意");
  await session.bot.internal.setGroupAddRequest(data.flag, data.sub_type, true);
}

export function apply(ctx: Context, config: Config) {
  // 入群处理
  ctx.on("guild-member-request", async (session) => {
    if (!config.autoJoin) return;

    const { _data: data } = session.event;
    // 自主加群
    if (data.sub_type === "add") {
      // 取陌生人信息
      const qqinfo = await session.bot.internal.getStrangerInfo(
        data.user_id,
        true
      );
      // 取加群信息
      const groupInfo = await session.bot.internal.getGroupInfo(
        session.guildId,
        true
      );
      // 取申请关键词
      let comment = data.comment;
      const keyword = "答案：";
      const commentIndex = data.comment.indexOf(keyword);
      if (commentIndex !== -1) {
        comment = data.comment.substring(commentIndex + keyword.length);
      }
      debuglog(
        config,
        "进群审批",
        `正在处理进群审批 群号:${session.guildId} QQ:${data.user_id} 关键词:${comment} 人数:${groupInfo.member_count}/${groupInfo.max_member_count}`
      );

      if (await ctx.cache.get(`star_security_${config.name}`, data.user_id)) {
        // 缓存存在 -> 退群时间内
        // 直接拒绝
        debuglog(
          config,
          "进群审批",
          "QQ:" + data.user_id + " 入群申请拒绝 原因: 退群后加群冷却"
        );
        await allowGroupRequest(session, config, data, false, "当前无法加群");
        return;
      }

      if (config.fullblock) {
        if (groupInfo.member_count >= groupInfo.max_member_count) {
          // 群满换群
          debuglog(
            config,
            "进群审批",
            "QQ:" + data.user_id + " 入群申请拒绝 原因: 群已满"
          );
          await allowGroupRequest(session, config, data, false);
          return;
        }
      }
      if (qqinfo.level <= config.limitlevel && config.limitlevel != 0) {
        debuglog(
          config,
          "进群审批",
          "QQ:" +
            data.user_id +
            " 入群申请不处理 原因: 等级低于 " +
            config.limitlevel +
            " 级"
        );
        // 不处理
        return;
      }

      // 忽略大小写匹配 黑名单
      const block = config.blackWordList.some((item) =>
        comment.toLowerCase().includes(item.toLowerCase())
      );

      if (block) {
        debuglog(
          config,
          "进群审批",
          "QQ:" + data.user_id + " 入群申请拒绝 原因: 包含黑名单关键词"
        );
        allowGroupRequest(session, config, data, false, "拒绝入群");
        return;
      }

      if (!config.wordList || config.wordList.length == 0) {
        // 没写单词就直接过
        debuglog(
          config,
          "进群审批",
          "QQ:" + data.user_id + " 入群申请通过 原因: 未填写关键词名单"
        );
        allowGroupRequest(session, config, data, true);
        return;
      }

      // 忽略大小写匹配
      const allow = config.wordList.some((item) =>
        comment.toLowerCase().includes(item.toLowerCase())
      );

      if (allow) {
        debuglog(
          config,
          "进群审批",
          "QQ:" + data.user_id + " 入群申请通过 原因: 包含关键词"
        );
        allowGroupRequest(session, config, data, true);
      }
    }
  });

  // 进群欢迎 & 人机验证
  ctx.on("guild-member-added", async (session) => {
    const { _data: data } = session.event;
    debuglog(config, "进群欢迎", "获取到QQ:" + data.user_id + " 进群信息");
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
      debuglog(
        config,
        "进群欢迎",
        `正在准备欢迎文本 群号:${session.guildId} QQ:${data.user_id}`
      );
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
        debuglog(
          config,
          "人机验证",
          "QQ:" + session.userId + " 等待验证 验证码: " + code
        );
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
              debuglog(
                config,
                "人机验证",
                "QQ:" + session.userId + " 未及时验证,踢出群聊"
              ),
              await session.send(
                session.text("star-security.antirobot.kick", {
                  qq: session.userId,
                })
              )
            );
          return;
        } else {
          debuglog(config, "人机验证", "QQ:" + session.userId + " 通过验证");
        }
      }
    }
    if (welcome) {
      debuglog(config, "进群欢迎", `发送欢迎语`);
      await session.send(h.at(session.userId) + "\r" + welcome);
    }
  });

  // 退群
  ctx.on("guild-member-removed", async (session) => {
    const { _data: data } = session.event;
    if (config.limitleveljoin != 0 && config.limitleveljoin != null) {
      debuglog(
        config,
        "退群处理",
        "QQ:" + data.user_id + " 加入入群冷却 " + config.limitleveljoin + " 天"
      );
      await ctx.cache.set(
        `star_security_${config.name}`,
        data.user_id,
        true,
        config.limitleveljoin * Time.day
      );
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
