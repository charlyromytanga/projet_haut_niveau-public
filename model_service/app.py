from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

app = FastAPI(title='Model service (BentoML demo)')

class Input(BaseModel):
    features: list

class Output(BaseModel):
    prediction: float


@app.get('/health')
def health():
    return {"status": "ok"}


def _load_bento_model():
    try:
        import bentoml
        # load latest saved model
        m = bentoml.sklearn.load_model("demo_rf:latest")
        return m
    except Exception:
        # try fallback to joblib in /app/model.joblib
        try:
            import joblib
            m = joblib.load('/app/model.joblib')
            return m
        except Exception:
            return None


_MODEL = _load_bento_model()


@app.post('/predict', response_model=Output)
def predict(inp: Input):
    if _MODEL is None:
        raise HTTPException(status_code=503, detail='Model not available')
    try:
        arr = np.array(inp.features).reshape(1, -1)
        pred = _MODEL.predict(arr)
        return Output(prediction=float(pred[0]))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.on_event('startup')
def ensure_model():
    global _MODEL
    if _MODEL is not None:
        return
    # try to run the training script at container start if model missing
    try:
        import subprocess
        subprocess.run(['python', 'train_and_save.py'], check=True)
    except Exception:
        pass
    _MODEL = _load_bento_model()
