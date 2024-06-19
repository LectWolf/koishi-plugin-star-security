# koishi-plugin-star-security

[![npm](https://img.shields.io/npm/v/koishi-plugin-star-security?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-star-security)

给臭耀星做的进群审批

限定了只适用于Onebot适配器 ( 其他的怕出问题 )

**进群审批**为关键词审批

**人机验证**为6位数字输入验证



## 配置项

> 基础设置 ( 自动审批 )

### autoJoin

- 类型: `boolean`

是否自动批准入群

### groupList

- 类型: `string[]`

启用的群组列表,填写QQ群号

适用于一群二群三群相同的审批单词的

如果需要不同群不同审批词,右上角管理配置->添加新配置

### wordList

- 类型: `string[]`

自动审批的单词

也就是如果用户进群包含其中任意一个单词

就自动审批通过

### welcomeText

- 类型: `string`

进群欢迎文本



> 反机器人设置 ( 人机验证 )

### antiRobot

- 类型: `boolean`

是否开启人机验证

### allowTime

- 类型: `number`
- 默认: `30`

人机验证允许时长(分钟)

也就是需要在{allowTime}秒内验证

### inkRemind

- 类型: `number`
- 默认: `5`

人机验证提醒间隔(分钟)

在第一次进群提醒之后,当用户发言间隔超过该值

会提醒其进行人机验证
