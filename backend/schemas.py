from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import date, datetime

# AUTH SCHEMAS
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(UserLogin):
    role: str = "Admin"

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    created_at: datetime

# PATIENT SCHEMAS
class PatientBase(BaseModel):
    full_name: str
    dob: date = Field(..., alias="date_of_birth")
    gender: str
    phone: str = Field(..., alias="contact_number")
    address: Optional[str] = None
    occupation: Optional[str] = None
    medical_history: Optional[Any] = None
    clinical_snapshot: Optional[Any] = None
    session_number: Optional[int] = 1

    model_config = {
        "populate_by_name": True
    }

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = Field(None, alias="date_of_birth")
    gender: Optional[str] = None
    phone: Optional[str] = Field(None, alias="contact_number")
    address: Optional[str] = None
    occupation: Optional[str] = None
    medical_history: Optional[Any] = None
    clinical_snapshot: Optional[Any] = None
    session_number: Optional[int] = None

    model_config = {
        "populate_by_name": True
    }

class PatientResponse(PatientBase):
    id: str
    created_by: str
    created_at: datetime

# APPOINTMENT SCHEMAS
class PatientInfo(BaseModel):
    full_name: str

class AppointmentUpdate(BaseModel):
    date: Optional[date] = None
    time: Optional[str] = None
    session_type: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    clinical_snapshot: Optional[Any] = None

class AppointmentBase(BaseModel):
    patient_id: str
    date: Optional[date] = None
    time: Optional[str] = None
    session_type: Optional[str] = "Initial Assessment"
    session_number: Optional[int] = 1
    notes: Optional[str] = None
    status: str = "Pending"
    clinical_snapshot: Optional[Any] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: str
    created_at: datetime
    patients: Optional[PatientInfo] = None

    model_config = {"from_attributes": True}

# CHAT SCHEMAS
class ChatMessage(BaseModel):
    message: str
    patient_id: Optional[str] = None
    session_number: Optional[int] = None
    chat_history: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    ai_response: str
    timestamp: datetime


# ASSESSMENT SCHEMAS
class AssessmentBase(BaseModel):
    patient_id: str
    session_number: int = 1
    chief_complaint: Optional[str] = None
    pain_score: Optional[int] = None
    symptoms: Optional[Any] = None
    rom_data: Optional[Any] = None
    functional_limitations: Optional[Any] = None
    clinical_snapshot: Optional[Any] = None

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentResponse(AssessmentBase):
    id: str
    created_at: datetime

# TREATMENT/SESSION PLAN SCHEMAS
class SessionPlanBase(BaseModel):
    patient_id: str
    session_number: int = 1
    short_term_goals: Optional[str] = None
    long_term_goals: Optional[str] = None
    frequency: Optional[str] = None
    duration_weeks: Optional[str] = None
    modalities: Optional[Any] = None
    therapist_notes: Optional[str] = None
    status: Optional[str] = "Active"
    clinical_snapshot: Optional[Any] = None

class SessionPlanCreate(SessionPlanBase):
    pass

class SessionPlanResponse(SessionPlanBase):
    id: str
    created_at: datetime

