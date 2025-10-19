import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class MedicalFacility extends Model {
  static table = 'medical_facilities';

  @field('facility_id') facilityId!: string;
  @field('name') name!: string;
  @field('type') type!: string;
  @field('address') address!: string;
  @field('phone') phone?: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('distance') distance!: number;
  @field('distance_text') distanceText!: string;
  @field('source') source!: string;
  @field('user_location') userLocation!: string;
  
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}