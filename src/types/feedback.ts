export type FeedbackCategory =
  | 'issue'
  | 'positive'
  | 'feature'

export type FeedbackDisplayMode =
  | 'standalone'
  | 'browser'

export type FeedbackDiagnostics = {
  appVersion: string
  currentPage: string
  createdAt: string
  userAgent: string
  viewport: {
    width: number
    height: number
  }
  displayMode: FeedbackDisplayMode
  online: boolean
  language: string
}

export type FeedbackPayload = {
  category: FeedbackCategory
  message: string
  contact?: string
  diagnostics: FeedbackDiagnostics
}
