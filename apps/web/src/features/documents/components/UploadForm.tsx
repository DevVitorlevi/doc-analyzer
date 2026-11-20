import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getDefaultTitle, validateUploadForm } from "../upload-form";

import FilePreviewBlock from "./FilePreviewBlock";

const TITLE_LABEL = "Título";
const TITLE_PLACEHOLDER = "Document.doc";
const INSTRUCTION_LABEL = "Instrução para IA";
const INSTRUCTION_PLACEHOLDER = "Como a IA deve analisar este documento";
const SUBMIT_LABEL = "Salvar";

const LABEL_CLASS = "text-md px-3 font-medium text-text-primary";
const ERROR_CLASS = [
  "text-[length:var(--font-size-secondary-description)]",
  "leading-[var(--line-height-secondary-description)]",
  "text-(color:--color-danger-action)",
].join(" ");
const TEXTAREA_CLASS = [
  "flex h-18 w-full resize-none rounded-(--radius-input)",
  "bg-control-secondary px-4 py-2",
  "text-md text-text-primary placeholder:text-[#80838D]",
  "focus-visible:outline-2 focus-visible:outline-offset-2",
  "focus-visible:outline-(--color-primary-action)",
  "aria-invalid:border-(--color-danger-action)",
].join(" ");

interface UploadFormProps {
  file: File;
}

export default function UploadForm({ file }: UploadFormProps) {
  const titleId = useId();
  const titleErrorId = useId();
  const instructionId = useId();
  const instructionErrorId = useId();

  const titleRef = useRef<HTMLInputElement>(null);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(() => getDefaultTitle(file.name));
  const [instruction, setInstruction] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const errors = submitted ? validateUploadForm({ title, instruction }) : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const result = validateUploadForm({ title, instruction });

    if (result.title !== undefined) {
      titleRef.current?.focus();
      return;
    }

    if (result.instruction !== undefined) {
      instructionRef.current?.focus();
      return;
    }

    // TODO(FE-16): enviar POST /documents com título, instrução e arquivo.
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-(--space-16)"
    >
      <FilePreviewBlock file={file} />

      <div className="flex flex-col gap-(--space-8)">
        <div className="flex flex-col gap-1">
          <label htmlFor={titleId} className={LABEL_CLASS}>
            {TITLE_LABEL}
          </label>
          <Input
            ref={titleRef}
            id={titleId}
            value={title}
            placeholder={TITLE_PLACEHOLDER}
            aria-invalid={errors.title !== undefined}
            aria-describedby={
              errors.title !== undefined ? titleErrorId : undefined
            }
            onChange={(event) => setTitle(event.target.value)}
            className="border-none text-md min-h-10"
          />
          {errors.title !== undefined && (
            <p id={titleErrorId} className={ERROR_CLASS}>
              {errors.title}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={instructionId} className={LABEL_CLASS}>
            {INSTRUCTION_LABEL}
          </label>
          <textarea
            ref={instructionRef}
            id={instructionId}
            rows={3}
            value={instruction}
            placeholder={INSTRUCTION_PLACEHOLDER}
            aria-invalid={errors.instruction !== undefined}
            aria-describedby={
              errors.instruction !== undefined ? instructionErrorId : undefined
            }
            className={TEXTAREA_CLASS}
            onChange={(event) => setInstruction(event.target.value)}
          />
          {errors.instruction !== undefined && (
            <p id={instructionErrorId} className={ERROR_CLASS}>
              {errors.instruction}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="text-xl font-light">
          {SUBMIT_LABEL}
        </Button>
      </div>
    </form>
  );
}
