import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';

export default class HealthEntry extends Model {
  static table = 'health_entries';

  @field('userId') userId!: string;
  @field('convexId') convexId?: string;
  @field('date') date!: string;
  @field('timestamp') timestamp!: number;
  @field('symptoms') symptoms!: string;
  @field('severity') severity!: number;
  @field('category') category?: string;
  @field('duration') duration?: string;
  @field('aiContext') aiContext?: string;
  
  @json('photos', (raw: unknown) => {
    try {
      if (!raw) return [] as string[];
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      if (Array.isArray(raw)) {
        return raw as string[];
      }
      return [] as string[];
    } catch {
      return [] as string[];
    }
  })
  photos?: string[];
  
  @field('notes') notes?: string;
  @field('createdBy') createdBy!: string;
  @field('type') type?: string;
  @field('isSynced') isSynced!: boolean;
  @field('syncError') syncError?: string;

  // Soft delete and edit tracking (added in v10)
  @field('isDeleted') isDeleted?: boolean;
  @field('lastEditedAt') lastEditedAt?: number;
  @field('editCount') editCount?: number;

  @readonly @date('createdAt') createdAt!: number;
  @readonly @date('updatedAt') updatedAt!: number;
}