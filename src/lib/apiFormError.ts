import axios from "axios";
import type { ApiErrorResponse } from "@/api/contracts";
import { reportFieldError } from "./formValidation";

/** Erros remotos usam a mesma associação e foco da validação local dos formulários. */
export function apiFormError(error: unknown, form: HTMLFormElement) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    // entry seleciona o primeiro par campo/mensagem retornado pela API para informar o erro e focar o controle.
    const entry = Object.entries(error.response?.data.error.fields ?? {})[0];
    if (entry) reportFieldError(form, entry[0], entry[1]);
  }
}
