export interface GeneratedAnswer {
  text: string;
  is_correct: boolean;
}

export interface GeneratedQuestion {
  text: string;
  answers: GeneratedAnswer[];
  explanation?: string;
}

// Module-level cache so the model isn't reloaded between calls
let cachedGenerator: any = null;

export async function generateQuizFromText(
  pagesText: string,
  numQuestions: number,
  onModelLoad: (progress: number) => void
): Promise<GeneratedQuestion[]> {
  const { pipeline, env } = await import("@huggingface/transformers");

  // Browser cache is on by default in v3; local model files are not needed
  (env as any).allowLocalModels = false;

  if (!cachedGenerator) {
    cachedGenerator = await pipeline(
      "text-generation",
      "HuggingFaceTB/SmolLM2-1.7B-Instruct",
      {
        dtype: "q4",
        progress_callback: (info: any) => {
          if (typeof info.progress === "number") {
            onModelLoad(Math.round(info.progress));
          }
        },
      }
    );
  } else {
    onModelLoad(100);
  }

  const systemPrompt =
    `You are a quiz generator. Given study text, produce exactly ${numQuestions} multiple-choice questions as a JSON array. ` +
    `Each item must have this exact shape: { "text": string, "answers": [{"text": string, "is_correct": bool}], "explanation": string }. ` +
    `Rules: exactly one answer per question must have is_correct: true; each question must have exactly 4 answer options. ` +
    `Return ONLY a valid JSON array — no markdown fences, no other text.`;

  const userPrompt = `Generate ${numQuestions} MCQ questions from this study text:\n\n${pagesText}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const output = await cachedGenerator(messages, {
    max_new_tokens: 3000,
    do_sample: false,
  });

  return parseOutput(output);
}

function parseOutput(output: any): GeneratedQuestion[] {
  let rawText = "";
  try {
    const first = Array.isArray(output) ? output[0] : output;
    const genText = first?.generated_text;
    if (Array.isArray(genText)) {
      // Chat format: last element is the assistant message
      const last = genText[genText.length - 1];
      rawText = last?.content ?? last?.text ?? String(genText);
    } else {
      rawText = String(genText ?? first?.text ?? "");
    }
  } catch {
    rawText = String(output);
  }

  // Strip markdown fences
  rawText = rawText.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();

  const start = rawText.indexOf("[");
  const end = rawText.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      "The AI model did not return a valid JSON array. The OCR text may be too short — try a different PDF or increase page count."
    );
  }

  const parsed: GeneratedQuestion[] = JSON.parse(rawText.slice(start, end + 1));

  return parsed
    .filter(
      (q) =>
        typeof q.text === "string" &&
        q.text.trim() &&
        Array.isArray(q.answers) &&
        q.answers.length >= 2
    )
    .map((q) => {
      const answers = q.answers.slice(0, 4).map((a) => ({
        text: String(a.text ?? "").trim(),
        is_correct: Boolean(a.is_correct),
      }));

      // Enforce exactly one correct answer
      const correctCount = answers.filter((a) => a.is_correct).length;
      if (correctCount === 0) {
        answers[0].is_correct = true;
      } else if (correctCount > 1) {
        let kept = false;
        answers.forEach((a) => {
          if (a.is_correct) { a.is_correct = !kept; kept = true; }
        });
      }

      return {
        text: q.text.trim(),
        answers,
        explanation: q.explanation ? String(q.explanation).trim() : undefined,
      };
    });
}
