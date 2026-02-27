"""
Seed demo users into the database
Run this script to populate the database with demo user accounts
"""

from database import engine, Base, User, UserSettings
from sqlalchemy.orm import Session
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def seed_demo_users():
    """Create demo user accounts in the database"""
    
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Demo users to create
    demo_users = [
        {
            "username": "sarah.johnson",
            "password": "demo123",
            "full_name": "Sarah Johnson",
            "patient_id": "PT001",
            "email": "sarah.johnson@example.com",
            "role": "Patient"
        },
        {
            "username": "michael.chen",
            "password": "demo123",
            "full_name": "Michael Chen",
            "patient_id": "PT002",
            "email": "michael.chen@example.com",
            "role": "Patient"
        },
        {
            "username": "emily.rodriguez",
            "password": "demo123",
            "full_name": "Emily Rodriguez",
            "patient_id": "PT003",
            "email": "emily.rodriguez@example.com",
            "role": "Patient"
        },
        {
            "username": "admin",
            "password": "admin123",
            "full_name": "System Administrator",
            "patient_id": "ADMIN001",
            "email": "admin@thyrorag.com",
            "role": "Admin"
        }
    ]
    
    with Session(engine) as session:
        # Check if users already exist
        existing_users = session.query(User).filter(
            User.username.in_([u["username"] for u in demo_users])
        ).all()
        
        if existing_users:
            print(f"Found {len(existing_users)} existing users. Skipping seed.")
            print("Existing usernames:", [u.username for u in existing_users])
            return
        
        # Create users
        created_count = 0
        for user_data in demo_users:
            # Hash password
            hashed_password = hash_password(user_data["password"])
            
            # Create user
            new_user = User(
                username=user_data["username"],
                password_hash=hashed_password,
                full_name=user_data["full_name"],
                patient_id=user_data["patient_id"],
                email=user_data["email"],
                role=user_data["role"]
            )
            session.add(new_user)
            session.flush()  # Get user ID
            
            # Create default settings for user
            settings = UserSettings(user_id=new_user.id)
            session.add(settings)
            
            created_count += 1
            print(f"Created user: {user_data['username']} (ID: {new_user.id})")
        
        # Commit all changes
        session.commit()
        print(f"\n✅ Successfully created {created_count} demo users!")
        print("\nDemo Credentials:")
        print("================")
        for user_data in demo_users:
            print(f"Username: {user_data['username']:<20} Password: {user_data['password']}")

if __name__ == "__main__":
    print("Seeding demo users into database...")
    print("=" * 50)
    try:
        seed_demo_users()
    except Exception as e:
        print(f"\n❌ Error seeding users: {str(e)}")
        import traceback
        traceback.print_exc()
