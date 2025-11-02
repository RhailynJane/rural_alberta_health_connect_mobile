import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  // CamelCase columns (v6). Legacy snake_case columns remain on disk but are not mapped here.
  @field('convexUserId') convexUserId?: string;
  @field('email') email!: string;
  @field('firstName') firstName?: string;
  @field('lastName') lastName?: string;
  @field('hasCompletedOnboarding') hasCompletedOnboarding?: boolean;
  @field('emailVerificationTime') emailVerificationTime?: number;
  @field('phone') phone?: string;
  @field('phoneVerificationTime') phoneVerificationTime?: number;
  @field('isAnonymous') isAnonymous?: boolean;
  @field('name') name?: string;
  @field('image') image?: string;

  @readonly @date('createdAt') createdAt?: number;
  @readonly @date('updatedAt') updatedAt?: number;
}