import React, { useState } from 'react'

export default function Home({ projects }) {
  const [engine, setEngine] = useState('reportlab')
  const [loadingIds, setLoadingIds] = useState({})
  const [message, setMessage] = useState(null)

  async function generateCvForProject(p) {
    try {
      setMessage(null)
      setLoadingIds(prev => ({ ...prev, [p.id]: true }))
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
      const endpoint = engine === 'latex' ? `${apiBase}/generate-cv?engine=latex` : `${apiBase}/generate-cv`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: p.title, company: p.company, year: p.year, skills: p.skills, summary: '' })
      })
      if (!res.ok) throw new Error('Erreur génération CV')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `cv_${p.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
      setMessage({ type: 'success', text: `CV généré (${engine}) pour ${p.title}` })
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la génération du CV: ' + err.message })
    } finally {
      setLoadingIds(prev => {
        const copy = { ...prev }
        delete copy[p.id]
        return copy
      })
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Projet Haut Niveau — Projets</h1>
      <p>Consommation de l'API /projects</p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 12 }}><strong>Engine :</strong></label>
        <label style={{ marginRight: 8 }}>
          <input type="radio" name="engine" value="reportlab" checked={engine==='reportlab'} onChange={() => setEngine('reportlab')} /> ReportLab
        </label>
        <label>
          <input type="radio" name="engine" value="latex" checked={engine==='latex'} onChange={() => setEngine('latex')} /> LaTeX
        </label>
      </div>
      {message && (
        <div style={{ marginBottom: 12, color: message.type==='error' ? 'crimson' : 'green' }}>{message.text}</div>
      )}
      {projects && projects.length ? (
        <ul>
          {projects.map(p => (
            <li key={p.id} style={{ marginBottom: 12 }}>
              <strong>{p.title}</strong> — {p.company} ({p.year})
              <div style={{ fontSize: 13, color: '#444' }}>Compétences: {(p.skills || []).join(', ')}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => generateCvForProject(p)} style={{ padding: '6px 10px' }} disabled={!!loadingIds[p.id]}>
                  {loadingIds[p.id] ? 'Génération en cours...' : `Générer CV (${engine})`}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucun projet trouvé.</p>
      )}
    </main>
  )
}

export async function getServerSideProps(context) {
  // Use a server-only env var to reach the API from inside the frontend container
  const apiServerBase = process.env.API_SERVER_URL || 'http://api:8000'
  try {
    const res = await fetch(`${apiServerBase.replace(/\/$/, '')}/projects`)
    const projects = await res.json()
    // ensure skills are arrays
    const normalized = projects.map(p => ({ ...p, skills: Array.isArray(p.skills) ? p.skills : (p.skills || '').split('|').filter(Boolean) }))
    return { props: { projects: normalized } }
  } catch (err) {
    return { props: { projects: [] } }
  }
}
