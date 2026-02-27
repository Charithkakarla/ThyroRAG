from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine
engine = create_engine(DATABASE_URL, echo=True)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== DATABASE MODELS =====

class User(Base):
    """User/Patient accounts"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    patient_id = Column(String(20), unique=True, nullable=False)
    role = Column(String(20), default="Patient")
    email = Column(String(100), unique=True)
    phone = Column(String(20))
    date_of_birth = Column(DateTime)
    sex = Column(String(1))
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    predictions = relationship("Prediction", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    settings = relationship("UserSettings", back_populates="user", uselist=False)


class Prediction(Base):
    """Thyroid disease prediction history"""
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Patient data
    age = Column(Float, nullable=False)
    sex = Column(String(1), nullable=False)
    weight = Column(Float)
    
    # Hormone levels
    TSH = Column(Float)
    T3 = Column(Float)
    TT4 = Column(Float)
    T4U = Column(Float)
    FTI = Column(Float)
    TBG = Column(Float)
    
    # Medical history (stored as booleans)
    on_thyroxine = Column(Boolean, default=False)
    query_on_thyroxine = Column(Boolean, default=False)
    on_antithyroid_medication = Column(Boolean, default=False)
    sick = Column(Boolean, default=False)
    pregnant = Column(Boolean, default=False)
    thyroid_surgery = Column(Boolean, default=False)
    I131_treatment = Column(Boolean, default=False)
    query_hypothyroid = Column(Boolean, default=False)
    query_hyperthyroid = Column(Boolean, default=False)
    lithium = Column(Boolean, default=False)
    goitre = Column(Boolean, default=False)
    tumor = Column(Boolean, default=False)
    hypopituitary = Column(Boolean, default=False)
    psych = Column(Boolean, default=False)
    
    # Prediction results
    prediction = Column(String(20), nullable=False)  # Negative, Hypothyroid, Hyperthyroid
    confidence = Column(Float, nullable=False)
    prob_negative = Column(Float)
    prob_hypothyroid = Column(Float)
    prob_hyperthyroid = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="predictions")


class ChatSession(Base):
    """Chat conversation sessions"""
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Individual chat messages"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(10), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # RAG context (optional - store what context was used)
    context_used = Column(Text)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")


class UserSettings(Base):
    """User preferences and settings"""
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=True)
    
    # Privacy settings
    share_data_for_research = Column(Boolean, default=False)
    allow_anonymous_analytics = Column(Boolean, default=True)
    
    # Display preferences
    theme = Column(String(20), default="light")
    language = Column(String(5), default="en")
    
    # System settings
    auto_save_results = Column(Boolean, default=True)
    export_format = Column(String(10), default="pdf")
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="settings")


# Function to create all tables
def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


# Function to drop all tables (use with caution!)
def drop_tables():
    """Drop all database tables"""
    Base.metadata.drop_all(bind=engine)
    print("⚠️ All database tables dropped!")


if __name__ == "__main__":
    # Create tables when run directly
    create_tables()
