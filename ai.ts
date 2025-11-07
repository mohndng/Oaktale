import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

let genAI: GoogleGenerativeAI;

export function initializeAi() {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        throw new Error("API key not found. Please set it in the modal.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
}

export function getApiKey(): string | null {
    return localStorage.getItem('geminiApiKey');
}

export function saveApiKey(apiKey: string) {
    localStorage.setItem('geminiApiKey', apiKey);
}

export async function generateImage(prompt: string): Promise<string> {
    if (!genAI) {
        initializeAi();
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const base64Data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Data) {
            return `data:image/png;base64,${base64Data}`;
        } else {
            throw new Error("Image generation failed, no data received.");
        }
    } catch (error) {
        console.error("Error generating image with Gemini:", error);
        throw error;
    }
}
