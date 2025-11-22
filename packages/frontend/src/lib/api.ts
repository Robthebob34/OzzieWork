import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
  withCredentials: true,
});

export async function fetchJobs() {
  const { data } = await api.get('/jobs/?limit=12');
  return data;
}

export async function fetchJob(id: string | number) {
  const { data } = await api.get(`/jobs/${id}/`);
  return data;
}

export default api;
