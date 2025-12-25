import { toast } from 'react-hot-toast';

const SEEDREAM_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"; 
// 火山引擎 Endpoint ID 通常需要用户提供，这里我们留空或等待用户输入
// 如果用户没有提供 Endpoint ID，代码中应处理这种情况


export async function generateSeedreamPoster(
  imageFile: File, 
  apiKey: string,
  model?: string
): Promise<string> {
  try {
    if (!model) {
        throw new Error("Seedream Endpoint ID is missing. Please configure VITE_SEEDREAM_ENDPOINT_ID.");
    }
    // 1. Convert file to Base64 and get dimensions
    const [base64Image, dimensions] = await Promise.all([
      fileToBase64(imageFile),
      getImageDimensions(imageFile)
    ]);

    // Calculate best resolution
    const size = getBestResolution(dimensions.width, dimensions.height);
    console.log(`Input dimensions: ${dimensions.width}x${dimensions.height}, Selected size: ${size}`);

    // 2. Prepare payload
    // Fix: Send full Data URI (data:image/...) as 'image_url' or 'image' if the API expects a URL-like format for Base64.
    // The error "invalid url specified" suggests it expects a valid URL (http or data URI).
    // We will try sending the full Data URI.
    
    const payload = {
      model: model,
      prompt: `
艺术风格：
- 模仿vintage comic book和老式动画的手绘质感
- 使用有限的配色方案：米黄色、红色、黑色为主
- 添加纸张老化效果：褶皱、斑点、泛黄
- 使用半调网点（halftone dots）模拟旧印刷效果

视觉特征：
- 粗黑色描边线条
- 卡通化的人物轮廓，简化细节
- 夸张的表情和动作
- 扁平化配色，避免过多渐变

纹理质感：
- 纸张纹理：vintage paper texture
- 印刷瑕疵：轻微的墨点和不均匀
- 边缘磨损效果
- 复古海报的颗粒感

整体氛围：
- 1930-1940年代的怀旧感
- 温暖、欢快的色调
- 手工印刷的质朴感
- 保持原照片的主体构图

重要：保持图像清晰度，适合打印在贺卡上
`,
      // Try 'image_url' parameter first as it's more standard for OpenAI-compatible img2img with URLs
      // If the API complained about 'image' parameter, we can fallback to that if this doesn't work.
      // But usually 'image' with raw base64 is for non-OpenAI formats.
      // 'image_url' with Data URI is common for OpenAI-compatible.
      // However, the error said "The parameter `image` ... is not valid". 
      // This implies we SENT 'image'. Let's try sending 'image_url' instead, or send 'image' with Data URI.
      // Let's try 'image_url' with object format first, as it's the most robust OpenAI Vision standard.
      // But for 'generations' endpoint, it might just be a string.
      
      // Use 'image' parameter for reference image (Volcengine/Doubao format)
      // Must be a valid Data URI (data:image/...)
      image: base64Image, 
      
      // Seedream 4.5/4.0 often requires higher resolution (min 3.6MP approx 1920x1920)
      size: size, 
      encoding_format: "base64",
      watermark: false,
      // image_strength not explicitly supported in standard generations endpoint without specific config
      // Removing to avoid validation errors, default behavior should respect the reference image if provided correctly.
      // image_strength: 0.6 
    };

    // 3. Call API
    const response = await fetch(SEEDREAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Seedream API Error:", errorData);
      throw new Error(errorData.error?.message || `API Request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // 4. Parse result
    // Usually response.data[0].url or .b64_json
    if (data.data && data.data.length > 0) {
      const imageObj = data.data[0];
      if (imageObj.b64_json) {
        return `data:image/png;base64,${imageObj.b64_json}`;
      } else if (imageObj.url) {
        return imageObj.url;
      }
    }

    throw new Error("No image data received from Seedream API");

  } catch (error: any) {
    console.error("Error generating Seedream poster:", error);
    throw error;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        // Remove "data:image/png;base64," prefix if needed by API?
        // Usually standard APIs accept the full string or just the base64 part.
        // Let's try sending just the base64 part first as that's safer for many "image" fields expecting raw bytes or specific format.
        const result = reader.result as string;
        // Some APIs want the full data URI, some want just base64. 
        // We'll return the data URI first, if it fails we might need to strip it.
        resolve(result); 
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(file: File): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function getBestResolution(width: number, height: number): string {
    const ratio = width / height;
    
    // Requirement: Total pixels >= 3,686,400 (approx 1920x1920)
    
    // Landscape
    if (ratio > 1.5) return "2560x1440"; // 16:9 (3,686,400 pixels)
    if (ratio > 1.2) return "2304x1728"; // 4:3 (3,981,312 pixels)
    
    // Portrait
    if (ratio < 0.6) return "1440x2560"; // 9:16 (3,686,400 pixels)
    if (ratio < 0.8) return "1728x2304"; // 3:4 (3,981,312 pixels)
    
    // Squareish
    return "2048x2048"; // 1:1 (4,194,304 pixels)
}
