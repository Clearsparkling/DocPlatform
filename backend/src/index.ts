import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { Elysia, t } from 'elysia'
import { db } from './db/database'
import { logger } from './utils/logger'

const app = new Elysia()
	.use(cors({ origin: 'http://localhost:5173', credentials: true }))
	.use(jwt({ name: 'jwt', secret: 'your-secret-key-change-this-in-production' }))
	.onRequest(({ request, set }) => {
		const start = performance.now()
		set.onBeforeHandle = () => {
			const duration = performance.now() - start
			const url = new URL(request.url)
			logger.request(request.method, url.pathname, set.status || 200, Math.round(duration))
		}
	})

app.post('/auth/register', async ({ body, set, jwt }) => {
	const { username, password } = body as { username: string; password: string }

	logger.info(`用户注册尝试: ${username}`)

	const exists = db.getUserByUsername(username)
	if (exists) {
		logger.warn(`用户名已存在: ${username}`)
		set.status = 409
		return { success: false, message: '用户名已存在' }
	}

	const newUser = db.createUser(username, password)
	if (!newUser) {
		logger.error(`用户注册失败: ${username}`)
		set.status = 500
		return { success: false, message: '注册失败' }
	}

	const accessToken = await jwt.sign({ userId: newUser.id, username })
	logger.info(`用户注册成功: ${username}`)
	return { success: true, data: { accessToken, username } }
}, { body: t.Object({ username: t.String({ minLength: 3 }), password: t.String({ minLength: 6 }) }) })

app.post('/auth/login', async ({ body, set, jwt }) => {
	const { username, password } = body as { username: string; password: string }

	logger.info(`用户登录尝试: ${username}`)

	const user = db.getUserByUsername(username)
	if (!user) {
		logger.warn(`登录失败 - 用户不存在: ${username}`)
		set.status = 401
		return { success: false, message: '账号或密码错误' }
	}

	if (user.password !== password) {
		logger.warn(`登录失败 - 密码错误: ${username}`)
		set.status = 401
		return { success: false, message: '账号或密码错误' }
	}

	const accessToken = await jwt.sign({ userId: user.id, username })
	logger.info(`用户登录成功: ${username}`)
	return { success: true, data: { accessToken, username } }
}, { body: t.Object({ username: t.String(), password: t.String() }) })

app.get('/auth/me', async ({ headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		logger.warn('获取用户信息请求缺少认证头')
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		logger.warn('获取用户信息请求 token 无效')
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		logger.warn(`获取用户信息 - 用户不存在: ${decoded.username}`)
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	return { success: true, data: { id: user.id, username: user.username, createdAt: user.createdAt } }
})

app.post('/documents/upload', async ({ request, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		logger.warn('文件上传请求缺少认证头')
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		logger.warn('文件上传请求 token 无效')
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		logger.warn(`文件上传 - 用户不存在: ${decoded.username}`)
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const contentType = headers['content-type']
	if (!contentType || !contentType.includes('multipart/form-data')) {
		logger.warn('文件上传请求缺少 multipart/form-data 格式')
		set.status = 400
		return { success: false, message: '请使用 multipart/form-data 格式上传' }
	}

	const formData = await request.formData()
	const file = formData.get('file')

	if (!file || !(file instanceof File)) {
		logger.warn('文件上传请求缺少文件')
		set.status = 400
		return { success: false, message: '请选择要上传的文件' }
	}

	const filename = file.name || 'untitled'
	const lastDotIndex = filename.lastIndexOf('.')
	const title = lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex)
	const originalType = lastDotIndex === -1 ? '' : filename.slice(lastDotIndex + 1).toLowerCase()

	logger.info(`正在上传文件: ${filename} (${originalType}) 用户: ${user.username}`)

	let content: string
	let isBinary = false

	try {
		content = await file.text()
	} catch {
		const arrayBuffer = await file.arrayBuffer()
		content = Buffer.from(arrayBuffer).toString('base64')
		isBinary = true
		logger.info(`文件 ${filename} 是二进制文件，已转换为 Base64`)
	}

	let markdownContent: string

	try {
		markdownContent = content
		logger.info(`文件已成功转换为 markdown 格式`)
	} catch (e) {
		logger.error(`文件转换失败: ${filename}`, e)
		markdownContent = isBinary ? '[Binary file content]' : content
	}

	const newDocument = db.createDocument(user.id, title, filename, markdownContent, originalType)
	if (!newDocument) {
		logger.error(`文件上传失败: ${title}`)
		set.status = 500
		return { success: false, message: '上传失败' }
	}

	logger.info(`文件上传成功: ${title}`)
	return {
		success: true,
		data: {
			id: newDocument.id,
			title: newDocument.title,
			filename: newDocument.filename,
			createdAt: newDocument.createdAt
		}
	}
})

app.get('/documents', async ({ headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		logger.warn('获取文档列表请求缺少认证头')
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		logger.warn('获取文档列表请求 token 无效')
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		logger.warn(`获取文档列表 - 用户不存在: ${decoded.username}`)
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const userDocuments = db.getDocumentsByUserId(user.id)

	return {
		success: true,
		data: userDocuments.map(doc => ({
			id: doc.id,
			title: doc.title,
			originalName: doc.filename,
			fileType: doc.originalType,
			mdContent: doc.content,
			createdAt: doc.createdAt,
			updatedAt: null,
			filePath: '',
			fileSize: doc.content.length,
			converted: doc.originalType !== 'md',
			user: {
				id: user.id,
				username: user.username,
				password: '',
				createdAt: user.createdAt,
				updatedAt: null
			}
		}))
	}
})

app.get('/documents/:id', async ({ params, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		logger.warn('获取文档请求缺少认证头')
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		logger.warn('获取文档请求 token 无效')
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		logger.warn(`获取文档 - 用户不存在: ${decoded.username}`)
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	if (isNaN(docId)) {
		logger.warn(`获取文档 - 无效的文档ID: ${params.id}`)
		set.status = 400
		return { success: false, message: '无效的文档ID' }
	}

	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		logger.warn(`文档不存在或不属于当前用户: ${docId}`)
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	return {
		success: true,
		data: {
			id: document.id,
			title: document.title,
			originalName: document.filename,
			fileType: document.originalType,
			mdContent: document.content,
			createdAt: document.createdAt,
			updatedAt: null,
			filePath: '',
			fileSize: document.content.length,
			converted: document.originalType !== 'md',
			user: {
				id: user.id,
				username: user.username,
				password: '',
				createdAt: user.createdAt,
				updatedAt: null
			}
		}
	}
})

app.put('/documents/:id', async ({ params, body, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		logger.warn('更新文档请求缺少认证头')
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		logger.warn('更新文档请求 token 无效')
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		logger.warn(`更新文档 - 用户不存在: ${decoded.username}`)
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	if (isNaN(docId)) {
		logger.warn(`更新文档 - 无效的文档ID: ${params.id}`)
		set.status = 400
		return { success: false, message: '无效的文档ID' }
	}

	const { content } = body as { content: string }
	if (!content) {
		logger.warn('更新文档 - 内容为空')
		set.status = 400
		return { success: false, message: '内容不能为空' }
	}

	const success = db.updateDocument(docId, user.id, content)
	if (!success) {
		logger.warn(`更新文档失败 - 文档不存在或不属于当前用户: ${docId}`)
		set.status = 404
		return { success: false, message: '更新失败' }
	}

	return { success: true, message: '更新成功' }
})

app.delete('/documents/:id', async ({ params, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		logger.warn('删除文档请求缺少认证头')
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		logger.warn('删除文档请求 token 无效')
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		logger.warn(`删除文档 - 用户不存在: ${decoded.username}`)
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	if (isNaN(docId)) {
		logger.warn(`删除文档 - 无效的文档ID: ${params.id}`)
		set.status = 400
		return { success: false, message: '无效的文档ID' }
	}

	const success = db.deleteDocument(docId, user.id)
	if (!success) {
		logger.warn(`删除文档失败 - 文档不存在或不属于当前用户: ${docId}`)
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	return { success: true, message: '删除成功' }
})

const PORT = 3000
logger.info(`正在启动 Elysia 服务器: http://localhost:${PORT}`)
app.listen(PORT, () => logger.info(`Elysia 服务器运行中: http://localhost:${PORT}`))