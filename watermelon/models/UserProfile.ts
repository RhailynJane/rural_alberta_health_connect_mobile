import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class UserProfile extends Model {
  static table = 'user_profiles';

  @field('user_id') userId!: string;
  @field('age_range') ageRange?: string;
  @field('location') location?: string;
  @field('emergency_contact_name') emergencyContactName?: string;
  @field('emergency_contact_phone') emergencyContactPhone?: string;
  @field('medical_conditions') medicalConditions?: string;
  @field('current_medications') currentMedications?: string;
  @field('allergies') allergies?: string;
  @field('location_services_enabled') locationServicesEnabled?: boolean;
  @field('onboarding_completed') onboardingCompleted!: boolean;
  
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}