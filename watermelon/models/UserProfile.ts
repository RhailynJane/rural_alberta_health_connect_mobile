import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class UserProfile extends Model {
  static table = 'user_profiles';

  @field('userId') userId!: string;
  @field('address1') address1?: string;
  @field('address2') address2?: string;
  @field('age') age?: string;
  @field('ageRange') ageRange?: string;
  @field('allergies') allergies?: string;
  @field('city') city?: string;
  @field('currentMedications') currentMedications?: string;
  @field('emergencyContactName') emergencyContactName?: string;
  @field('emergencyContactPhone') emergencyContactPhone?: string;
  @field('location') location?: string;
  @field('locationServicesEnabled') locationServicesEnabled?: boolean;
  @field('medicalConditions') medicalConditions?: string;
  @field('onboardingCompleted') onboardingCompleted!: boolean;
  @field('postalCode') postalCode?: string;
  @field('province') province?: string;
  @field('reminders') reminders?: string;
  @field('symptomReminderDayOfWeek') symptomReminderDayOfWeek?: string;
  @field('symptomReminderEnabled') symptomReminderEnabled?: boolean;
  @field('symptomReminderFrequency') symptomReminderFrequency?: string;
  @field('symptomReminderTime') symptomReminderTime?: string;
  
  @readonly @date('createdAt') createdAt!: number;
  @readonly @date('updatedAt') updatedAt!: number;
}