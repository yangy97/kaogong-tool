import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { getAllProviders, isAnyAiConfigured, getDefaultProviderId } from './config/aiConfig.js'
import questionsRouter from './routes/questions.js'
import vocabRouter from './routes/vocab.js'
import xhsRouter from './routes/xhs.js'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(serverRoot, '.env') })

const app = express()
const PORT = Number(process.env.PORT) || 3456
const aiProviders = getAllProviders()
const anyAi = isAnyAiConfigured()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  const defaultId = getDefaultProviderId()
  const defaultP = aiProviders.find((p) => p.id === defaultId)!
  res.json({
    ok: true,
    aiConfigured: anyAi,
    anyConfigured: anyAi,
    defaultProviderId: defaultId,
    aiModel: defaultP.defaultModel,
    aiBaseUrl: defaultP.baseUrl,
    providers: aiProviders,
  })
})

app.use('/api/questions', questionsRouter)
app.use('/api/vocab', vocabRouter)
app.use('/api/xhs', xhsRouter)

app.listen(PORT, () => {
  console.log(`[kaogong-server] http://localhost:${PORT}`)
  const configuredNames = aiProviders.filter((p) => p.configured).map((p) => p.name)
  console.log(
    `[kaogong-server] AI ${anyAi ? `已配置: ${configuredNames.join('、')}` : '未配置，使用公共数据'}`,
  )
  if (!anyAi) {
    const envPath = path.join(serverRoot, '.env')
    const examplePath = path.join(serverRoot, '.env.example')
    if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
      console.warn(
        '[kaogong-server] 提示：API Key 请写在 server/.env（不是 .env.example）\n' +
          '  执行: cd server && cp .env.example .env  然后填入对应提供商的 Key',
      )
    }
  }
})
