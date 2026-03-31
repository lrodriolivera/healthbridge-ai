/**
 * Tests for frontend file validation helpers
 */

describe('File type detection', () => {
  const isAnalyzable = (filename: string): boolean => {
    return filename.endsWith('.jar') || filename.endsWith('.zip') || filename.endsWith('.xml')
  }

  test('JAR files are analyzable', () => {
    expect(isAnalyzable('test.jar')).toBe(true)
    expect(isAnalyzable('composite_sca_Test.jar')).toBe(true)
  })

  test('XML files are analyzable', () => {
    expect(isAnalyzable('channel.xml')).toBe(true)
  })

  test('ZIP files are analyzable', () => {
    expect(isAnalyzable('archive.zip')).toBe(true)
  })

  test('Other files are not analyzable', () => {
    expect(isAnalyzable('code.cls')).toBe(false)
    expect(isAnalyzable('image.png')).toBe(false)
    expect(isAnalyzable('readme.md')).toBe(false)
  })
})

describe('File size formatting', () => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  test('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  test('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  test('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
