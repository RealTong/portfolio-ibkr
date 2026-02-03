import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import type { HonoContext } from '@/types'
import { getConDetail, getIBKRAccountInfo, getIBKRPositions, getLedger } from './api'
import { getEquityHistory, recordLedgerSnapshot } from './db'
import { existsSync } from 'node:fs'
import {
    MOCK_MODE_ENABLED,
    getMockAccountId,
    getMockAccountInfo,
    getMockEquityHistory,
    getMockLedger,
    getMockPositions,
} from "./mock"

export const app = new Hono<HonoContext>()

type RangeKey = "1d" | "7d" | "1y" | "all";

function isRangeKey(value: string): value is RangeKey {
    return value === "1d" || value === "7d" || value === "1y" || value === "all";
}

app.onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message || "Internal Server Error" }, 500);
});

const PORTFOLIO_TITLE = process.env.PORTFOLIO_TITLE || "IBKR Portfolio";

app.get("/api/config", (c) => {
    return c.json({
        title: PORTFOLIO_TITLE,
        mock: MOCK_MODE_ENABLED,
    });
});

app.get('/api/accountInfo', async (c) => {
    if (MOCK_MODE_ENABLED) {
        return c.json(getMockAccountInfo())
    }
    const data = await getIBKRAccountInfo()
    return c.json(data)
})

app.get('/api/positions', async (c) => {
    const accountId =
        c.req.query('accountId') ??
        process.env.IBKR_ACCOUNT_ID ??
        (MOCK_MODE_ENABLED ? getMockAccountId() : undefined)
    if (!accountId) {
        return c.json({ error: 'Account ID is required' }, 400)
    }
    if (MOCK_MODE_ENABLED) {
        return c.json(getMockPositions(accountId))
    }
    const pageId = c.req.query('pageId')
    const data = await getIBKRPositions(accountId, pageId)
    return c.json(data)
})

app.get('/api/conDetail', async (c) => {
    const accountId =
        c.req.query('accountId') ??
        process.env.IBKR_ACCOUNT_ID ??
        (MOCK_MODE_ENABLED ? getMockAccountId() : undefined)
    if (!accountId) {
        return c.json({ error: 'Account ID is required' }, 400)
    }
    const conId = c.req.query('conId')
    if (MOCK_MODE_ENABLED) {
        return c.json({
            accountId,
            conId,
            note: "Mock mode: contract details are not fetched from IBKR.",
        })
    }
    const data = await getConDetail(accountId, conId)
    return c.json(data)
})

app.get('/api/ledger', async (c) => {
    const accountId =
        c.req.query('accountId') ??
        process.env.IBKR_ACCOUNT_ID ??
        (MOCK_MODE_ENABLED ? getMockAccountId() : undefined)
    if (!accountId) {
        return c.json({ error: 'Account ID is required' }, 400)
    }
    if (MOCK_MODE_ENABLED) {
        return c.json(getMockLedger(accountId))
    }
    const data = await getLedger(accountId)
    try {
        recordLedgerSnapshot(accountId, data?.USD)
    } catch (error) {
        console.error("Failed to record ledger snapshot:", error)
    }
    return c.json(data)
})

app.get('/api/equityHistory', async (c) => {
    const accountId =
        c.req.query('accountId') ??
        process.env.IBKR_ACCOUNT_ID ??
        (MOCK_MODE_ENABLED ? getMockAccountId() : undefined)
    if (!accountId) {
        return c.json({ error: 'Account ID is required' }, 400)
    }
    const rangeParam = c.req.query('range') ?? "1d"
    const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "1d"

    const fromTsRaw = c.req.query('fromTs')
    const toTsRaw = c.req.query('toTs')
    const maxPointsRaw = c.req.query('maxPoints')

    const fromTs = fromTsRaw ? Number(fromTsRaw) : undefined
    const toTs = toTsRaw ? Number(toTsRaw) : undefined
    const maxPoints = maxPointsRaw ? Number(maxPointsRaw) : undefined

    if (MOCK_MODE_ENABLED) {
        const result = getMockEquityHistory({ accountId, range, fromTs, toTs, maxPoints })
        return c.json(result)
    }
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

export default {
    port: Number(process.env.PORT || 3000),
    fetch: app.fetch,
}
