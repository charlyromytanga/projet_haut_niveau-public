import streamlit as st
import pandas as pd
import requests

st.set_page_config(page_title='Dashboard - Projet Haut Niveau', layout='wide')
st.title('Dashboard — Projets & Expériences')

try:
    # st.secrets may raise if no secrets file is present inside the container
    API_URL = st.secrets.get('API_URL', 'http://api:8000')
except Exception:
    API_URL = 'http://api:8000'

st.write('Source API:', API_URL)

@st.cache_data
def fetch_projects():
    try:
        resp = requests.get(f"{API_URL}/projects", timeout=5)
        resp.raise_for_status()
        return pd.DataFrame(resp.json())
    except Exception as e:
        st.error(f"Impossible de récupérer les projets: {e}")
        return pd.DataFrame()


df = fetch_projects()
if df.empty:
    st.info('Aucun projet disponible — vérifiez que l\'API est lancée.')
else:
    st.dataframe(df)
    # simple chart by year
    if 'year' in df.columns:
        counts = df['year'].value_counts().sort_index()
        st.bar_chart(counts)
