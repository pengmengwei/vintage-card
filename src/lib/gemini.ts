import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash-image"; // Updated to the correct model name

const PROMPT = `
You are an expert AI artist specializing in 1930s vintage oil-painted poster styles.
Transform the provided input image into a stunning 1930s vintage travel poster.

Style Guidelines:
- **Technique**: Digital oil painting with visible brushstrokes and canvas texture.
- **Era**: 1930s Art Deco and vintage travel poster aesthetic.
- **Colors**: Use a limited, harmonious palette with warm earth tones (ochre, sepia, terracotta), deep reds, muted blues/teals, and cream/off-white backgrounds. Avoid neon or overly digital-looking colors.
- **Lighting**: High contrast with dramatic shadows and warm highlights.
- **Details**: Simplify complex details into bold shapes and planes of color. Remove visual noise.
- **Composition**: Dynamic but balanced.
- **Output**: The result should look like a scanned high-quality vintage poster found in an archive.

Do not add any new text unless it is artistically necessary or replaces existing text in a vintage style.
`;

export async function generateRetroPoster(imageFile: File, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  try {
    const imagePart = await fileToGenerativePart(imageFile);
    
    // For image generation/editing, we expect the model to return an image.
    // The response format for generated images usually contains inlineData.
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            imagePart
          ]
        }
      ],
      // We might need to specify generationConfig for image output if supported by SDK typing,
      // but standard API calls often just return the image in the parts.
    });

    const response = await result.response;
    
    // Check for image in the response
    // The structure typically is candidates[0].content.parts[0].inlineData
    // We need to inspect the parts to find the image.
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts) {
      throw new Error("No content generated.");
    }

    // Look for image part
    const imageOutput = parts.find(part => part.inlineData);
    
    if (imageOutput && imageOutput.inlineData) {
      return `data:${imageOutput.inlineData.mimeType};base64,${imageOutput.inlineData.data}`;
    }

    // Fallback: If the model returns text (e.g. "I cannot generate..."), throw error or return it.
    // Sometimes it might return a text description instead of an image if it refuses.
    const textOutput = parts.find(part => part.text);
    if (textOutput) {
      console.warn("Model returned text instead of image:", textOutput.text);
      throw new Error(`Model returned text: ${textOutput.text}`);
    }

    throw new Error("No image generated.");

  } catch (error) {
    console.error("Error generating poster:", error);
    throw error;
  }
}

async function fileToGenerativePart(file: File) {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

