import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class Reminder extends Model {
  static table = 'reminders';

  @field('user_id') userId!: string;
  @field('reminder_id') reminderId!: string;
  @field('enabled') enabled!: boolean;
  @field('frequency') frequency!: string; // 'hourly' | 'daily' | 'weekly'
  @field('time') time?: string | null; // HH:mm
  @field('day_of_week') dayOfWeek?: string | null; // Mon..Sun

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
