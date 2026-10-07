export const getDefaultTeamLogo = (team = '') => {
  const source = typeof team === 'string' ? team : team?._id || team?.name || 'default-team';
  const normalized = String(source).trim() || 'default-team';

  let hash = 0
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash)
  }

  const safeHash = Math.abs(hash)
  const index = (safeHash % 6) + 1
  return `/images/default-team-${index}.svg`
}
