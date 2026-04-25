export type UserRole = 'candidate' | 'employer';

export interface UISettings {
  accentColor: 'orange' | 'blue' | 'green' | 'purple';
  font: 'sans' | 'serif';
  darkMode: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  city: string;
  profession: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  strengths?: string;
  weaknesses?: string;
  experience?: 'junior' | 'mid' | 'senior';
  category?: 'IT' | 'Service' | 'Education' | 'Finance' | 'Healthcare' | 'Other';
  employmentType?: 'full-time' | 'part-time' | 'flexible';
  district?: string;
  microDistrict?: string;
  photoURL?: string;
  isProfileComplete: boolean;
  companySize?: '1-10' | '11-50' | '51-200' | '201+';
  isVerified?: boolean;
  trustScore?: number;
  flaggedCount?: number;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  uiSettings?: UISettings;
  createdAt?: any;
}

export interface JobPosting {
  id: string;
  employerId: string;
  employerName: string;
  profession: string;
  city: string;
  district?: string;
  microDistrict?: string;
  category: 'IT' | 'Service' | 'Education' | 'Finance' | 'Healthcare' | 'Other';
  experienceRequired: 'junior' | 'mid' | 'senior';
  employmentType: 'full-time' | 'part-time' | 'flexible';
  description: string;
  minSalary: number;
  maxSalary: number;
  preferredSalary: number;
  createdAt: any;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface Evaluation {
  pros: string[];
  cons: string[];
  summary: string;
}
