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

# Pinecone / Vector DB initialization
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_google_vertexai import VertexAIEmbeddings

# Define Agent State
class AgentState(TypedDict):
    messages: Annotated[List[Any], operator.add]
    subject: str
    intent: str
    knowledge_retrieved: str
    frustration_level: float  # 0.0 to 1.0
    path_to_solution: List[str] # Key conceptual steps identified

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

# ── Node: Intent & Frustration Analysis ──
def analyze_student_state(state: AgentState):
    """Analyzes the student's message for frustration and pedagogical intent."""
    last_message = state["messages"][-1].content
    llm = get_llm()
    
    if not llm:
        return {"intent": "question", "frustration_level": 0.1}

    analysis_prompt = f"Analyze the following student message for frustration (0-1) and intent (question, statement, frustration, or giving_up). Message: {last_message}. Return ONLY JSON: {{\"frustration\": float, \"intent\": string}}"
    response = llm.invoke([HumanMessage(content=analysis_prompt)])
    
    # Simple parse for demonstration
    import json
    try:
        # Extract json from markdown block if needed
        clean_content = response.content.replace('```json', '').replace('```', '').strip()
        data = json.loads(clean_content)
        return {"intent": data.get("intent", "question"), "frustration_level": data.get("frustration", 0.0)}
    except:
        return {"intent": "question", "frustration_level": 0.2}

# ── Node: RAG Retrieval ──
def retrieve_knowledge(state: AgentState):
    """Fetches educational context from Pinecone Vector Store"""
    subject = state.get("subject", "general")
    query = state["messages"][-1].content
    
    try:
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        embeddings = VertexAIEmbeddings(model_name="textembedding-gecko@003")
        vectorstore = PineconeVectorStore(index_name="udb-curriculum", embedding=embeddings)
        
        # Filter by subject if possible
        docs = vectorstore.similarity_search(query, k=2)
        retrieved_context = "\n".join([d.page_content for d in docs])
    except Exception as e:
        print(f"RAG Error: {e}")
        retrieved_context = f"Educational context for {subject}: Scaffolding needed."

    return {"knowledge_retrieved": retrieved_context}

# ── Node: Socratic Generation ──
def generate_socratic_response(state: AgentState):
    llm = get_llm()
    if not llm:
        return {"messages": [HumanMessage(content="What do you think the first step should be?")]}
    
    context = state.get("knowledge_retrieved", "")
    subject = state.get("subject", "general")
    frustration = state.get("frustration_level", 0.0)
    
    socratic_system_prompt = f"""
    You are a world-class Socratic mentor for a student studying {subject}.
    
    RULES:
    1. NEVER give the answer directly.
    2. Analyze the student's message for their "Point of Confusion".
    3. Use the provided context to ask a SINGLE, TARGETED question that bridges their current knowledge to the next conceptual step.
    4. Current frustration level: {frustration:.2f}. If frustration > 0.7, be extra encouraging and offer a smaller hint.
    5. Subject Context: {context}
    """
    
    messages = [SystemMessage(content=socratic_system_prompt)] + state["messages"]
    
    response = llm.invoke(messages)
    return {"messages": [response]}

# Build the Graph
workflow = StateGraph(AgentState)
workflow.add_node("analyze", analyze_student_state)
workflow.add_node("retrieve", retrieve_knowledge)
workflow.add_node("generate", generate_socratic_response)

workflow.set_entry_point("analyze")
workflow.add_edge("analyze", "retrieve")
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
        "knowledge_retrieved": "",
        "frustration_level": 0.0,
        "path_to_solution": []
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
