export type Species = 'Cattle' | 'Buffalo';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type Confidence = 'High' | 'Medium' | 'Low';
export type AgeUnit = 'Years' | 'Months';

export interface PhotoFile {
  id: string;
  base64Data: string;
  mimeType: string;
  previewUrl: string;
}

export interface AnimalData {
  id:string;
  species: Species | '';
  ageValue: string;
  ageUnit: AgeUnit;
  sex: 'Male' | 'Female' | '';
  photos: PhotoFile[];
  sexConfidence?: Confidence;
}

export interface OwnerData {
  name: string;
  mobile: string;
  dob: string;
  gender: Gender | '';
  address: string;
  village: string;
  district: string;
  state: string;
  pincode: string;
  idType: IdType;
  idNumber: string;
  casteCategory: CasteCategory;
  bankAccount: string;
  ifscCode: string;
}

export type IdType = 'Aadhaar' | 'Voter ID' | 'Ration Card' | 'Passport' | '';
export type CasteCategory = 'General' | 'OBC' | 'SC' | 'ST' | '';

export interface BreedChoice {
  breedName: string;
  confidencePercentage: number;
}

export interface TranslatableText {
    en: string;
    hi: string;
}

export interface VaccinationRecord {
    id: string;
    vaccineName: string;
    administeredDate: string; // ISO date string
    dueDate: string; // ISO date string
    notes?: string;
}

export interface BreedIdentificationResult {
  error: string | null;
  species: Species | '';
  breedName: string;
  confidence: number;
  isUserVerified?: boolean;
  milkYieldPotential: TranslatableText | string;
  careNotes: TranslatableText | string;
  reasoning: TranslatableText | string;
  topCandidates?: BreedChoice[];
}

export interface AnimalResult extends AnimalData {
  aiResult: BreedIdentificationResult;
  vaccinations?: VaccinationRecord[];
}

export interface Registration {
  id: string;
  timestamp: string;
  owner: OwnerData;
  animals: AnimalResult[];
  isSample?: boolean;
  synced: boolean;
  status?: 'Draft' | 'Completed';
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface BreedInfo {
    name: string;
    species: Species;
    facts: string;
    sources?: { uri: string; title: string }[];
}

export interface SchemeInfo {
    schemeName: string;
    issuingBody: string;
    description: string;
    eligibility: string;
    healthCheckRequired: boolean;
    healthCheckFrequency: string;
}