/**
 * app.config.ts — 小程序全局配置
 *  - 4 Tab（故事/歌曲/成长/家长），文字 Tab（无需图标资源即可运行）
 *  - requiredBackgroundModes:['audio'] 支持后台播放（Q5）
 *  - 页面注册（S/M/G/C/A/PL 对应 md/09 页面 ID）
 */
export default defineAppConfig({
  pages: [
    'pages/story/index/index', // S-01 故事首页
    'pages/story/subject/index', // S-02 学科页（分类卡片）
    'pages/story/list/index', // S-03/05/06 通用条目浏览（单篇/混合/多层）
    'pages/story/work/index', // S-04 章回作品页（总入口+章节）
    'pages/story/player/index', // PL-01 故事播放器
    'pages/song/index/index', // M-01 歌曲首页
    'pages/song/player/index', // PL-02 歌曲播放器(LRC)
    'pages/song/list/index', // M-02/M-03 歌曲分类下钻(分类→歌曲列表)
    'pages/growth/index/index', // G-01 成长首页
    'pages/growth/lesson/index', // G-02/03 课程列表/详情
    'pages/growth/player/index', // PL-03 教学横屏三面板
    'pages/growth/challenge/index', // G-04/05 挑战
    'pages/growth/comprehensive/index', // G-05/06 综合挑战+结果
    'pages/growth/collection/index', // 朋友收集册可视化
    'pages/parent/index/index', // C-01 家长中心
    'pages/common/login/index', // A-01 登录
    'pages/common/favorites/index', // C-03 收藏
    'pages/common/history/index', // C-04 历史
    'pages/common/settings/index', // C-06 设置(主题)
    'pages/common/member/index', // A-03/04 会员/支付
    'pages/common/search/index', // C-05 搜索
    'pages/common/children/index', // A-02 孩子档案管理
    'pages/common/agreement/index', // 协议/隐私/儿童个人信息规则
    'pages/common/account-delete/index', // A-05 账号注销与数据删除
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FF8C42',
    navigationBarTitleText: '酷酷儿童故事',
    navigationBarTextStyle: 'white',
    backgroundColor: '#FFF9F0',
  },
  tabBar: {
    custom: true, // ★ 自定义 SVG TabBar（src/custom-tab-bar）；list 仍用于路由/兑底
    color: '#8B8D9E',
    selectedColor: '#FF8C42',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/story/index/index', text: '故事' },
      { pagePath: 'pages/song/index/index', text: '歌曲' },
      { pagePath: 'pages/growth/index/index', text: '成长' },
      { pagePath: 'pages/parent/index/index', text: '家长' },
    ],
  },
  requiredBackgroundModes: ['audio'],
});
