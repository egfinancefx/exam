
import { GoogleGenAI } from "@google/genai";
import { TRADING_QUESTIONS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getQuizFeedback(
  answers: Record<number, number>, 
  files: Record<number, string | null>,
  reasoning: Record<number, string>
) {
  const parts: any[] = [];

  const resultSummary = TRADING_QUESTIONS.map((q, idx) => {
    const userAnswer = answers[idx];
    const userReason = reasoning[idx] ? `\nسبب المستخدم: ${reasoning[idx]}` : '';
    const isCorrect = userAnswer === q.correctAnswer;
    return `السؤال: ${q.text}\nإجابة المستخدم: ${q.options[userAnswer] || 'لم يجب'}\nالنتيجة: ${isCorrect ? 'صحيحة' : 'خاطئة'}${userReason}`;
  }).join('\n\n');

  const promptText = `
    أنت كبير استراتيجيي التداول في صندوق استثماري. قم بتقييم المتداول بناءً على النتائج التالية:
    ${resultSummary}
    
    يجب أن يكون تقريرك موجزاً جداً، احترافياً، وباللغة العربية الفصحى المعاصرة. استخدم التنسيق التالي بدقة:
    
    [LEVEL]: (مبتدئ | متوسط | محترف)
    [STRENGTHS]: (3 نقاط قوة مختصرة جداً عن رؤيته الفنية)
    [WEAKNESSES]: (3 نقاط ضعف يجب معالجتها فوراً)
    [ROADMAP]: (خطة عمل من خطوتين للتطوير)
    [PSYCHOLOGY]: (نصيحة سيكولوجية واحدة قوية)

    ملاحظة: إذا ذكر أسباباً فنية (Reasoning)، فقم بتحليل جودة منطقه وليس فقط صحة الإجابة. ركز على مفاهيم SMC و Liquidity.
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
    return "[LEVEL]: غير محدد\n[STRENGTHS]: تعذر التحليل\n[WEAKNESSES]: تعذر التحليل\n[ROADMAP]: استمر في التدريب\n[PSYCHOLOGY]: حافظ على انضباطك";
  }
}
