import type { NextApiRequest, NextApiResponse } from 'next'
import { initializeCatalog } from '../../lib/catalog'

interface StatsResponse {
  success: boolean
  data?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const catalog = await initializeCatalog()

    const statistics = await catalog.getStatistics()
    const categories = await catalog.getCategories()
    const suppliers = await catalog.getSuppliers()

    res.status(200).json({
      success: true,
      data: {
        statistics,
        categories,
        suppliers,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Stats error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
