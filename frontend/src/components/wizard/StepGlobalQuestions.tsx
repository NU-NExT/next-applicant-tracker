import type { RepositoryQuestion } from "../../api";

type StepGlobalQuestionsProps = {
  questions: RepositoryQuestion[];
  answers: Record<number, string>;
  dropdownFallbacks: Record<number, string>;
  onAnswerChange: (index: number, value: string) => void;
  onFallbackChange: (index: number, value: string) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepGlobalQuestions({
  questions,
  answers,
  dropdownFallbacks,
  onAnswerChange,
  onFallbackChange,
  onNext,
  onBack,
}: StepGlobalQuestionsProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-[#1f1f1f]">Step 3: General Questions</h2>
      <p className="text-sm text-[#4d4d4d]">Answer the following general questions.</p>

      {questions.length === 0 && (
        <p className="text-sm text-[#666]">No general questions for this application.</p>
      )}

      {questions.map((question, index) => (
        <label key={`${question.prompt}-${index}`} className="block">
          <span className="mb-2 block text-lg font-medium text-[#2d2d2d]">{question.prompt}</span>
          {question.question_type === "dropdown" ? (
            <>
              <select
                value={answers[index] ?? ""}
                onChange={(e) => onAnswerChange(index, e.target.value)}
                className="w-full rounded border border-[#c3c3c3] px-3 py-2"
              >
                <option value="">Select an option</option>
                {Array.isArray(question.question_config_json?.options)
                  ? (question.question_config_json.options as string[]).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))
                  : null}
                <option value="__other__">Other (type manually)</option>
              </select>
              {(answers[index] ?? "") === "__other__" && (
                <input
                  className="mt-2 w-full rounded border border-[#c3c3c3] px-3 py-2"
                  placeholder="Enter custom value"
                  value={dropdownFallbacks[index] ?? ""}
                  onChange={(e) => onFallbackChange(index, e.target.value)}
                />
              )}
            </>
          ) : (
            <textarea
              value={answers[index] ?? ""}
              onChange={(e) => onAnswerChange(index, e.target.value)}
              maxLength={question.character_limit ?? undefined}
              className="h-24 w-full rounded border border-[#c3c3c3] px-3 py-2"
              placeholder="Your response"
            />
          )}
        </label>
      ))}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-md border border-[#c7c7c7] px-5 py-2 text-[#333]">
          Back
        </button>
        <button type="button" onClick={onNext} className="rounded-md bg-[#1f6f5f] px-5 py-2 text-white">
          Next
        </button>
      </div>
    </div>
  );
}
