export const EXAM_SECONDS_PER_QUESTION = 60;
export const EXAM_LOW_TIME_WARNING_SECONDS = 60;

export function getExamDurationSeconds(questionCount: number) {
  return Math.max(questionCount, 1) * EXAM_SECONDS_PER_QUESTION;
}

export function formatExamDuration(totalSeconds: number) {
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
