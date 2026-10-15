export const getDefaultTeamLogo = (team = '') => {
  const source = typeof team === 'string'
    ? team
    : team?._id || team?.id || team?.name || team?.nombre || 'default-team'
  const normalized = String(source).trim() || 'default-team'

  let hash = 0
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash)
  }

  const safeHash = Math.abs(hash)
  const index = (safeHash % 6) + 1
  return `/images/default-team-${index}.svg`
}

export const getTeamLogoUrl = (team) => {
  if (!team) return '/images/default-team.svg'
  if (typeof team === 'string') {
    if (team.startsWith('http') || team.startsWith('/') || team.startsWith('data:')) {
      return team
    }
    return getDefaultTeamLogo(team)
  }
  const logo = team.logoUrl || team.escudo_url || ''
  if (logo && String(logo).trim()) {
    return String(logo).trim()
  }
  return getDefaultTeamLogo(team)
}
