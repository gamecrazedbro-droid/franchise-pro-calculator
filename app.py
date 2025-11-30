import os
import uvicorn
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import google.generativeai as genai
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()

# Configure Google Gemini API
# Get your key from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") 
if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY not found in environment variables.")

genai.configure(api_key=GOOGLE_API_KEY)

# Initialize FastAPI
app = FastAPI(
    title="FranchisePro Backend",
    description="AI-Powered Financial Audit & Location Intelligence API",
    version="1.0.0"
)

# Enable CORS (Allows your React Frontend to talk to this Python Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], # React/Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS (Matching React Interfaces) ---

class FinancialMetrics(BaseModel):
    totalInvestment: float
    annualRevenue: float
    annualExpenses: float
    netProfit: float
    monthlyNet: float
    roiYears: float
    breakEvenMonths: float
    margin: float
    contractTerm: int
    requiredDailyCustomers: float
    requiredDailyCustomersForMargin: float

class AnalysisRequest(BaseModel):
    metrics: FinancialMetrics
    industry: str
    location: str
    detailedInputs: dict

class LocationRequest(BaseModel):
    query: str
    industry: str

class BankerAuditResponse(BaseModel):
    verdict: str  # "Green Light", "Yellow Light", "Red Light"
    realityCheck: str
    stressTest: str
    insiderIntel: str
    recommendations: List[str]
    pitch: str
    closer: str

class LocationAnalysisResponse(BaseModel):
    text: str
    mapSources: List[dict]

# --- AI PERSONA & PROMPTS ---

BANKER_SYSTEM_PROMPT = """
You are a ruthless, cynical, high-stakes private equity banker who audits franchise deals. 
You do not sugarcoat. You look for weaknesses. You are sarcastic but mathematically precise.
Your goal is to protect the investor from bad deals or help them scale good ones.

Output JSON only. Structure:
{
    "verdict": "Green Light" | "Yellow Light" | "Red Light",
    "realityCheck": "A brutal, 2-sentence summary of the financial reality.",
    "stressTest": "What happens if revenue drops 20%? Specific scenario based on the industry.",
    "insiderIntel": "A 'secret' industry insight regarding this specific location or business type.",
    "recommendations": ["Actionable fix 1", "Actionable fix 2", "Actionable fix 3"],
    "pitch": "A 2-sentence 'Godfather' style pitch to investors.",
    "closer": "A final witty remark about wealth."
}
"""

# --- ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "online", "system": "FranchisePro AI Core"}

@app.post("/api/audit-financials", response_model=BankerAuditResponse)
async def audit_financials(request: AnalysisRequest):
    """
    Generates the 'PitStop Studios' Investment Audit using Gemini Pro.
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        
        prompt = f"""
        Analyze this franchise deal:
        
        Industry: {request.industry}
        Location: {request.location}
        
        Financials:
        - Total Investment: ${request.metrics.totalInvestment:,.2f}
        - Annual Revenue: ${request.metrics.annualRevenue:,.2f}
        - Net Profit: ${request.metrics.netProfit:,.2f} (Margin: {request.metrics.margin:.1f}%)
        - Break Even: {request.metrics.breakEvenMonths:.1f} months
        - ROI: {request.metrics.roiYears:.1f} years
        
        Detailed Inputs:
        {request.detailedInputs}
        
        Based on the location and numbers, provide the ruthless banker audit.
        """

        response = model.generate_content(
            contents=prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Parse logic is handled automatically by Pydantic if response matches model
        import json
        return json.loads(response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-location", response_model=LocationAnalysisResponse)
async def analyze_location(request: LocationRequest):
    """
    Provides location intelligence and competitor analysis.
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Act as a Commercial Real Estate Consultant.
        Target Location: {request.query}
        Industry: {request.industry}
        
        Provide a 3-sentence analysis of the demographics, foot traffic potential, and saturation for this industry in this city.
        Then provide 2 search queries for Google Maps to find competitors.
        
        Output JSON:
        {{
            "text": "The analysis text...",
            "mapSources": [
                {{"title": "Search Competitors", "uri": "https://www.google.com/maps/search/..."}},
                {{"title": "Check Traffic", "uri": "https://www.google.com/maps/search/..."}}
            ]
        }}
        """

        response = model.generate_content(
            contents=prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        import json
        return json.loads(response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/calculate-metrics")
def calculate_metrics_server_side(
    franchiseFee: float, buildOut: float, equipment: float, workingCapital: float,
    avgTicket: float, dailyCust: float, daysOpen: int,
    rentMonthly: float, salariesMonthly: float, miscMonthly: float,
    cogsPercent: float, laborPercent: float, royaltyPercent: float, marketingPercent: float
):
    """
    Optional: Server-side validation of the math performed in the React frontend.
    Useful for generating PDF reports or saving data to a database.
    """
    total_inv = franchiseFee + buildOut + equipment + workingCapital
    annual_rev = avgTicket * dailyCust * daysOpen
    
    # Costs
    variable_costs = annual_rev * ((cogsPercent + laborPercent + royaltyPercent + marketingPercent) / 100)
    fixed_costs = (rentMonthly + salariesMonthly + miscMonthly) * 12
    
    net_profit = annual_rev - variable_costs - fixed_costs
    
    return {
        "totalInvestment": total_inv,
        "annualRevenue": annual_rev,
        "netProfit": net_profit,
        "margin": (net_profit / annual_rev * 100) if annual_rev > 0 else 0,
        "isViable": net_profit > 0
    }

# --- SERVER STARTUP ---
if __name__ == "__main__":
    print("Ignition sequence start...")
    print("Loading financial models...")
    print("Connecting to Neural Net...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
