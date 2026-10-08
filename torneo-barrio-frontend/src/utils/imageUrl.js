export const normalizeImageUrl = (value) => {
  const input = typeof value === 'string' ? value.trim() : ''

  if (!input) {
    return ''
  }

  try {
    const url = new URL(input)
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : ''
  } catch {
    return ''
  }
}

export const isOptionalImageUrl = (value) => {
  const input = typeof value === 'string' ? value.trim() : ''
  return !input || Boolean(normalizeImageUrl(input))
}
