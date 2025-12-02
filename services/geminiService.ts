import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DictionaryEntry, StoryResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Helper Functions ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number, // e.g. 24000
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Global Audio Context (Lazy loaded)
let audioContext: AudioContext | null = null;

export const playAudio = async (text: string, voiceName: string = 'Kore') => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    
    // Ensure context is running (mobile browsers suspend it)
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioContext,
      24000,
      1,
    );

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();

  } catch (error) {
    console.error("Audio generation failed:", error);
    // Fallback to basic Web Speech API if Gemini fails (e.g., quota or model issues)
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
};

// --- Dictionary Lookup ---

export const lookupTerm = async (
  term: string,
  nativeLang: string,
  targetLang: string
): Promise<DictionaryEntry> => {
  
  // 1. Text Analysis
  const prompt = `
    Analyze the term/sentence: "${term}".
    Target Language: ${targetLang}.
    Learner's Native Language: ${nativeLang}.
    
    Provide:
    1. A natural definition in ${nativeLang}.
    2. Two example sentences in ${targetLang} with ${nativeLang} translations.
    3. A "Usage Guide": A fun, casual, chatty explanation (like a friend explaining slang or nuances) covering culture, tone, or common pitfalls. Keep it concise but engaging. 
    4. Phonetic pronunciation guide (IPA or simple approximation).
  `;

  const textResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          examples: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                target: { type: Type.STRING },
                native: { type: Type.STRING }
              }
            }
          },
          usageGuide: { type: Type.STRING }
        }
      }
    }
  });

  const textData = JSON.parse(textResponse.text || "{}");

  // 2. Image Generation (Parallel)
  // Using gemini-2.5-flash-image for generation as per guide
  let imageUrl = undefined;
  try {
    const imagePrompt = `A simple, vibrant, fun, vector-art style illustration representing the concept of: "${term}". Minimalist, colorful, flat design.`;
    
    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: imagePrompt }]
        },
        config: {
            // Note: 2.5-flash-image doesn't support aspect ratio config in generateContent broadly like Imagen, 
            // but we use defaults. It returns inlineData.
        }
    });

    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
        }
    }
  } catch (e) {
      console.warn("Image generation failed, using placeholder", e);
      // Fallback handled in UI
  }

  return {
    id: Date.now().toString(),
    term: term,
    savedAt: Date.now(),
    phonetic: textData.phonetic,
    definition: textData.definition,
    examples: textData.examples || [],
    usageGuide: textData.usageGuide,
    imageUrl: imageUrl
  };
};

// --- Chat ---

export const createChatSession = (initialSystemInstruction: string) => {
    return ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
            systemInstruction: initialSystemInstruction
        }
    });
}

// --- Story Generation ---

export const generateStoryFromNotes = async (
  notes: DictionaryEntry[],
  nativeLang: string,
  targetLang: string
): Promise<StoryResult> => {
  const words = notes.map(n => n.term).join(", ");
  
  const prompt = `
    Create a short, fun, and cohesive story in ${targetLang} using these words: ${words}.
    The story should be simple (A2-B1 level).
    Also provide a title in ${targetLang}.
    Translate the whole story content into ${nativeLang} only for reference if needed (but primarily return the target text).
    Actually, return just the ${targetLang} text formatted nicely.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING, description: "The full story text" }
        }
      }
    }
  });

  return JSON.parse(response.text || '{"title": "Error", "content": "Could not generate story."}');
};
