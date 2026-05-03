import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# LangChain / LangGraph / Vertex AI imports
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List, Any
import operator

load_dotenv()

app = FastAPI(title="UDB AI Mentor Service", description="Vertex AI LangGraph Orchestration")

# Define Agent State
class AgentState(TypedDict):
    messages: Annotated[List[Any], operator.add]
    subject: str
    intent: str
    knowledge_retrieved: str

def get_llm():
    try:
        return ChatVertexAI(
            model_name="gemini-1.5-pro",
            project=os.getenv("GOOGLE_CLOUD_PROJECT"),
            location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        )
    except Exception as e:
        print(f"Warning: Failed to init Vertex AI ({e}). Using mock LLM.")
        return None

# ── Node: RAG Retrieval (Vector Search) ──
def retrieve_knowledge(state: AgentState):
    """Mocks fetching educational context from Vertex AI Vector Search"""
    subject = state.get("subject", "general")
    query = state["messages"][-1].content
    # In production, query Vertex AI Vector Search here
    retrieved_context = f"Educational context for {subject}: Break down the problem into smaller steps."
    
    return {"knowledge_retrieved": retrieved_context}

# ── Node: Socratic Generation ──
def generate_socratic_response(state: AgentState):
    llm = get_llm()
    if not llm:
        return {"messages": [{"role": "assistant", "content": "Mock Socratic Response: What do you think the first step should be?"}]}
    
    context = state.get("knowledge_retrieved", "")
    subject = state.get("subject", "general")
    
    sys_msg = SystemMessage(content=f"You are a Socratic tutor for {subject}. Context: {context}. Ask guiding questions, never give direct answers.")
    messages = [sys_msg] + state["messages"]
    
    response = llm.invoke(messages)
    return {"messages": [response]}

# Build the Graph
workflow = StateGraph(AgentState)
workflow.add_node("retrieve", retrieve_knowledge)
workflow.add_node("generate", generate_socratic_response)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

mentor_app = workflow.compile()

# ── API Models ──
class ChatRequest(BaseModel):
    user_id: str
    message: str
    subject: str

class ChatResponse(BaseModel):
    response: str
    knowledge_used: str

@app.get("/health")
def health_check():
    return {"status": "OK", "service": "ai-mentor"}

@app.post("/api/mentor/chat", response_model=ChatResponse)
async def chat_with_mentor(req: ChatRequest):
    initial_state = {
        "messages": [HumanMessage(content=req.message)],
        "subject": req.subject,
        "intent": "unknown",
        "knowledge_retrieved": ""
    }
    
    try:
        final_state = mentor_app.invoke(initial_state)
        messages = final_state.get("messages", [])
        last_message = messages[-1].content if hasattr(messages[-1], 'content') else messages[-1].get("content")
        
        return ChatResponse(
            response=last_message,
            knowledge_used=final_state.get("knowledge_retrieved", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
