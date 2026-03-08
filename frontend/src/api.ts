import axios from "axios";

export type ApplicationRecord = {
  id: number;
  status: string;
  position_title: string;
  statement: string;
  resume_key?: string | null;
  transcript_key?: string | null;
  created_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
  },
});
