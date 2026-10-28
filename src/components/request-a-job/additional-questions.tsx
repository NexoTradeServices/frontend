// The trade's own questions -- Feature 3001, shared with Feature 3005's Phone intake page.
//
// Each is an optional text answer under an "Additional questions" sub-heading; unanswered ones are
// left out of the job.
import { Field } from "@/components/auth/field";

export function AdditionalQuestions({
  questions,
  answers,
  onChange,
  hint = "Help us to attend the job better prepared.",
}: {
  questions: string[];
  answers: Record<string, string>;
  onChange: (question: string, answer: string) => void;
  hint?: string;
}) {
  if (questions.length === 0) return null;
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <h2 className="font-heading text-sm font-extrabold text-ink">Additional questions</h2>
      <p className="mb-4 text-xs text-muted-text">{hint}</p>
      {questions.map((question, index) => (
        <Field
          key={question}
          id={`prefilled-${String(index)}`}
          label={question}
          value={answers[question] ?? ""}
          onChange={(e) => onChange(question, e.target.value)}
        />
      ))}
    </div>
  );
}
