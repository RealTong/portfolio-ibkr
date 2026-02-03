import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import type { HonoContext } from '@/types'
import { getConDetail, getIBKRAccountInfo, getIBKRPositions, getLedger } from './api'
import { getEquityHistory, recordLedgerSnapshot } from './db'
import { existsSync } from 'node:fs'

const app = new Hono<HonoContext>()

type RangeKey = "1d" | "7d" | "1y" | "all";

function isRangeKey(value: string): value is RangeKey {
    return value === "1d" || value === "7d" || value === "1y" || value === "all";
}


app.get('/api/accountInfo', async (c) => {
    const data = await getIBKRAccountInfo()
    return c.json(data)
})

app.get('/api/positions', async (c) => {
    const accountId = c.req.query('accountId') ?? "U13825171"
    if (!accountId) {
        return c.json({ error: 'Account ID is required' }, 400)
    }
    const pageId = c.req.query('pageId')
    const data = await getIBKRPositions(accountId, pageId)
    return c.json(data)
})

app.get('/api/conDetail', async (c) => {
    const accountId = c.req.query('accountId') ?? "U13825171"
    const conId = c.req.query('conId')
    const data = await getConDetail(accountId, conId)
    return c.json(data)
})

app.get('/api/ledger', async (c) => {
    const accountId = c.req.query('accountId') ?? "U13825171"
    const data = await getLedger(accountId)
    try {
        recordLedgerSnapshot(accountId, data?.USD)
    } catch (error) {
        console.error("Failed to record ledger snapshot:", error)
    }
    return c.json(data)
})

app.get('/api/equityHistory', async (c) => {
    const accountId = c.req.query('accountId') ?? "U13825171"
    const rangeParam = c.req.query('range') ?? "1d"
    const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "1d"

    const fromTsRaw = c.req.query('fromTs')
    const toTsRaw = c.req.query('toTs')
    const maxPointsRaw = c.req.query('maxPoints')

    const fromTs = fromTsRaw ? Number(fromTsRaw) : undefined
    const toTs = toTsRaw ? Number(toTsRaw) : undefined
    const maxPoints = maxPointsRaw ? Number(maxPointsRaw) : undefined

    const result = getEquityHistory({ accountId, range, fromTs, toTs, maxPoints })
    return c.json(result)
})

// Serve the built frontend in production (Docker / static deploy).
const distPath = './dist'
if (existsSync(distPath)) {
    app.use('/*', serveStatic({ root: distPath }))
    const serveIndex = serveStatic({ path: `${distPath}/index.html` })
    app.get('*', (c, next) => {
        if (c.req.path.startsWith('/api')) return next()
        return serveIndex(c, next)
    })
}

export default app
