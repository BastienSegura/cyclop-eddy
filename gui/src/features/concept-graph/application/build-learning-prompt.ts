export function buildLearningPrompt(conceptLabel: string): string {
  return [
    `I am studying the concept \"${conceptLabel}\".`,
    "Explain it at three depth levels: beginner, intermediate, advanced.",
    "Then provide:",
    "1) a real-world analogy,",
    "2) a short quiz with 3 questions,",
    "3) 5 connected concepts I should learn next.",
    "Keep it concise and structured.",
  ].join("\n");
}
