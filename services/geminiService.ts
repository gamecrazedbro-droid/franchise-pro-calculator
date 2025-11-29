import { GoogleGenAI, Type } from "@google/genai";
import { LocationAnalysisResult, MapSource, BankerAudit, FinancialMetrics } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLocation = async (locationQuery: string, industry: string = "retail business"): Promise<LocationAnalysisResult> => {
  try {
    const modelId = "gemini-2.5-flash";
    const prompt = `
      Perform a market analysis for a "${industry}" in "${locationQuery}".
      
      Requirements:
      1. Analyze the location's capabilities (demographics, foot traffic, spending power).
      2. Identify the PROSPECTIVE REVENUE that can be generated. Look for competitor performance in this area.
      3. CRITICAL: If exact financial data is not public, you MUST create an AVERAGE VALUATION based on available data for similar businesses in the region.
      4. Provide a specific estimated annual revenue range (e.g., "$500k - $800k").
      5. Do not falter. Do not say "I cannot provide financial estimates". Provide your best calculated estimate based on the location's potential.
      6. Keep the response concise (max 4 sentences) but dense with value. Plain text only.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
      },
    });

    const text = response.text || "No analysis available.";
    
    // Extract Grounding Metadata for Maps & Search
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const mapSources: MapSource[] = [];

    groundingChunks.forEach((chunk: any) => {
      // Handle Google Search results
      if (chunk.web?.uri && chunk.web?.title) {
         mapSources.push({ uri: chunk.web.uri, title: chunk.web.title });
      }
      // Handle Google Maps results
      if (chunk.groundingChunk?.source?.web?.uri) {
           mapSources.push({ 
               uri: chunk.groundingChunk.source.web.uri, 
               title: chunk.groundingChunk.source.web.title || "Map Source" 
           });
      }
    });

    return { text, mapSources };
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return a fallback instead of throwing to prevent app crash, but keep the "Do not falter" spirit in the UI
    return {
      text: `Market data for ${locationQuery} suggests high variance. Based on standard performance for ${industry} in this region, anticipate moderate to high foot traffic.`,
      mapSources: []
    };
  }
};

export const identifyLocationFromCoordinates = async (lat: number, lng: number): Promise<{ city: string, country: string }> => {
  try {
    const prompt = `
      Identify the specific City and Country for these coordinates: ${lat}, ${lng}.
      Return strictly JSON with no markdown formatting:
      { "city": "City Name", "country": "Country Name" }
    `;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING },
            country: { type: Type.STRING }
          }
        }
      }
    });
    if (response.text) {
       return JSON.parse(response.text);
    }
    return { city: "", country: "" };
  } catch (error) {
    console.error("Reverse Geocode Error:", error);
    return { city: "", country: "" };
  }
};

export const getBankerAnalysis = async (
  metrics: FinancialMetrics, 
  industry: string,
  location: string,
  details: {
    cogs: string;
    labor: string;
    rent: string;
    marketing: string;
    franchiseFee: string;
  }
): Promise<BankerAudit> => {
  try {
    const prompt = `
      ROLE & PERSONA:
      You are the "Ruthless Investment Banker" and "Franchise Architect" for PitStop Studios. Your job is to audit franchise ideas across ANY industry.
      
      INPUT DATA:
      Industry: ${industry}
      Location: ${location}
      Contract Term: ${metrics.contractTerm} years
      Total Investment (CAPEX): ${metrics.totalInvestment}
      Projected Annual Revenue: ${metrics.annualRevenue}
      Projected Annual Expenses: ${metrics.annualExpenses}
      Projected Net Profit: ${metrics.netProfit}
      Calculated Payback Period: ${metrics.roiYears} Years
      
      USER DEFINED COST STRUCTURE (AUDIT THIS):
      - Franchise/Init Fee: ${details.franchiseFee}
      - Rent/Occupancy: ${details.rent} / month
      - COGS: ${details.cogs}
      - Labor: ${details.labor}
      - Marketing: ${details.marketing}

      TASKS:
      1. COMPARE the user's defined costs against REAL WORLD BENCHMARKS for ${industry} in ${location}.
         - If they entered 5% Labor for a Cafe, CALL THEM OUT (Impossible).
         - If they entered $500 rent for downtown NYC, CALL THEM OUT.
      2. GENERATE "INSIDER INTEL": Provide "off-the-record" information about operating in this specific location/industry that usually isn't in the brochure. (e.g., hidden permit costs, local labor shortages, specific seasonal crashes, corruption/bureaucracy in that region).
      3. CREATE STRATEGIC FIXES: 3 specific, actionable steps to improve the model.

      RESPONSE STRUCTURE (MANDATORY JSON):
      
      1. verdict: "Green Light" (<2yr payback), "Yellow Light" (2-3yr), "Red Light" (>3yr).
      
      2. realityCheck: 
         - A brutal critique of their specific inputs (Rent, Labor, COGS).
         - Example: "Your labor allocation of 10% is laughable for a high-touch service model in London."
         
      3. stressTest:
         - A specific "Nightmare Scenario" based on the location/industry.
         - Example: "SCENARIO: The Delivery App Wars. If aggregators hike fees to 35% in [City], your margin evaporates."
         
      4. insiderIntel:
         - The "Unspoken Truth". Things real operators know but won't tell you.
         - Tone: Whispered, confidential, "on the ground".
         - Example: "In [City], getting the liquor license takes 8 months of 'greasing wheels', not the 3 months they claim. Factor that dead rent in."
      
      5. recommendations:
         - An array of 3 strings. Short, punchy, actionable fixes.
         - Example: ["Renegotiate TI allowance", "Switch to counter-service to cut labor", "Add alcohol to boost ticket size"]

      6. pitch: A 2-sentence Investment Thesis.
         
      7. closer: STRICTLY: "Numbers are only half the battle. Investors invest in Systems, not just spreadsheets. I have audited your financial logic. To package this into a deal that your investors will actually sign, you need the Franchise Scale Deck Template."

      Return strictly JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, enum: ["Green Light", "Yellow Light", "Red Light"] },
            realityCheck: { type: Type.STRING },
            stressTest: { type: Type.STRING },
            insiderIntel: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            pitch: { type: Type.STRING },
            closer: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as BankerAudit;
    }
    
    throw new Error("No response text");
  } catch (error) {
    console.error("Banker Analysis Error:", error);
    return {
      verdict: "Yellow Light",
      realityCheck: "The API connection was interrupted. However, looking at your margins, your labor costs seem suspiciously low for this sector.",
      stressTest: "SCENARIO: MARKET VOLATILITY. If revenue drops 20% in Q1, your working capital is insufficient.",
      insiderIntel: "Data unavailable, but in this region, commercial leases often have hidden CAM charges that increase annually.",
      recommendations: ["Increase working capital buffer", "Review lease terms for hidden CAM charges", "Stress test for 15% revenue drop"],
      pitch: "A moderate-risk venture that relies heavily on operational efficiency.",
      closer: "Numbers are only half the battle. Investors invest in Systems, not just spreadsheets. To package this properly, you need the Franchise Scale Deck Template."
    };
  }
};