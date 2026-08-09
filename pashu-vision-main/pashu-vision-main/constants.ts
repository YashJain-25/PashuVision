

import { OwnerData, BreedInfo } from './types';
import { INDIAN_STATES_AND_DISTRICTS } from './utils/locationData';

// Updated with indigenous, cross-bred, and exotic breeds.
export const CATTLE_BREEDS: string[] = [
    "Alambadi", "Amritmahal", "Ayrshire", "Bachaur", "Badri", "Bargur", "Belahi", "Binjharpuri", "Brown Swiss", "Dagri", "Dangi", "Deoni", "Frieswal", "Gangatiri", "Gaolao", "Ghumusari", "Gir", "Guernsey", "Hallikar", "Hariana", "Himachali Pahari", "Holstein Friesian", "Jersey", "Kangayam", "Kankrej", "Kasargod", "Kathani", "Kenkatha", "Khariar", "Kherigarh", "Khillari", "Konkan Kapila", "Kosali", "Krishna Valley", "Ladakhi", "Lakhimi", "Malnad Gidda", "Malvi", "Masilum", "Mewati", "Motu", "Nagon", "Nagori", "Nari", "Nimari", "Ongole", "Poda Thurpu", "Ponwar", "Pulikulam", "Punganur", "Purnea", "Rathi", "Red Dane", "Red Kandhari", "Red Sindhi", "Sahiwal", "Sanchori", "Shweta Kapila", "Siri", "Tharparkar", "Thutho", "Umblachery", "Vechur"
];

// Updated with 19 breeds as per ICAR-NBAGR data, corrected list.
export const BUFFALO_BREEDS: string[] = [
    "Banni", "Bhadawari", "Chhattisgarhi", "Chilika", "Dharwad", "Gojri", "Jaffarabadi", "Kalahandi", "Luit (Swamp)", "Manda", "Marathwadi", "Mehsana", "Murrah", "Nagpuri", "Nili Ravi", "Pandharpuri", "Purnathadi", "Surti", "Toda"
];

export const ALL_BREEDS: BreedInfo[] = [
    // Cattle
    ...CATTLE_BREEDS.map(b => ({ name: b, species: 'Cattle' as 'Cattle', facts: 'Detailed facts for this breed are being compiled and will be available soon.' })),
    // Buffalo
    ...BUFFALO_BREEDS.map(b => ({ name: b, species: 'Buffalo' as 'Buffalo', facts: 'Detailed facts for this breed are being compiled and will be available soon.' })),
];

// Sample facts for demonstration
const sampleFacts: { [key: string]: string } = {
    "Sahiwal": "The Sahiwal is one of the best dairy breeds of zebu cattle, known for its high milk production and heat tolerance. It originated in the Sahiwal district of Punjab, Pakistan. They are generally docile and lethargic, making them easy to manage. Their milk is known for a high butterfat content.",
    "Gir": "The Gir is a famous dairy cattle breed originating from the Gir hills of South Kathiwar in Gujarat. It is renowned for its milking prowess and tolerance to hot, stressful conditions. A key characteristic is their convex forehead, which acts as a cooling system for the brain and pituitary gland.",
    "Murrah": "Murrah buffalo is a breed of water buffalo mainly found in the Indian states of Haryana and Punjab. It is kept for dairy production. The Murrah is known as the 'black gold' of India and is one of the most efficient milk producers in the world. They have tightly curled horns, a distinct feature of the breed.",
    "Tharparkar": "The Tharparkar is a dual-purpose breed, known for both its milking and draught capabilities. It originates from the Tharparkar District in Sindh province, now in Pakistan, and is also found in Rajasthan, India. They are very hardy and can thrive on poor-quality feed and under harsh environmental conditions."
};

// Add sample facts to the main list
ALL_BREEDS.forEach(breed => {
    if (sampleFacts[breed.name]) {
        breed.facts = sampleFacts[breed.name];
    }
});
ALL_BREEDS.sort((a, b) => a.name.localeCompare(b.name));

export const INDIAN_STATES: string[] = Object.keys(INDIAN_STATES_AND_DISTRICTS).sort();


export const EMPTY_OWNER_DATA: OwnerData = {
    name: "",
    mobile: "",
    dob: "",
    gender: "",
    address: "",
    village: "",
    district: "",
    state: "",
    pincode: "",
    idType: "Aadhaar",
    idNumber: "",
    casteCategory: "",
    bankAccount: "",
    ifscCode: "",
};

export const ANALYSIS_MESSAGES: string[] = [
    "Initializing AI-Vet analysis...",
    "Scanning image for key features...",
    "Analyzing coat patterns and coloration...",
    "Comparing facial structure with breed database...",
    "Evaluating horn shape and size...",
    "Checking body conformation and musculature...",
    "Cross-referencing with 70+ indigenous breeds...",
    "Finalizing confidence score...",
    "Compiling genetic trait report...",
    "Almost there, generating care recommendations..."
];