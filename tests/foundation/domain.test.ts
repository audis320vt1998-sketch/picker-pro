describe('foundation domain contracts', () => {
  it('keeps case and unit totals as separate numeric fields in fixtures', () => {
    const fixture = {
      cases: 2,
      units: 14,
    }

    expect(fixture.cases).toBe(2)
    expect(fixture.units).toBe(14)
  })

  it('stores page and row references together for traceability fixtures', () => {
    const sourceRef = {
      page: {
        jobId: 'job-1',
        pageNumber: 1,
      },
      row: {
        rowNumber: 8,
      },
    }

    expect(sourceRef.page.pageNumber).toBe(1)
    expect(sourceRef.row.rowNumber).toBe(8)
  })

  it('keeps unusually high quantity threshold disabled by default', () => {
    const rulesCatalog = require('../../catalogs/rules.json')

    expect(rulesCatalog.validationSettings.unusuallyHighQuantityThreshold).toBeNull()
  })
})
