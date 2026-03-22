import type {
  StartInterviewResponse,
  NextQuestionResponse,
  SubmitQuestionAnswerResponse,
  CompleteInterviewResponse,
  SubmitAnswerResponse,
} from "@/types/interview";

// Default to 127.0.0.1 backend to match Uvicorn default, can be overridden with env var
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    message?: string
  ) {
    super(message || detail);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        detail = errorData.detail || detail;
      } catch {
        // If we can't parse error JSON, use status text
        detail = response.statusText || detail;
      }
      throw new ApiError(response.status, detail);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other errors
    throw new ApiError(0, error instanceof Error ? error.message : "Network error");
  }
}

async function fetchApiForm<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        detail = errorData.detail || detail;
      } catch {
        detail = response.statusText || detail;
      }
      throw new ApiError(response.status, detail);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error instanceof Error ? error.message : "Network error");
  }
}

// API Functions

export async function startInterview(params: {
  role: string;
  custom_role?: string | null;
  interview_type: string;
  difficulty: string;
  specific_topic?: string;
  num_questions?: number;
  time_per_question?: number;
}): Promise<StartInterviewResponse> {
  return fetchApi<StartInterviewResponse>("/start-interview", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchNextQuestion(
  interview_id: string
): Promise<NextQuestionResponse> {
  return fetchApi<NextQuestionResponse>("/next-question", {
    method: "POST",
    body: JSON.stringify({ interview_id }),
  });
}

export async function submitQuestionAnswer(params: {
  interview_id: string;
  question_index: number;
  audio_file: Blob;
  audio_filename: string;
  video_file?: Blob;
  video_filename?: string;
}): Promise<SubmitQuestionAnswerResponse> {
  const formData = new FormData();
  formData.append("interview_id", params.interview_id);
  formData.append("question_index", params.question_index.toString());
  formData.append("audio_file", params.audio_file, params.audio_filename);
  
  if (params.video_file && params.video_filename) {
    formData.append("video_file", params.video_file, params.video_filename);
  }

  return fetchApiForm<SubmitQuestionAnswerResponse>("/submit-question-answer", formData);
}

export async function completeInterview(
  interview_id: string
): Promise<CompleteInterviewResponse> {
  return fetchApi<CompleteInterviewResponse>("/complete-interview", {
    method: "POST",
    body: JSON.stringify({ interview_id }),
  });
}

// Legacy single-question submission
export async function submitAnswer(params: {
  interview_type: string;
  difficulty: string;
  specific_topic?: string;
  audio_file: Blob;
  audio_filename: string;
  video_file?: Blob;
  video_filename?: string;
}): Promise<SubmitAnswerResponse> {
  const formData = new FormData();
  formData.append("interview_type", params.interview_type);
  formData.append("difficulty", params.difficulty);
  if (params.specific_topic) {
    formData.append("specific_topic", params.specific_topic);
  }
  formData.append("audio_file", params.audio_file, params.audio_filename);
  
  if (params.video_file && params.video_filename) {
    formData.append("video_file", params.video_file, params.video_filename);
  }

  return fetchApiForm<SubmitAnswerResponse>("/submit-answer", formData);
}