
import { GoogleGenAI } from "@google/genai";
import { TRADING_QUESTIONS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });

export async function getQuizFeedback(
  answers: Record<number, number>, 
  files: Record<number, string | null>,
  reasoning: Record<number, string>
) {
  const parts: any[] = [];

  const resultSummary = TRADING_QUESTIONS.map((q, idx) => {
    const userAnswer = answers[idx];
    const userReason = reasoning[idx] ? `\nØ³Ø¨Ø¨ Ø§ÙÙØ³ØªØ®Ø¯Ù: ${reasoning[idx]}` : '';
    const isCorrect = userAnswer === q.correctAnswer;
    return `Ø§ÙØ³Ø¤Ø§Ù: ${q.text}\nØ¥Ø¬Ø§Ø¨Ø© Ø§ÙÙØ³ØªØ®Ø¯Ù: ${q.options[userAnswer] || 'ÙÙ ÙØ¬Ø¨'}\nØ§ÙÙØªÙØ¬Ø©: ${isCorrect ? 'ØµØ­ÙØ­Ø©' : 'Ø®Ø§Ø·Ø¦Ø©'}${userReason}`;
  }).join('\n\n');

  const promptText = `
    Ø£ÙØª ÙØ¨ÙØ± Ø§Ø³ØªØ±Ø§ØªÙØ¬ÙÙ Ø§ÙØªØ¯Ø§ÙÙ ÙÙ ØµÙØ¯ÙÙ Ø§Ø³ØªØ«ÙØ§Ø±Ù. ÙÙ Ø¨ØªÙÙÙÙ Ø§ÙÙØªØ¯Ø§ÙÙ Ø¨ÙØ§Ø¡Ù Ø¹ÙÙ Ø§ÙÙØªØ§Ø¦Ø¬ Ø§ÙØªØ§ÙÙØ©:
    ${resultSummary}
    
    ÙØ¬Ø¨ Ø£Ù ÙÙÙÙ ØªÙØ±ÙØ±Ù ÙÙØ¬Ø²Ø§Ù Ø¬Ø¯Ø§ÙØ Ø§Ø­ØªØ±Ø§ÙÙØ§ÙØ ÙØ¨Ø§ÙÙØºØ© Ø§ÙØ¹Ø±Ø¨ÙØ© Ø§ÙÙØµØ­Ù Ø§ÙÙØ¹Ø§ØµØ±Ø©. Ø§Ø³ØªØ®Ø¯Ù Ø§ÙØªÙØ³ÙÙ Ø§ÙØªØ§ÙÙ Ø¨Ø¯ÙØ©:
    
    [LEVEL]: (ÙØ¨ØªØ¯Ø¦ | ÙØªÙØ³Ø· | ÙØ­ØªØ±Ù)
    [STRENGTHS]: (3 ÙÙØ§Ø· ÙÙØ© ÙØ®ØªØµØ±Ø© Ø¬Ø¯Ø§Ù Ø¹Ù Ø±Ø¤ÙØªÙ Ø§ÙÙÙÙØ©)
    [WEAKNESSES]: (3 ÙÙØ§Ø· Ø¶Ø¹Ù ÙØ¬Ø¨ ÙØ¹Ø§ÙØ¬ØªÙØ§ ÙÙØ±Ø§Ù)
    [ROADMAP]: (Ø®Ø·Ø© Ø¹ÙÙ ÙÙ Ø®Ø·ÙØªÙÙ ÙÙØªØ·ÙÙØ±)
    [PSYCHOLOGY]: (ÙØµÙØ­Ø© Ø³ÙÙÙÙÙØ¬ÙØ© ÙØ§Ø­Ø¯Ø© ÙÙÙØ©)

    ÙÙØ§Ø­Ø¸Ø©: Ø¥Ø°Ø§ Ø°ÙØ± Ø£Ø³Ø¨Ø§Ø¨Ø§Ù ÙÙÙØ© (Reasoning)Ø ÙÙÙ Ø¨ØªØ­ÙÙÙ Ø¬ÙØ¯Ø© ÙÙØ·ÙÙ ÙÙÙØ³ ÙÙØ· ØµØ­Ø© Ø§ÙØ¥Ø¬Ø§Ø¨Ø©. Ø±ÙØ² Ø¹ÙÙ ÙÙØ§ÙÙÙ SMC Ù Liquidity.
  `;

  parts.push({ text: promptText });

  Object.values(files).forEach(fileBase64 => {
    if (fileBase64) {
      const match = fileBase64.match(/^data:(.*);base64,(.*)$/);
      if (match) {
        const mimeType = match[1];
        const data = match[2];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        });
      }
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        temperature: 0.4,
        topP: 0.8,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error fetching AI feedback:", error);
    return "[LEVEL]: ØºÙØ± ÙØ­Ø¯Ø¯\n[STRENGTHS]: ØªØ¹Ø°Ø± Ø§ÙØªØ­ÙÙÙ\n[WEAKNESSES]: ØªØ¹Ø°Ø± Ø§ÙØªØ­ÙÙÙ\n[ROADMAP]: Ø§Ø³ØªÙØ± ÙÙ Ø§ÙØªØ¯Ø±ÙØ¨\n[PSYCHOLOGY]: Ø­Ø§ÙØ¸ Ø¹ÙÙ Ø§ÙØ¶Ø¨Ø§Ø·Ù";
  }
}
