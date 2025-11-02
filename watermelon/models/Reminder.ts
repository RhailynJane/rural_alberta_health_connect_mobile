import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class Reminder extends Model {
  static table = 'reminders';

  // Use camelCase columns (v7+); legacy snake_case columns remain in DB for back-compat
  @field('userId') userId!: string;
  @field('reminderId') reminderId!: string;
  @field('enabled') enabled!: boolean;
  @field('frequency') frequency!: string; // 'hourly' | 'daily' | 'weekly'
  @field('time') time?: string | null; // HH:mm
  @field('dayOfWeek') dayOfWeek?: string | null; // Mon..Sun

  @readonly @date('createdAt') createdAt!: Date;
  @readonly @date('updatedAt') updatedAt!: Date;
}
