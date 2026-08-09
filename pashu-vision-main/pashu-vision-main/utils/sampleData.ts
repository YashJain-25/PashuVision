import { Registration, OwnerData, AnimalResult, Species, BreedIdentificationResult, PhotoFile, Gender, CasteCategory } from '../types';
import { CATTLE_BREEDS, BUFFALO_BREEDS } from '../constants';
import { INDIAN_STATES_AND_DISTRICTS } from './locationData';

// --- Helper Functions ---

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getRandomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// --- Data Arrays for Generation ---

const FIRST_NAMES = ["Rajesh", "Priya", "Amit", "Sunita", "Vikram", "Anjali", "Sanjay", "Meena", "Arun", "Pooja", "Deepak", "Lalita", "Kiran", "Suresh", "Kavita", "Ravi", "Geeta"];
const LAST_NAMES = ["Kumar", "Sharma", "Singh", "Patel", "Gupta", "Verma", "Reddy", "Yadav", "Chauhan", "Mehta", "Joshi", "Mishra"];
const VILLAGES = ["Ramgarh", "Devipur", "Sitapur", "Madhavpur", "Krishnanagar", "Gopalganj", "Lakshmipur", "Durgapur", "Shantipur", "Alipur"];

// --- Generation Logic ---

const generateOwner = (): OwnerData => {
    const state = getRandomElement(Object.keys(INDIAN_STATES_AND_DISTRICTS));
    const district = getRandomElement(INDIAN_STATES_AND_DISTRICTS[state]);
    
    return {
        name: `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`,
        mobile: `9${String(Math.floor(100000000 + Math.random() * 900000000))}`,
        dob: `${1960 + Math.floor(Math.random() * 40)}-${String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}`,
        gender: getRandomElement(['Male', 'Female', 'Other'] as const),
        address: `${Math.floor(10 + Math.random() * 90)} Main Road`,
        village: getRandomElement(VILLAGES),
        district,
        state,
        pincode: `${Math.floor(100000 + Math.random() * 900000)}`,
        idType: 'Aadhaar',
        idNumber: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        casteCategory: getRandomElement(['General', 'OBC', 'SC', 'ST'] as const),
        bankAccount: '',
        ifscCode: '',
    };
};

const generateAiResult = (species: Species, breedName: string): BreedIdentificationResult => {
    const outcome = Math.random();
    
    if (outcome < 0.1) { // 10% chance of error
        return {
            error: getRandomElement(["Image too blurry for analysis.", "Animal is obstructed.", "Multiple animals detected in photo."]),
            // Fix: Added missing 'species' property.
            species: species,
            breedName: 'Unknown',
            confidence: 0,
            milkYieldPotential: 'N/A',
            careNotes: 'N/A',
            reasoning: 'AI analysis could not be completed due to poor image quality.',
        };
    }
    
    if (outcome < 0.3) { // 20% chance of low confidence
        const confidence = 50 + Math.floor(Math.random() * 24);
        const breedList = species === 'Cattle' ? CATTLE_BREEDS : BUFFALO_BREEDS;
        const otherCandidates = [breedName, getRandomElement(breedList), getRandomElement(breedList)]
            .filter((v, i, a) => a.indexOf(v) === i) // unique
            .slice(0, 3);
            
        let c1 = 40 + Math.floor(Math.random() * 20);
        let c2 = 20 + Math.floor(Math.random() * 20);
        let c3 = 100 - c1 - c2;

        return {
            error: null,
            // Fix: Added missing 'species' property.
            species: species,
            breedName: getRandomElement(otherCandidates),
            confidence,
            milkYieldPotential: 'Varies based on breed; requires confirmation.',
            careNotes: 'General care suitable for most local breeds is recommended until breed is confirmed.',
            reasoning: `Visual markers are ambiguous. Key features match several breeds like ${otherCandidates.join(', ')}.`,
            topCandidates: [
                { breedName: otherCandidates[0], confidencePercentage: c1 },
                { breedName: otherCandidates[1], confidencePercentage: c2 },
                { breedName: otherCandidates[2] || getRandomElement(breedList), confidencePercentage: c3 },
            ],
            isUserVerified: true,
        };
    }

    // 70% chance of success
    return {
        error: null,
        // Fix: Added missing 'species' property.
        species: species,
        breedName,
        confidence: 75 + Math.floor(Math.random() * 25),
        milkYieldPotential: `Average for ${breedName} is typically between 8-12 liters/day.`,
        careNotes: `The ${breedName} is a hardy breed, well-suited for local climates. Ensure regular vaccinations and a balanced diet.`,
        reasoning: `Clear visual confirmation of breed-specific traits such as horn shape, coat color, and body structure.`,
    };
};

const generateAnimal = (): AnimalResult => {
    const species = getRandomElement(['Cattle', 'Buffalo'] as const);
    const breedName = getRandomElement(species === 'Cattle' ? CATTLE_BREEDS : BUFFALO_BREEDS);
    const ageUnit = getRandomElement(['Years', 'Months'] as const);
    
    return {
        id: `animal-${Date.now()}-${Math.random()}`,
        species,
        ageValue: ageUnit === 'Years' ? (1 + Math.floor(Math.random() * 8)).toString() : (6 + Math.floor(Math.random() * 6)).toString(),
        ageUnit,
        sex: getRandomElement(['Male', 'Female'] as const),
        photos: [],
        aiResult: generateAiResult(species, breedName),
    };
};

export const generateSampleRegistrations = (): Registration[] => {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const registrations: Registration[] = [];

    // Generate between 140 and 150 sample records
    const count = 140 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
        const owner = generateOwner();
        const animalCount = Math.random() < 0.8 ? 1 : 2; // 80% chance for 1 animal, 20% for 2
        const animals = Array.from({ length: animalCount }, generateAnimal);
        const timestamp = getRandomDate(oneWeekAgo, today).toISOString();
        
        registrations.push({
            id: `reg-${new Date(timestamp).getTime()}-${i}`,
            timestamp,
            owner,
            animals,
            isSample: true,
            synced: true, // Mark sample data as already synced
            status: 'Completed',
        });
    }

    return registrations;
};