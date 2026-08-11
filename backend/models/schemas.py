import re
from pydantic import BaseModel, field_validator, Field
from typing import Optional, List

# --- Auth ---
class UserRegister(BaseModel):
    name: str
    email: str
    age: int = Field(gt=0)
    country: str
    password: str

    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long.')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter.')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number.')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character.')
        return v


class UserLogin(BaseModel):
    email: str
    password: str

class OTPVerify(BaseModel):
    email: str
    otp: str

# --- Chat ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None
    system_prompt: Optional[str] = "RAG Agent"
    custom_system_prompt: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

class CreateSessionRequest(BaseModel):
    system_prompt: str = "RAG Agent"
    title: str = "New Chat"