import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @field('convex_user_id') convexUserId!: string;
  @field('email') email!: string;
  @field('first_name') firstName!: string;
  @field('last_name') lastName!: string;
  @field('has_completed_onboarding') hasCompletedOnboarding!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  
  @field('_status') _status!: string;
  @field('_changed') _changed!: string;
}