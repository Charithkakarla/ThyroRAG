"""
View PostgreSQL Database Contents
Run this script to see all data in your ThyroRAG database
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

def view_users():
    print("\n" + "="*60)
    print("USERS")
    print("="*60)
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, username, full_name, patient_id, role, email, last_login
            FROM users
            ORDER BY id
        """))
        for row in result:
            print(f"\nID: {row.id}")
            print(f"  Username: {row.username}")
            print(f"  Name: {row.full_name}")
            print(f"  Patient ID: {row.patient_id}")
            print(f"  Role: {row.role}")
            print(f"  Email: {row.email}")
            print(f"  Last Login: {row.last_login}")

def view_predictions():
    print("\n" + "="*60)
    print("PREDICTIONS")
    print("="*60)
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT p.id, u.username, p.age, p.sex, p.TSH, p.T3, p.TT4, 
                   p.prediction, p.confidence, p.created_at
            FROM predictions p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        """))
        for row in result:
            print(f"\nPrediction ID: {row.id}")
            print(f"  User: {row.username}")
            print(f"  Age: {row.age}, Sex: {row.sex}")
            print(f"  TSH: {row.TSH}, T3: {row.T3}, TT4: {row.TT4}")
            print(f"  Result: {row.prediction}")
            print(f"  Confidence: {row.confidence:.2%}")
            print(f"  Date: {row.created_at}")

def view_chat_sessions():
    print("\n" + "="*60)
    print("CHAT SESSIONS")
    print("="*60)
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT cs.id, u.username, cs.session_name, cs.created_at,
                   COUNT(cm.id) as message_count
            FROM chat_sessions cs
            JOIN users u ON cs.user_id = u.id
            LEFT JOIN chat_messages cm ON cs.id = cm.session_id
            GROUP BY cs.id, u.username, cs.session_name, cs.created_at
            ORDER BY cs.created_at DESC
        """))
        for row in result:
            print(f"\nSession ID: {row.id}")
            print(f"  User: {row.username}")
            print(f"  Name: {row.session_name}")
            print(f"  Messages: {row.message_count}")
            print(f"  Created: {row.created_at}")

def view_chat_messages():
    print("\n" + "="*60)
    print("CHAT MESSAGES")
    print("="*60)
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT cm.id, cm.session_id, cm.role, cm.content, cm.created_at
            FROM chat_messages cm
            ORDER BY cm.created_at DESC
            LIMIT 10
        """))
        for row in result:
            content = row.content[:100] + "..." if len(row.content) > 100 else row.content
            print(f"\nMessage ID: {row.id} (Session: {row.session_id})")
            print(f"  Role: {row.role}")
            print(f"  Content: {content}")
            print(f"  Time: {row.created_at}")

def view_database_stats():
    print("\n" + "="*60)
    print("DATABASE STATISTICS")
    print("="*60)
    with engine.connect() as conn:
        tables = ['users', 'predictions', 'chat_sessions', 'chat_messages', 'user_settings']
        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"{table:20s}: {count:3d} rows")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("THYRORAG DATABASE VIEWER")
    print("="*60)
    print(f"Database: thyrorag@localhost:5432")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        view_database_stats()
        view_users()
        view_predictions()
        view_chat_sessions()
        view_chat_messages()
        
        print("\n" + "="*60)
        print("DATABASE VIEW COMPLETE")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        print("Make sure PostgreSQL is running and credentials are correct in .env file")
