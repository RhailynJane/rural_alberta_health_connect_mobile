import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';

export default class HealthEntry extends Model {
  static table = 'health_entries';

  @field('user_id') userId!: string;
  @field('convex_id') convexId?: string;
  @field('date') date!: string;
  @field('timestamp') timestamp!: number;
  @field('symptoms') symptoms!: string;
  @field('severity') severity!: number;
  @field('category') category?: string;
  @field('duration') duration?: string;
  @field('ai_context') aiContext?: string;
  
  @json('photos', (photos: string | null) => photos ? JSON.parse(photos) : [])
  photos?: string[];
  
  @field('notes') notes?: string;
  @field('type') type?: string;
  @field('is_synced') isSynced!: boolean;
  @field('sync_error') syncError?: string;
  
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
  
  @field('_status') _status!: string;
  @field('_changed') _changed!: string;
}