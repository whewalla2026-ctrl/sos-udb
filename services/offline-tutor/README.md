# Offline Socratic Tutor (Mistral-7B GGUF)

## Model Packaging

The offline Socratic tutor uses Mistral-7B-Instruct-v0.3 quantized to Q4_K_M GGUF format.

## Directory Structure

```
services/offline-tutor/
├── model/
│   ├── mistral-7b-instruct-v0.3-q4_k_m.gguf  # 4.5GB model file
│   └── tokenizer.json
├── src/
│   ├── offline_tutor.py        # Main inference engine
│   ├── vector_store.py         # SQLite-vec integration
│   ├── session_manager.py      # Offline session queue
│   └── guardrails.py           # Scaffolding enforcement
├── requirements.txt
└── Dockerfile
```

## Core Implementation

```python
# offline_tutor.py
import llama_cpp
import numpy as np
from sentence_transformers import SentenceTransformer

class OfflineTutor:
    def __init__(self, model_path: str):
        self.llm = llama_cpp.Llama(
            model_path=model_path,
            n_ctx=2048,
            n_threads=4,
            n_gpu_layers=0  # CPU only
        )
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
    def generate_response(
        self, 
        user_message: str, 
        session_history: list,
        grade: int
    ) -> str:
        # Check for answer-seeking intent
        if self.is_answer_seeking(user_message):
            return "I can see you want the answer, but let's think about this together..."
        
        # Build context from history
        context = self.build_context(session_history)
        
        # Build prompt with guardrails
        prompt = f"""You are a Socratic tutor. You NEVER provide direct answers.
Ask exactly ONE bridging question that leads the student toward understanding.
Use age-appropriate language for grade {grade}.

Context: {context}
Student: {user_message}

Your response:"""
        
        response = self.llm(
            prompt,
            max_tokens=256,
            temperature=0.2,
            stop=["Your response:"]
        )
        
        return response['choices'][0]['text'].strip()
    
    def is_answer_seeking(self, message: str) -> bool:
        answer_keywords = [
            'what is the answer', 'just tell me', 'give me the answer',
            'solve this', 'what\'s the solution', 'answer for'
        ]
        return any(kw in message.lower() for kw in answer_keywords)
    
    def build_context(self, history: list) -> str:
        return "\n".join([
            f"{'User' if h['role']=='user' else 'Tutor'}: {h['content']}"
            for h in history[-5:]  # Last 5 turns
        ])

# vector_store.py  
import sqlite3
import numpy as np

class VectorStore:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self.create_tables()
        
    def create_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                id INTEGER PRIMARY KEY,
                text TEXT,
                vector BLOB,
                metadata TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()
        
    def search(self, query: str, top_k: int = 5) -> list:
        query_embedding = self.embedding_model.encode(query)
        
        results = self.conn.execute("""
            SELECT text, metadata FROM embeddings
            ORDER BY vector <=> ?
            LIMIT ?
        """, (self.blob_encode(query_embedding), top_k)).fetchall()
        
        return [{'text': r[0], 'metadata': r[1]} for r in results]
    
    def blob_encode(self, arr: np.ndarray) -> bytes:
        return arr.astype(np.float32).tobytes()

# session_manager.py
import json
import time

class SessionManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        
    def save_offline_session(self, session_data: dict):
        with open(f"{self.db_path}/offline_sessions.jsonl", "a") as f:
            f.write(json.dumps({
                **session_data,
                'synced_at': None,
                'created_at': time.time()
            }) + "\n")
            
    def get_unsynced_sessions(self) -> list:
        unsynced = []
        try:
            with open(f"{self.db_path}/offline_sessions.jsonl", "r") as f:
                for line in f:
                    sess = json.loads(line)
                    if sess.get('synced_at') is None:
                        unsynced.append(sess)
        except FileNotFoundError:
            pass
        return unsynced
    
    def mark_synced(self, session_id: str):
        # Rewrite file with synced_at timestamp
        sessions = []
        with open(f"{self.db_path}/offline_sessions.jsonl", "r") as f:
            for line in f:
                sess = json.loads(line)
                if sess.get('sessionId') == session_id:
                    sess['synced_at'] = time.time()
                sessions.append(sess)
                
        with open(f"{self.db_path}/offline_sessions.jsonl", "w") as f:
            for sess in sessions:
                f.write(json.dumps(sess) + "\n")

# guardrails.py
class Guardrails:
    GRADED_KEYWORDS = ['homework', 'test', 'quiz', 'exam', 'assignment', 'graded']
    
    @staticmethod
    def detect_assignment(text: str) -> bool:
        return any(kw in text.lower() for kw in Guardrails.GRADED_KEYWORDS)
    
    @staticmethod
    def is_safe_response(response: str) -> bool:
        # Basic content safety check
        blocked = ['solution', 'answer key', 'cheat']
        return not any(b in response.lower() for b in blocked)
```

## API Endpoints

```python
# FastAPI application
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class QueryRequest(BaseModel):
    user_id: str
    message: str
    session_history: list
    grade: int

@app.post("/tutor/query")
async def query(request: QueryRequest):
    tutor = OfflineTutor("/app/model/mistral-7b-instruct-v0.3-q4_k_m.gguf")
    response = tutor.generate_response(
        request.message,
        request.session_history,
        request.grade
    )
    return {"response": response}

@app.get("/health")
async def health():
    return {"status": "healthy", "mode": "offline"}

@app.post("/sync-sessions")
async def sync_sessions():
    # This endpoint called by BullMQ when online
    # Syncs offline sessions to cloud
    return {"synced": 0, "pending": 0}
```

## Encryption at Rest

```python
from cryptography.fernet import Fernet

class LocalEncryptor:
    def __init__(self, key_path: str):
        with open(key_path, 'rb') as f:
            self.key = f.read()
        self.cipher = Fernet(self.key)
        
    def encrypt(self, data: bytes) -> bytes:
        return self.cipher.encrypt(data)
    
    def decrypt(self, encrypted: bytes) -> bytes:
        return self.cipher.decrypt(encrypted)
```

## Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model (should be mounted as volume)
# COPY model/ /app/model/

# Copy source
COPY src/ /app/src/

EXPOSE 8002

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
```

## Requirements

```
llama-cpp-python==0.2.90
sentence-transformers==2.2.2
fastapi==0.109.0
uvicorn==0.27.0
cryptography==42.0.0
numpy==1.26.3
```