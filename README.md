# KukuStory · 酷酷儿童故事

3-12 岁儿童故事/儿歌/启蒙内容小程序（NestJS 后端 + Taro 小程序 + Vue3 管理后台 + AI 内容生产管线）。

## 快速导航

| 入口 | 内容 |
|:--|:--|
| [`md/README.md`](md/README.md) | 产品/架构设计文档导航（00-20 权威口径与阅读路径） |
| [`开发文档/README.md`](开发文档/README.md) | 代码级实现文档（代码地图 / server / miniapp / admin） |
| [`md/审核归档/`](md/审核归档/) | 历次审核报告（一次性快照） |
| [`开发文档/00-代码地图.md`](开发文档/00-代码地图.md) | 三端结构、关键契约、扩展点与验证命令 |

## 三端速览

```
server/   NestJS 10 + PostgreSQL 15 + Redis     npm run start:dev / npm test
miniapp/  Taro 3 + React 18 + Zustand           npm run dev:weapp / npx tsc --noEmit
admin/    Vue 3 + Element Plus                  npm run dev
```

> 内容资产（production/、illustrations/ 等）与生产脚本（脚本/）不属于产品代码，详见 md/ 文档口径。
