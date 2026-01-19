
export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  image?: string;
  requiresReasoning?: boolean;
}

export interface QuizState {
  step: 'START' | 'QUIZ' | 'COMPLETED' | 'BLOCKED';
  userName: string;
  currentQuestionIndex: number;
  answers: Record<number, number>;
  files: Record<number, string | null>;
  reasoning: Record<number, string>;
  aiFeedback: string | null;
}

export interface FeedbackSummary {
  score: number;
  total: number;
  percentage: number;
  userName: string;
}
