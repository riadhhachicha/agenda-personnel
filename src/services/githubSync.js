// ============================================================
// GitHub Sync Service — Backup agenda data via GitHub REST API
// Commits agenda_items.json to the configured repository
// ============================================================

const GITHUB_API = 'https://api.github.com'

// Get saved GitHub config from localStorage
export const getGithubConfig = () => ({
  pat:    localStorage.getItem('github_pat') || '',
  owner:  localStorage.getItem('github_owner') || 'riadhhachicha',
  repo:   localStorage.getItem('github_repo') || 'agenda-personnel',
  branch: localStorage.getItem('github_branch') || 'main',
  path:   localStorage.getItem('github_backup_path') || 'data/agenda_backup.json',
  autoSync: localStorage.getItem('github_auto_sync') === 'true'
})

export const saveGithubConfig = (config) => {
  localStorage.setItem('github_pat',         config.pat || '')
  localStorage.setItem('github_owner',        config.owner || 'riadhhachicha')
  localStorage.setItem('github_repo',         config.repo || 'agenda-personnel')
  localStorage.setItem('github_branch',       config.branch || 'main')
  localStorage.setItem('github_backup_path',  config.path || 'data/agenda_backup.json')
  localStorage.setItem('github_auto_sync',    config.autoSync ? 'true' : 'false')
}

// Check if GitHub is configured
export const isGithubConfigured = () => {
  const { pat, owner, repo } = getGithubConfig()
  return !!(pat && owner && repo)
}

// Get current file SHA (needed for updates)
const getFileSha = async (config) => {
  const { pat, owner, repo, branch, path } = config
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: `token ${pat}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    )
    if (res.status === 404) return null // File doesn't exist yet
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
    const data = await res.json()
    return data.sha
  } catch (e) {
    console.warn('Could not get file SHA:', e.message)
    return null
  }
}

// Push agenda data to GitHub
export const pushToGithub = async (agendaItems) => {
  const config = getGithubConfig()
  const { pat, owner, repo, branch, path } = config

  if (!pat || !owner || !repo) {
    throw new Error('Configuration GitHub incomplète. Vérifiez vos paramètres.')
  }

  // Get current file SHA for update
  const sha = await getFileSha(config)

  // Prepare content
  const backup = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    exported_by: 'Mon Agenda Personnel',
    count: agendaItems.length,
    items: agendaItems
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(backup, null, 2))))

  const body = {
    message: `📅 Backup agenda — ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    content,
    branch,
    ...(sha ? { sha } : {})  // Include SHA only for updates
  }

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${pat}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `Erreur GitHub: ${res.status}`)
  }

  const data = await res.json()
  const timestamp = new Date().toISOString()
  localStorage.setItem('github_last_sync', timestamp)

  return {
    success: true,
    sha: data.content?.sha,
    url: data.content?.html_url,
    timestamp
  }
}

// Get last sync timestamp
export const getLastGithubSync = () => {
  return localStorage.getItem('github_last_sync') || null
}

// Verify PAT is valid (test API connection)
export const verifyGithubPAT = async (pat, owner, repo) => {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${pat}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    )
    if (res.status === 401) return { valid: false, error: 'Token invalide ou expiré.' }
    if (res.status === 404) return { valid: false, error: 'Dépôt introuvable. Vérifiez le nom du repo.' }
    if (!res.ok) return { valid: false, error: `Erreur: ${res.status}` }
    const data = await res.json()
    return { valid: true, repoName: data.full_name, private: data.private }
  } catch (e) {
    return { valid: false, error: 'Impossible de contacter GitHub. Vérifiez votre connexion.' }
  }
}
