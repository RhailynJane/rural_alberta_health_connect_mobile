import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @field('convex_user_id') convexUserId!: string;
  @field('email') email!: string;
  @field('first_name') firstName!: string;
  @field('last_name') lastName!: string;
  @field('has_completed_onboarding') hasCompletedOnboarding!: boolean;
  @field('email_verification_time') emailVerificationTime?: number;
  @field('phone') phone?: string;
  @field('phone_verification_time') phoneVerificationTime?: number;
  @field('is_anonymous') isAnonymous?: boolean;
  @field('name') name?: string;
  @field('image') image?: string;
  
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}