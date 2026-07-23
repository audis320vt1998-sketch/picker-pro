import type { NextApiRequest, NextApiResponse } from 'next'

interface StatsResponse {
  success: false
  error: string
  code: 'CATALOG_STATS_UNAVAILABLE'
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'CATALOG_STATS_UNAVAILABLE',
    })
  }

  // The legacy catalog contains demo data and must not be reported as operational
  // warehouse statistics. This route will be enabled after the verified catalog
  // adapter is implemented.
  return res.status(503).json({
    success: false,
    error: 'Verified catalog statistics are not available yet.',
    code: 'CATALOG_STATS_UNAVAILABLE',
  })
}
