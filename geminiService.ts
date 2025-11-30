// Replace the direct Gemini calls with these fetches

const API_URL = "http://localhost:8000/api";

export const getBankerAnalysis = async (metrics, industry, location, detailedInputs) => {
  const response = await fetch(`${API_URL}/audit-financials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics, industry, location, detailedInputs }),
  });
  return response.json();
};

export const analyzeLocation = async (location, industry) => {
  const response = await fetch(`${API_URL}/analyze-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: location, industry }),
  });
  return response.json();
};
