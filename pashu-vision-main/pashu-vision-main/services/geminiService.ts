import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { Species, SchemeInfo } from '../types';
import { CATTLE_BREEDS, BUFFALO_BREEDS } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key is not set. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
let breedChatInstance: Chat | null = null;
let generalChatInstance: Chat | null = null;

const breedChoiceSchema = {
    type: Type.OBJECT,
    properties: {
        breedName: {
            type: Type.STRING,
            description: "The name of a potential breed from the list."
        },
        confidencePercentage: {
            type: Type.INTEGER,
            description: "The AI's confidence in this specific breed, as a percentage (e.g., 60 for 60%)."
        }
    },
    required: ['breedName', 'confidencePercentage']
};

const translatableStringSchema = {
    type: Type.OBJECT,
    properties: {
        en: { type: Type.STRING, description: "The content in English." },
        hi: { type: Type.STRING, description: "The content in Hindi." }
    },
    required: ['en', 'hi']
};


const breedIdSchema = {
  type: Type.OBJECT,
  properties: {
    error: { 
      type: Type.STRING, 
      description: "Error message if validation fails (e.g., blurry image, not cattle/buffalo). Set to 'null' as a string if successful.",
    },
    species: { 
        type: Type.STRING, 
        description: "The identified species. Must be either 'Cattle' or 'Buffalo'. Set to 'Cattle' as a placeholder if an error occurs.",
        enum: ['Cattle', 'Buffalo']
    },
    breedName: { type: Type.STRING, description: "The single most likely breed name. Set to 'Unknown' if an error occurs." },
    confidence: { type: Type.INTEGER, description: "Overall confidence score as a percentage (0-100)." },
    milkYieldPotential: { ...translatableStringSchema, description: "A brief summary of the breed's milk yield potential, in both English and Hindi." },
    careNotes: { ...translatableStringSchema, description: "A short paragraph on general care and management, in both English and Hindi." },
    reasoning: { ...translatableStringSchema, description: "Brief explanation for the identification based on visual traits, in both English and Hindi." },
    topCandidates: {
      type: Type.ARRAY,
      description: "ONLY populate this array if the overall confidence is below 75. It should contain the top 3 most likely breed candidates. The confidence percentages among these candidates must sum to 100.",
      items: breedChoiceSchema
    }
  },
  required: ['error', 'species', 'breedName', 'confidence', 'milkYieldPotential', 'careNotes', 'reasoning'],
};

export const identifyBreed = async (images: { mimeType: string; data: string }[]) => {
  const prompt = `
    Your task is to identify the species and then the breed of the animal in the image(s) with the highest possible accuracy.

    Follow these steps meticulously:

    **Step 1: Species Identification**
    First, determine if the animal in the image is 'Cattle' or 'Buffalo'.
    - If it is clearly one of these, remember the species and proceed to Step 2.
    - If it is neither (e.g., a goat, dog, or unrecognizable), your task is complete. Immediately provide a JSON response where the 'error' field is "The animal is not cattle or buffalo.", 'species' is 'Cattle' (as a placeholder), 'breedName' is 'Unknown', 'confidence' is 0, and all translatable text fields are 'N/A'.

    **Step 2: Critical Validation**
    Perform these validation checks. If any check fails, provide a JSON response with the appropriate 'error' message, set 'species' to the species identified in Step 1 (or 'Cattle' as a placeholder), 'breedName' to 'Unknown', 'confidence' to 0, and translatable text fields to 'N/A'.
    1.  **Single Animal Check:** Are all images clearly of the same, single animal? If not, error is "Multiple animals or inconsistent images detected."
    2.  **Image Quality:** Are the images clear and well-lit? If blurry or obstructed, error is "Poor image quality for reliable identification."

    **Step 3: Breed Identification**
    If all checks pass, compare the animal against the correct breed list for the identified species.
    - For 'Cattle', use this list: [${CATTLE_BREEDS.join(', ')}]
    - For 'Buffalo', use this list: [${BUFFALO_BREEDS.join(', ')}]
    - Your main output is the single most likely 'breedName' and the identified 'species'.

    **Step 4: Doubt Resolution & Confidence**
    - Determine an overall 'confidence' score (0-100).
    - If your overall confidence is below 75, you MUST provide the top 3 most likely breeds in the 'topCandidates' array. The confidence percentages for these top 3 candidates must sum to 100.
    - If confidence is 75 or higher, the 'topCandidates' array MUST be empty.

    **Step 5: Generate JSON Output**
    Finally, provide your complete analysis strictly in the specified JSON format.
    - If successful, the 'error' field must be the string 'null'.
    - The 'species' field must be either 'Cattle' or 'Buffalo'.
    - Provide concise 'reasoning', 'milkYieldPotential', and 'careNotes' in both English ('en') and Hindi ('hi').
  `;

  const imageParts = images.map(image => ({
    inlineData: {
      mimeType: image.mimeType,
      data: image.data,
    },
  }));
  
  const systemInstruction = `You are an expert AI veterinarian with specialized knowledge in identifying Indian cattle and buffalo breeds from images. Your primary goal is accuracy. Follow all instructions precisely, performing a step-by-step analysis of visual features before making a final determination from the provided list of breeds.`;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: breedIdSchema,
        },
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);
    
    if(result.error && result.error.toLowerCase() === 'null') {
      result.error = null;
    }
    
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      error: "Failed to communicate with AI service. Please check your connection and API key.",
      species: 'Cattle',
      breedName: "Unknown",
      confidence: 0,
      milkYieldPotential: { en: "N/A", hi: "लागू नहीं" },
      careNotes: { en: "N/A", hi: "लागू नहीं" },
      reasoning: { en: "An error occurred during AI analysis.", hi: "एआई विश्लेषण के दौरान एक त्रुटि हुई।" },
    };
  }
};

const animalDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        error: {
            type: Type.STRING,
            description: "Error message if detection fails (e.g., unclear image). Set to 'null' as a string if successful.",
        },
        animals: {
            type: Type.ARRAY,
            description: "An array of all detected cattle or buffalo in the image.",
            items: {
                type: Type.OBJECT,
                properties: {
                    species: {
                        type: Type.STRING,
                        description: "The identified species. Must be either 'Cattle' or 'Buffalo'.",
                        enum: ['Cattle', 'Buffalo']
                    },
                    sex: {
                        type: Type.STRING,
                        description: "The identified sex. Must be either 'Male' or 'Female'.",
                        enum: ['Male', 'Female']
                    },
                    sexConfidence: {
                        type: Type.STRING,
                        description: "Confidence for sex detection: 'High', 'Medium', or 'Low'.",
                        enum: ['High', 'Medium', 'Low']
                    },
                },
                required: ['species', 'sex', 'sexConfidence']
            }
        }
    },
    required: ['error', 'animals'],
};

export const detectAnimalDetails = async (image: { mimeType: string; data: string }) => {
    const prompt = `
    Analyze the attached image to identify all instances of cattle and buffalo.
    For each animal found, determine its species ('Cattle' or 'Buffalo'), sex ('Male' or 'Female'), and your confidence in the sex determination ('High', 'Medium', or 'Low').

    To improve sex accuracy, look for these features:
    - **For 'Male'**: Look for the presence of a preputial sheath (pizzle) under the belly, a more pronounced hump (in Zebu cattle), and a generally more muscular build, especially in the neck and shoulders. The absence of a developed udder is a strong indicator.
    - **For 'Female'**: Look for the presence of an udder and teats between the hind legs. If the animal is young (a heifer), the udder may be small, but it should still be distinguishable.
    - **Confidence**: Base your confidence on the visibility of these key features. If they are clearly visible, confidence is 'High'. If they are somewhat obscured or ambiguous, it is 'Medium'. If they are not visible at all, confidence is 'Low'.

    - If the image is unclear, obstructed, or the key sex features are not visible, set the 'error' field.
    - If no animals are found in a clear image, return an empty 'animals' array.
    
    Provide your response strictly in the specified JSON format. If no error, the 'error' field must be the string 'null'.
  `;

    const imagePart = {
        inlineData: {
            mimeType: image.mimeType,
            data: image.data,
        },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: animalDetailsSchema,
            },
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);

        if (result.error && result.error.toLowerCase() === 'null') {
            result.error = null;
        }

        return result;

    } catch (error) {
        console.error("Error calling Gemini API for detail detection:", error);
        return {
            error: "Failed to auto-detect details from image.",
            animals: [],
        };
    }
};

export const getBreedFacts = async (breedName: string, species: Species) => {
    const prompt = `Provide detailed facts about the ${breedName} ${species} breed, focusing on its context within India. Include information on:
-   Origin and native tract
-   Physical characteristics (e.g., color, horns, build)
-   Temperament and behavior
-   Primary use (dairy, draught, dual-purpose)
-   Milk yield potential or draught capabilities
-   Special attributes or unique traits
-   Climatic suitability`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const facts = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        
        const sources = groundingChunks
            .map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string } => !!(web && web.uri));
            
        return {
            facts,
            sources,
            error: null,
        };

    } catch (error) {
        console.error("Error fetching breed facts with Google Search:", error);
        return {
            facts: "Could not retrieve detailed information for this breed at the moment. Please try again later.",
            sources: [],
            error: "Failed to communicate with the AI service.",
        };
    }
};

const schemeInfoSchema = {
    type: Type.OBJECT,
    properties: {
        schemeName: { type: Type.STRING, description: "Name of the government scheme or program." },
        issuingBody: { type: Type.STRING, description: "The issuing body (e.g., Central Government, State Government of Gujarat)." },
        description: { type: Type.STRING, description: "A brief summary of the scheme's benefits and purpose." },
        eligibility: { type: Type.STRING, description: "Key eligibility criteria for the animal owner or the animal itself." },
        healthCheckRequired: { type: Type.BOOLEAN, description: "A boolean indicating if periodic animal health checks are mandatory for this scheme." },
        healthCheckFrequency: { type: Type.STRING, description: "If health checks are required, specify the frequency (e.g., 'Annual', 'Bi-annual', 'Quarterly', 'On Application', 'Not Applicable')." },
    },
    required: ['schemeName', 'issuingBody', 'description', 'eligibility', 'healthCheckRequired', 'healthCheckFrequency']
};

const schemesSchema = {
    type: Type.ARRAY,
    items: schemeInfoSchema
};

export const getSchemeInfo = async (breedName: string, species: Species): Promise<{ schemes: SchemeInfo[], error: string | null }> => {
    const prompt = `
        List relevant and current central and state government schemes, subsidies, insurance programs, and breeding incentives available in India for owners of a ${breedName} ${species}.
        For each scheme, provide the following details:
        - schemeName: The official name of the scheme.
        - issuingBody: The governing body (e.g., 'Central Government', 'State Government of Gujarat').
        - description: A brief summary of the benefits.
        - eligibility: Key eligibility criteria for the farmer/owner.
        - healthCheckRequired: A boolean indicating if periodic animal health checks are mandatory for this scheme.
        - healthCheckFrequency: If health checks are required, specify the frequency (e.g., 'Annual', 'Bi-annual', 'Quarterly', 'Not Applicable').

        Provide your response strictly in the specified JSON format. If no specific schemes are found, return an empty array.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schemesSchema,
            },
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        return { schemes: result, error: null };
    } catch (error) {
        console.error("Error fetching scheme info:", error);
        return {
            schemes: [],
            error: "Could not retrieve scheme information at this time. Please try again later.",
        };
    }
};

const vaccinationSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        vaccineName: { type: Type.STRING, description: "Common name of the vaccine (e.g., FMD Vaccine)." },
        schedule: { type: Type.STRING, description: "A brief, typical vaccination schedule (e.g., 'Annually, before monsoon')." },
        importance: { type: Type.STRING, description: "A brief explanation of why this vaccine is important for this animal type in India." }
    },
    required: ['vaccineName', 'schedule', 'importance']
};

const vaccinationsSchema = {
    type: Type.ARRAY,
    description: "A list of 3-5 of the most critical vaccination recommendations.",
    items: vaccinationSuggestionSchema,
};


export const getVaccinationSchedule = async (breedName: string, species: Species) => {
    const prompt = `
        Based on standard veterinary practices in India, list the 3-5 most critical and commonly recommended vaccinations for a ${breedName} ${species}.
        For each vaccination, provide the following details in the specified JSON format:
        - vaccineName: The common name of the vaccine.
        - schedule: A brief, typical schedule (e.g., "Annually, pre-monsoon", "Every 6 months").
        - importance: A short sentence on why it's crucial (e.g., "Protects against a highly fatal bacterial disease.").

        Return your response strictly as a JSON array. If no specific information is available, return an empty array.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: vaccinationsSchema,
            },
        });
        const jsonText = response.text;
        return { suggestions: JSON.parse(jsonText), error: null };
    } catch (error) {
        console.error("Error fetching vaccination schedule:", error);
        return {
            suggestions: [],
            error: "Could not retrieve AI-powered vaccination suggestions at this time.",
        };
    }
};

export const startChat = (breedName: string) => {
    breedChatInstance = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are a helpful veterinary assistant specializing in Indian livestock. Your knowledge is focused on the ${breedName} breed. Answer questions clearly and concisely for field workers. Cover topics like care, common diseases, productivity, and nutrition.`,
        },
    });
};

export const sendMessageToChat = async (message: string): Promise<string> => {
    if (!breedChatInstance) {
        return "Chat not initialized. Please start a new chat session.";
    }

    try {
        const response: GenerateContentResponse = await breedChatInstance.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error sending message to chat:", error);
        return "Sorry, I encountered an error. Please try again.";
    }
};

// --- General Chatbot Functions ---

export const startGeneralChat = () => {
    if (!generalChatInstance) {
        generalChatInstance = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are पशुHelper, a friendly and knowledgeable AI assistant for veterinary field workers in India. Your expertise covers two main areas: 1. **Indian Livestock:** You can answer questions about all recognized Indian cattle and buffalo breeds, including their care, productivity, and health. 2. **The PashuVision App:** You are an expert on this application. You can guide users on how to use the app, including how to perform new registrations, view history, understand the dashboard, use the AI for breed identification, and update records. Always provide clear, practical, and concise answers, prioritizing animal welfare and standard veterinary practices when applicable.`,
            },
        });
    }
};


export const sendMessageToGeneralChat = async (message: string): Promise<string> => {
    if (!generalChatInstance) {
        startGeneralChat();
    }
    
    try {
        const response: GenerateContentResponse = await generalChatInstance!.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error sending message to general chat:", error);
        return "Sorry, I'm having trouble connecting right now. Please try again later.";
    }
};