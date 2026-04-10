from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from openai import OpenAI
import json

router = APIRouter(prefix="/chaos", tags=["Chaos Agent"])

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChaosRequest(BaseModel):
    messages: list[ChatMessage]
    portfolios: list[dict] = [] 

@router.post("/simulate")
async def run_chaos_simulation(request: ChaosRequest):
    portfolio_names = ", ".join([p.get("name", "Unknown") for p in request.portfolios]) if request.portfolios else "No portfolios found."

    system_prompt = f"""
    You are an expert financial risk analyst AI named 'Chaos Agent'. 
    You help users simulate hypothetical "Black Swan" or crisis events.
    
    The user currently has these portfolios in their account: [{portfolio_names}].
    
    CRITICAL INSTRUCTION - THE "RULE OF TWO":
    You must NOT interrogate the user with endless questions. You are allowed a MAXIMUM of 1 clarifying question (e.g., asking which portfolio to apply it to, OR asking which broad angle they want). 
    Once the user has stated the event and answered your first question, you MUST immediately generate the final `dashboardData`. Do not ask follow-up questions about legislative changes, specific mechanics, or granular details. Use your own expert reasoning to make assumptions and generate the dashboard immediately.
    
    You must ALWAYS output valid JSON matching this EXACT schema:
    {{
        "agentMessage": "Your conversational reply.",
        "uiAction": {{
            "type": "none" | "options" | "portfolio_select",
            "choices": [
                {{"id": "A", "label": "Broad Market Expectancy & Index impact"}},
                {{"id": "B", "label": "Specific Sector Vulnerabilities"}}
            ]
        }},
        "dashboardData": null
    }}
    
    RULES FOR uiAction:
    - If you need the user to choose an analysis angle, use type "options" with A, B, C, and D (Custom).
    - If you need the user to select a portfolio, use type "portfolio_select" and list their actual portfolios as choices.
    - If no action is needed, use type "none" and set choices to [].
    
    FINAL DASHBOARD GENERATION (Trigger this as fast as possible!):
    When you have the event and ONE clarifying answer, populate 'dashboardData' and set uiAction to "none":
    {{
        "agentMessage": "Here is the simulated analysis for your scenario...",
        "uiAction": {{ "type": "none", "choices": [] }},
        "dashboardData": {{
            "title": "A short, punchy title for the event",
            "projectedLoss": "Estimated percentage drop (e.g., '-15.4%')",
            "recoveryTime": "Estimated time to recover (e.g., '14 Months')",
            "impactedSectors": [
                {{"name": "Sector Name", "change": "Percentage change", "status": "critical" | "negative" | "positive"}}
            ],
            "summary": "A 2-3 sentence explanation of the economic mechanics of this shock."
        }}
    }}
    Output ONLY valid JSON.
    """

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        formatted_messages.append({"role": msg.role, "content": msg.content})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=formatted_messages,
            response_format={ "type": "json_object" },
            temperature=0.7
        )

        ai_result = json.loads(response.choices[0].message.content)
        return ai_result

    except Exception as e:
        print(f"Chaos Agent Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate chaos simulation.")