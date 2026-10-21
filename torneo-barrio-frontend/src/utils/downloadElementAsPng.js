export const downloadElementAsPng = async (element, filename) => {
  const target = element?.$el || element
  if (!target) throw new Error('No se encontró el contenido para exportar.')

  const { default: html2canvas } = await import('html2canvas')
  
  let canvas
  let blob

  try {
    canvas = await html2canvas(target, {
      useCORS: true,       // Permite cargar imágenes externas
      allowTaint: true,     // Captura imágenes cross-origin
      scale: 2,             // Mejora la resolución/calidad
      logging: false,
      backgroundColor: '#0b111e',
    })

    blob = await new Promise((resolve, reject) => {
      try {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('Canvas vacío o no exportable'))
        }, 'image/png')
      } catch (err) {
        reject(err)
      }
    })
  } catch (err) {
    // Si allowTaint provocó un SecurityError en toBlob debido a un origen cruzado estricto,
    // reintentamos con allowTaint: false para asegurar que no se bloquee la exportación
    canvas = await html2canvas(target, {
      useCORS: true,
      allowTaint: false,
      scale: 2,
      logging: false,
      backgroundColor: '#0b111e',
    })
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  if (!blob) throw new Error('No se pudo generar la imagen PNG.')

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
