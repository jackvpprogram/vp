`前台sokcet emit 的事件名称和 on 的事件名称一样`

## 视频列表
### getVideos
  - params
    - roomName：页面router，如/day1
  - response
    - [video]：视频对象数组

## 问题列表
### getPollingList
  - params
    - videoId：视频ID
    - userType：当前用户类型
  - response
    - [polling]：问题对象数组

## 创建问题
### createPolling
  - params
    - videoId：视频ID
    - userType：当前用户类型
    - name：问题标题
    - desc：问题简述
    - answers：问题答案
  - response
    - true：创建成功

## 查找问题
### searchPolling
  - params
    - videoId：视频ID
    - userType：当前用户类型
    - name：问题标题
  - response
    - [polling]：问题对象数组

## 是否投过票
### isVote
  - params
    - pollingId：问题ID
    - userType：当前用户类型
  - response
    - true/false

## 问题明细
### getPolling
  - params
    - pollingId：问题ID
  - response
    - polling：：问题对象

## 投票
### vote
  - params
    - pollingId：问题ID
    - choose：选择的答案
    - userType：当前用户类型
  - response
    - true：投票成功

## 投票统计
### initVote
  - params
    - pollingId：问题ID
    - userType：当前用户类型
  - response
    - status：true/false，false表示初始化投票统计页面失败，如果失败则不返回result
    - result
      - polling：问题对象
      - voteVount：问题的总投票数
      - pollingChoose：当前用户选择的答案
      - optionsCount：问题各个答案占比
