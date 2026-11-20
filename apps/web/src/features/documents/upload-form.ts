export const TITLE_MAX_LENGTH = 120;
export const INSTRUCTION_MAX_LENGTH = 2000;

export const UPLOAD_FORM_MESSAGES = {
  titleRequired: "Informe um título.",
  titleTooLong: `Máximo de ${TITLE_MAX_LENGTH} caracteres.`,
  instructionRequired: "Informe uma instrução.",
  instructionTooLong: `Máximo de ${INSTRUCTION_MAX_LENGTH} caracteres.`,
} as const;

export interface UploadFormValues {
  title: string;
  instruction: string;
}

export interface UploadFormErrors {
  title?: string;
  instruction?: string;
}

export function getDefaultTitle(fileName: string): string {
  return fileName.slice(0, TITLE_MAX_LENGTH);
}

export function validateUploadForm(values: UploadFormValues): UploadFormErrors {
  const errors: UploadFormErrors = {};

  if (values.title.trim() === "") {
    errors.title = UPLOAD_FORM_MESSAGES.titleRequired;
  } else if (values.title.length > TITLE_MAX_LENGTH) {
    errors.title = UPLOAD_FORM_MESSAGES.titleTooLong;
  }

  if (values.instruction.trim() === "") {
    errors.instruction = UPLOAD_FORM_MESSAGES.instructionRequired;
  } else if (values.instruction.length > INSTRUCTION_MAX_LENGTH) {
    errors.instruction = UPLOAD_FORM_MESSAGES.instructionTooLong;
  }

  return errors;
}
