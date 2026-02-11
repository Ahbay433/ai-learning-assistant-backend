import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
  {
    // Who created / owns the quiz
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Related document (PDF, lesson, etc.)
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    // Quiz title
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Quiz questions
    questions: [
      {
        question: {
          type: String,
          required: true,
        },

        options: {
          type: [String],
          required: true,
          validate: {
            validator: (array) => array.length === 4,
            message: "Must have exactly 4 options",
          },
        },

        correctAnswer: {
          type: String,
          required: true,
        },

        explanation: {
          type: String,
          default: "",
        },

        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },
      },
    ],

    // User answers
    userAnswers: [
      {
        questionIndex: {
          type: Number,
          required: true,
        },

        selectedAnswer: {
          type: String,
          required: true,
        },

        isCorrect: {
          type: Boolean,
          required: true,
        },

        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Quiz score
    score: {
      type: Number,
      default: 0,
    },

    // Total questions count
    totalQuestions: {
      type: Number,
      required: true,
    },

    // Completion time
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
quizSchema.index({ userId: 1, documentId: 1 });

const Quiz = mongoose.model("Quiz", quizSchema);

export default Quiz;
