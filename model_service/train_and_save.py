import numpy as np
from sklearn.ensemble import RandomForestRegressor
import bentoml

def train_and_save():
    # small synthetic regression model for demo
    rng = np.random.RandomState(42)
    X = rng.normal(size=(200, 3))
    weights = np.array([1.0, -0.5, 0.3])
    y = X.dot(weights) + rng.normal(scale=0.1, size=X.shape[0])

    model = RandomForestRegressor(n_estimators=20, random_state=42)
    model.fit(X, y)

    # save model into BentoML model store
    bentoml.sklearn.save_model("demo_rf", model)
    # also save a joblib fallback in the image for runtime
    try:
        import joblib
        joblib.dump(model, 'model.joblib')
    except Exception:
        pass

if __name__ == '__main__':
    train_and_save()
