export interface Rule {
  id: string
  priority: number
  type: 'contains' | 'regex' | 'brand'
  value: string
  packSize: number
  allowUnits: boolean
}
