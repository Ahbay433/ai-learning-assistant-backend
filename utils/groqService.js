import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

/* -----------------------------------------------------
   INITIALIZE GROQ
----------------------------------------------------- */
if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY is missing");
  throw new Error("GROQ_API_KEY not found in environment variables");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// You can change to "llama3-8b-8192" for faster responses
const MODEL = "llama3-70b-8192";

/* -----------------------------------------------------
   HELPER: SAFE GROQ CALL
----------------------------------------------------- */
const callGroq = async (prompt) => {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  if (
    !completion ||
    !completion.choices ||
    !completion.choices[0]?.message?.content
  ) {
    throw new Error("Empty response from Groq");
  }

  return completion.choices[0].message.content;
};

/* -----------------------------------------------------
   GENERATE FLASHCARDS
----------------------------------------------------- */
export const generateFlashcards = async (text, count = 10) => {
  try {
    if (!text || !text.trim()) {
      throw new Error("Empty document text");
    }

    const prompt = `
Generate exactly ${count} educational flashcards.

Format:
Q: Question
A: Answer
D: easy | medium | hard

Separate each card with "---"

TEXT:
${text.slice(0, 12000)}
`;

    const output = await callGroq(prompt);
    const cards = [];

    for (const block of output.split("---")) {
      let question = "";
      let answer = "";
      let difficulty = "medium";

      for (const line of block.split("\n")) {
        const l = line.trim();

        if (l.startsWith("Q:")) question = l.slice(2).trim();
        else if (l.startsWith("A:")) answer = l.slice(2).trim();
        else if (l.startsWith("D:")) {
          const d = l.slice(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(d)) difficulty = d;
        }
      }

      if (question && answer) {
        cards.push({ question, answer, difficulty });
      }
    }

    return cards.slice(0, count);
  } catch (err) {
    console.error("❌ Groq flashcards error:", err.message);
    throw err;
  }
};

/* -----------------------------------------------------
   GENERATE QUIZ
----------------------------------------------------- */
export const generateQuiz = async (text, count = 5) => {
  try {
    if (!text || !text.trim()) {
      throw new Error("Empty document text");
    }

    const prompt = `
Generate exactly ${count} multiple-choice questions.

Format:
Q: Question
1: Option
2: Option
3: Option
4: Option
C: Correct option (exact text)
E: Explanation
D: easy | medium | hard

Separate each question with "---"

TEXT:
${text.slice(0, 12000)}
`;

    const output = await callGroq(prompt);
    const questions = [];

    for (const block of output.split("---")) {
      let question = "";
      let options = [];
      let correctAnswer = "";
      let explanation = "";
      let difficulty = "medium";

      for (const line of block.split("\n")) {
        const l = line.trim();

        if (l.startsWith("Q:")) question = l.slice(2).trim();
        else if (/^[1-4]:/.test(l) && options.length < 4) {
          options.push(l.slice(2).trim());
        } else if (l.startsWith("C:")) {
          correctAnswer = l.slice(2).trim();
        } else if (l.startsWith("E:")) {
          explanation = l.slice(2).trim();
        } else if (l.startsWith("D:")) {
          const d = l.slice(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(d)) difficulty = d;
        }
      }

      if (question && options.length === 4 && correctAnswer) {
        questions.push({
          question,
          options,
          correctAnswer,
          explanation,
          difficulty,
        });
      }
    }

    return questions.slice(0, count);
  } catch (err) {
    console.error("❌ Groq quiz error:", err.message);
    throw err;
  }
};

/* -----------------------------------------------------
   GENERATE SUMMARY
----------------------------------------------------- */
export const generateSummary = async (text) => {
  try {
    if (!text || !text.trim()) {
      throw new Error("Empty document text");
    }

    const prompt = `
Summarize the following text clearly and concisely.

TEXT:
${text.slice(0, 12000)}
`;

    return await callGroq(prompt);
  } catch (err) {
    console.error("❌ Groq summary error:", err.message);
    throw err;
  }
};

/* -----------------------------------------------------
   CHAT WITH DOCUMENT
----------------------------------------------------- */
export const chatWithDocument = async (chunks, question) => {
  try {
    if (!chunks?.length || !question) {
      throw new Error("Missing chunks or question");
    }

    const context = chunks.map((c) => c.content).join("\n\n");

    const prompt = `
Answer ONLY using the context below.
If the answer is not present, reply: "Not found in document".

CONTEXT:
${context.slice(0, 12000)}

QUESTION:
${question}
`;

    return await callGroq(prompt);
  } catch (err) {
    console.error("❌ Groq chat error:", err.message);
    throw err;
  }
};

/* -----------------------------------------------------
   EXPLAIN CONCEPT
----------------------------------------------------- */
export const explainConcept = async (concept, context) => {
  try {
    if (!concept || !context) {
      throw new Error("Missing concept or context");
    }

    const prompt = `
Explain the concept "${concept}" using the context below.

CONTEXT:
${context.slice(0, 10000)}
`;

    return await callGroq(prompt);
  } catch (err) {
    console.error("❌ Groq explain error:", err.message);
    throw err;
  }
};
