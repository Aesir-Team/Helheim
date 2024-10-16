import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import Config from '../common/config/app.config'
import HandleRoutes from '../common/utils/handler.routes'
import { HandleDatabase } from '../common/database/database'
import AppMiddlewares from '../common/middlewares/app.middlewares'


export const app = new Hono()
const port = Config.port

export default function handleServer() {
    AppMiddlewares(app)
    HandleRoutes(app)
    HandleDatabase()

    console.log(`Server is running on port ${port}`)

    serve({
        fetch: app.fetch,
        port
    })
}