/**
 * entities/index.ts — 实体统一导出（barrel）
 * 供 TypeORM 配置与各模块统一引用。12 张表对应 md/08 §2.2。
 */
export { User } from './user.entity';
export { ChildProfile } from './child-profile.entity';
export { Favorite, ContentType } from './favorite.entity';
export { PlayHistory } from './play-history.entity';
export { LearningProgress, Subject, StudyType } from './learning-progress.entity';
export { ComprehensiveTest, TriggerType } from './comprehensive-test.entity';
export { ChildAchievement, AchievementType } from './child-achievement.entity';
export { ParentSetting } from './parent-setting.entity';
export { Event, EventType } from './event.entity';
export { Membership, PlanType, MembershipStatus } from './membership.entity';
export { Order, OrderStatus } from './order.entity';
export { ConsentRecord } from './consent-record.entity';

import { User } from './user.entity';
import { ChildProfile } from './child-profile.entity';
import { Favorite } from './favorite.entity';
import { PlayHistory } from './play-history.entity';
import { LearningProgress } from './learning-progress.entity';
import { ComprehensiveTest } from './comprehensive-test.entity';
import { ChildAchievement } from './child-achievement.entity';
import { ParentSetting } from './parent-setting.entity';
import { Event } from './event.entity';
import { Membership } from './membership.entity';
import { Order } from './order.entity';
import { ConsentRecord } from './consent-record.entity';

/** 全部实体数组，供 TypeOrmModule.forRoot({ entities }) 使用 */
export const ALL_ENTITIES = [
  User,
  ChildProfile,
  Favorite,
  PlayHistory,
  LearningProgress,
  ComprehensiveTest,
  ChildAchievement,
  ParentSetting,
  Event,
  Membership,
  Order,
  ConsentRecord,
];
