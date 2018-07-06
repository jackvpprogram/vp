`admin 默认看到的内容和VP一样，但是可以切换权限到AVP`

## 数据库恢复步骤
```bash
## 先将database 文件夹中的admin文件copy到根目录 /data/ 下
## shell中执行，如果没权限请在前面加sudo
mongorestore -d admin /data/admin
```

## 已存在的表
### chat
- username
- userType
- msg
- room: 当前页面，如/day1
- time：创建时间
- likes：[user],哪些用户赞同这个评论
- likesCount：赞同这个评论的总人数
- lastLikeDate
- isReply
- replyTo
- replyNum

### user
- displayname
- department
- username
- userType：0(admin),1(vp),2(avp)
- points
- teamId
- salt
- password
- login

### room
- roomName: url，如/day1

### answer
- username
- day
- question
- answer
- points
- status
- time


## 新增的表
### video
- _id
- poster：图片
- src：视频路径
- roomId：url，属于那个页面的视频，如/day1
- createAt：创建时间

### pollingMap
- _id
- videoId：关联视频表的外键ID
- userType：用户类型，枚举类型：1，2
- createAt：创建时间

### polling
- _id
- pollingMapId：关联视频和用户类型对应表的外键ID
- name：问题标题
- desc：问题简述
- answers：问题答案，数组类型：['a', 'b', 'c']
- createAt：创建时间

### pollingChoose
- _id
- pollingId：关联问题表的外键ID
- userId：关联用户表的外键ID
- choose：用户选择的答案
- userType：用户类型，枚举类型：1，2
- createAt：创建时间
