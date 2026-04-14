from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from openai import OpenAI
from config import settings

router = APIRouter(prefix="/chaos", tags=["Chaos Agent"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChaosRequest(BaseModel):
    messages: list[ChatMessage]
    portfolios: list[dict] = []
    current_dashboard: dict | None = None

@router.post("/simulate")
async def run_chaos_simulation(request: ChaosRequest):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set.")

    client = OpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )

    # 1. Format portfolio holdings AND build the choices array for the UI Action
    portfolio_lines = []
    portfolio_choices = []
    
    for i, p in enumerate(request.portfolios):
        p_id = p.get("id", str(i))
        p_name = p.get("name", f"Portfolio {i}")
        
        # Build the exact JSON choice structure the frontend expects
        portfolio_choices.append({"id": p_id, "label": p_name})
        
        holdings = p.get("holdings", [])
        if holdings:
            ticker_str = ", ".join([
                f"{h.get('ticker', '?')} ({h.get('shares', 0)} shares{', ' + h.get('sector') if h.get('sector') else ''})"
                for h in holdings
            ])
            portfolio_lines.append(f"  - {p_name} (ID: {p_id}): {ticker_str}")
        else:
            portfolio_lines.append(f"  - {p_name} (ID: {p_id}): (no holdings)")

    portfolio_context = "\n".join(portfolio_lines) if portfolio_lines else "No portfolios found."
    dashboard_context = json.dumps(request.current_dashboard, indent=2) if request.current_dashboard else "None"
    
    # Convert the choices list to a JSON string to inject directly into the prompt
    choices_json_str = json.dumps(portfolio_choices)

    system_prompt = f"""You are 'Chaos Agent', an expert financial risk analyst AI. You help users simulate Black Swan events, understand their market impact, and have in-depth conversations about the results.

USER'S PORTFOLIOS (with actual holdings):
{portfolio_context}

CURRENTLY DISPLAYED DASHBOARD:
{dashboard_context}

You always output valid JSON with exactly this structure:
{{
    "agentMessage": "your response here",
    "uiAction": {{"type": "none" | "options" | "portfolio_select", "choices": [...]}},
    "dashboardData": null or {{...}}
}}

YOU OPERATE IN FOUR MODES — choose based on the user's message:

MODE 1 - PORTFOLIO SELECTION (user describes a crisis but hasn't specified which portfolio to apply it to):
Use this to ask the user which portfolio they want to stress-test.
{{
    "agentMessage": "That is a severe scenario. Which of your portfolios would you like to run this stress test against?",
    "uiAction": {{
        "type": "portfolio_select",
        "choices": {choices_json_str}
    }},
    "dashboardData": null
}}

MODE 2 - CLARIFY SCENARIO (you know the portfolio, but the scenario angle is unclear):
Ask ONE question with up to 4 choices.
{{
    "agentMessage": "Interesting scenario. To focus the analysis — which angle matters most to you?",
    "uiAction": {{
        "type": "options",
        "choices": [
            {{"id": "A", "label": "Broad Market & Index Impact"}},
            {{"id": "B", "label": "Specific Sector Vulnerabilities"}},
            {{"id": "C", "label": "My Portfolio Exposure"}},
            {{"id": "D", "label": "Global Contagion & Macro Effects"}}
        ]
    }},
    "dashboardData": null
}}

MODE 3 - GENERATE ANALYSIS (you have the crisis and the target portfolio — use this as often as possible):
Generate the dashboard AND write a rich explanation. agentMessage must be 4-6 sentences covering the economics.
For recommendations: scan the selected portfolio's actual holdings and give a specific action for each relevant ticker ("reduce", "hold", or "increase"). Base them on each stock's sector exposure. Give 3-6 recommendations max.
{{
    "agentMessage": "Detailed explanation here — not a template. Explain the economics.",
    "uiAction": {{"type": "none", "choices": []}},
    "dashboardData": {{
        "title": "Punchy event title",
        "projectedLoss": "-18.5%",
        "recoveryTime": "14 Months",
        "impactedSectors": [
            {{"name": "Sector", "change": "-24%", "status": "critical"}},
            {{"name": "Sector", "change": "+3%", "status": "positive"}},
            {{"name": "Sector", "change": "-8%", "status": "negative"}}
        ],
        "summary": "2-3 sentence economic explanation shown on the dashboard card.",
        "recommendations": [
            {{"ticker": "AAPL", "action": "reduce", "reason": "Heavy reliance on Taiwan semiconductors creates direct supply chain exposure."}},
            {{"ticker": "XOM", "action": "hold", "reason": "Energy sector benefits from supply shocks driving oil prices higher."}}
        ]
    }}
}}

MODE 4 - CONVERSATION (follow-up questions, requests to explain, portfolio-specific questions):
Do NOT regenerate the dashboard. Keep dashboardData as null. Have a real conversation.
Reference the currently displayed dashboard if relevant. Use the actual portfolio holdings to give specific advice.
{{
    "agentMessage": "Detailed conversational response — explain mechanics, give historical context, reference specific tickers from their portfolio, answer their question fully.",
    "uiAction": {{"type": "none", "choices": []}},
    "dashboardData": null
}}

DECISION RULE:
- New crisis description with no portfolio specified → MODE 1
- New crisis description, portfolio known but angle unclear → MODE 2
- User picks an option or you have enough info → MODE 3
- User asks a follow-up question or references the dashboard → MODE 4

Output ONLY valid JSON. No markdown, no text outside the JSON."""

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        formatted_messages.append({"role": msg.role, "content": msg.content})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=formatted_messages,
            response_format={"type": "json_object"},
            temperature=0.7
        )

        raw_content = response.choices[0].message.content

        try:
            ai_result = json.loads(raw_content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI returned malformed response. Please rephrase and try again.")

        if "agentMessage" not in ai_result:
            raise HTTPException(status_code=500, detail="Unexpected response format from AI.")

        return ai_result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Chaos Agent Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reach the Chaos Agent. Check your GROQ_API_KEY.")