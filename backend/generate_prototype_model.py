import joblib
import pandas as pd
import numpy as np
from catboost import CatBoostClassifier
import os

def create_prototype_model():
    print("🚀 Generating Prototype Thyroid Model...")
    
    # Define features based on the dataset
    features = [
        'age', 'sex', 'on_thyroxine', 'query_on_thyroxine', 
        'on_antithyroid_medication', 'sick', 'pregnant', 
        'thyroid_surgery', 'I131_treatment', 'query_hypothyroid', 
        'query_hyperthyroid', 'lithium', 'goitre', 'tumor', 
        'hypopituitary', 'psych', 'TSH', 'T3', 'TT4', 'T4U', 'FTI', 'referral_source'
    ]
    
    # Create dummy training data
    # 0 = Negative, 1 = Hypothyroid, 2 = Hyperthyroid
    X = pd.DataFrame({
        'age': np.random.randint(10, 90, 100),
        'sex': np.random.choice(['F', 'M'], 100),
        'on_thyroxine': np.random.choice(['f', 't'], 100),
        'query_on_thyroxine': np.random.choice(['f', 't'], 100),
        'on_antithyroid_medication': np.random.choice(['f', 't'], 100),
        'sick': np.random.choice(['f', 't'], 100),
        'pregnant': np.random.choice(['f', 't'], 100),
        'thyroid_surgery': np.random.choice(['f', 't'], 100),
        'I131_treatment': np.random.choice(['f', 't'], 100),
        'query_hypothyroid': np.random.choice(['f', 't'], 100),
        'query_hyperthyroid': np.random.choice(['f', 't'], 100),
        'lithium': np.random.choice(['f', 't'], 100),
        'goitre': np.random.choice(['f', 't'], 100),
        'tumor': np.random.choice(['f', 't'], 100),
        'hypopituitary': np.random.choice(['f', 't'], 100),
        'psych': np.random.choice(['f', 't'], 100),
        'TSH': np.random.uniform(0.1, 10.0, 100),
        'T3': np.random.uniform(0.5, 3.0, 100),
        'TT4': np.random.uniform(50, 150, 100),
        'T4U': np.random.uniform(0.5, 1.5, 100),
        'FTI': np.random.uniform(50, 150, 100),
        'referral_source': np.random.choice(['SVI', 'other', 'SVHC', 'STMW', 'SVHD'], 100)
    })
    
    y = np.random.choice([0, 1, 2], 100)
    
    # Initialize CatBoost
    cat_features = ['sex', 'on_thyroxine', 'query_on_thyroxine', 
                    'on_antithyroid_medication', 'sick', 'pregnant', 
                    'thyroid_surgery', 'I131_treatment', 'query_hypothyroid', 
                    'query_hyperthyroid', 'lithium', 'goitre', 'tumor', 
                    'hypopituitary', 'psych', 'referral_source']
    
    model = CatBoostClassifier(iterations=10, depth=3, learning_rate=0.1, verbose=0)
    model.fit(X, y, cat_features=cat_features)
    
    # Save the model
    model_path = "final_model.pkl"
    joblib.dump(model, model_path)
    print(f"✅ Prototype model saved to {os.path.abspath(model_path)}")
    print("👉 Now restart your backend server to load the model.")

if __name__ == "__main__":
    create_prototype_model()
