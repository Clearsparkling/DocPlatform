import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { Elysia, t } from 'elysia'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { db } from './db/database'
import { logger } from './utils/logger'
import { searchDocuments } from './services/searchService'
import { createVersionOnUpdate, getVersionDiff, compareVersions, rollbackToVersion, addVersionTag, getVersionList } from './services/versionService'

// 上传文件存储目录
const UPLOADS_DIR = join(import.meta.dir, '..', '..', 'uploads')
logger.info(`上传文件目录: ${UPLOADS_DIR}`)
if (!existsSync(UPLOADS_DIR)) {
	mkdirSync(UPLOADS_DIR, { recursive: true })
	logger.info(`创建上传目录: ${UPLOADS_DIR}`)
}

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

// ==================== 认证路由 ====================

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

// ==================== 文档路由 ====================

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

	// 为新上传的文档创建初始版本
	db.createVersion(newDocument.id, user.id, markdownContent, '初始版本', null)

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

// 搜索路由必须在 /:id 之前，否则 "search" 会被当作 :id 匹配
app.get('/documents/search', async ({ query, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		logger.warn('搜索请求缺少认证头')
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		logger.warn('搜索请求 token 无效')
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		logger.warn(`搜索 - 用户不存在: ${decoded.username}`)
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const { q, lang, page, pageSize } = query as { q: string; lang?: string; page?: string; pageSize?: string }

	if (!q || q.trim() === '') {
		set.status = 400
		return { success: false, message: '搜索关键词不能为空' }
	}

	const pageNum = parseInt(page || '1') || 1
	const pageSizeNum = parseInt(pageSize || '20') || 20
	const langValue = (lang || 'auto') as 'zh' | 'en' | 'auto'

	try {
		const result = searchDocuments(user.id, q, langValue, pageNum, pageSizeNum)
		return { success: true, data: result }
	} catch (e) {
		logger.error(`搜索失败: query="${q}"`, e)
		set.status = 500
		return { success: false, message: '搜索失败' }
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

	// 获取旧内容用于版本对比
	const oldDocument = db.getDocumentById(docId)
	if (!oldDocument || oldDocument.userId !== user.id) {
		logger.warn(`更新文档失败 - 文档不存在或不属于当前用户: ${docId}`)
		set.status = 404
		return { success: false, message: '更新失败' }
	}

	const oldContent = oldDocument.content

	// 更新文档内容
	const success = db.updateDocument(docId, user.id, content)
	if (!success) {
		logger.warn(`更新文档失败 - 文档不存在或不属于当前用户: ${docId}`)
		set.status = 404
		return { success: false, message: '更新失败' }
	}

	// 自动创建版本记录（内容有变化时）
	try {
		createVersionOnUpdate(docId, user.id, content, oldContent)
	} catch (e) {
		// 版本创建失败不影响文档保存
		logger.error(`版本创建失败（不影响文档保存）: ${docId}`, e)
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

// ==================== 图片上传与访问 ====================

// 上传文档关联的图片
app.post('/documents/:id/images', async ({ params, request, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	if (isNaN(docId)) {
		set.status = 400
		return { success: false, message: '无效的文档ID' }
	}

	// 验证文档属于当前用户
	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	const formData = await request.formData()
	const file = formData.get('image')

	if (!file || !(file instanceof File)) {
		set.status = 400
		return { success: false, message: '请选择要上传的图片' }
	}

	// 验证文件类型
	const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
	if (!allowedTypes.includes(file.type)) {
		set.status = 400
		return { success: false, message: '仅支持 JPG/PNG/GIF/WebP/SVG 格式的图片' }
	}

	// 创建文档专属目录
	const docUploadDir = join(UPLOADS_DIR, String(docId))
	if (!existsSync(docUploadDir)) {
		mkdirSync(docUploadDir, { recursive: true })
	}

	// 生成唯一文件名
	const ext = extname(file.name) || '.png'
	const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
	const filePath = join(docUploadDir, uniqueName)

	// 保存文件
	const arrayBuffer = await file.arrayBuffer()
	writeFileSync(filePath, Buffer.from(arrayBuffer))

	const imageUrl = `/uploads/${docId}/${uniqueName}`
	logger.info(`图片上传成功: ${imageUrl}`)

	return {
		success: true,
		data: { url: imageUrl, filename: file.name }
	}
})

// 静态文件服务 - 访问上传的图片
app.get('/uploads/:docId/:filename', async ({ params, set }) => {
	const { docId, filename } = params
	const filePath = join(UPLOADS_DIR, docId, filename)

	if (!existsSync(filePath)) {
		set.status = 404
		return { success: false, message: '文件不存在' }
	}

	// 根据扩展名设置 Content-Type
	const ext = extname(filename).toLowerCase()
	const mimeTypes: Record<string, string> = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml',
	}

	const mimeType = mimeTypes[ext] || 'application/octet-stream'
	const fileData = readFileSync(filePath)

	set.headers['Content-Type'] = mimeType
	set.headers['Cache-Control'] = 'public, max-age=31536000'
	return fileData
})

// ==================== 版本管理路由 ====================

app.get('/documents/:id/versions', async ({ params, query, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	if (isNaN(docId)) {
		set.status = 400
		return { success: false, message: '无效的文档ID' }
	}

	// 验证文档属于当前用户
	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	const { page, pageSize } = query as { page?: string; pageSize?: string }
	const pageNum = parseInt(page || '1') || 1
	const pageSizeNum = parseInt(pageSize || '20') || 20

	try {
		const result = getVersionList(docId, pageNum, pageSizeNum)
		return { success: true, data: result }
	} catch (e) {
		logger.error(`获取版本列表失败: documentId=${docId}`, e)
		set.status = 500
		return { success: false, message: '获取版本列表失败' }
	}
})

// compare 路由必须在 /:versionId 之前，否则 "compare" 会被当作 :versionId 匹配
app.get('/documents/:id/versions/compare', async ({ params, query, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	const { v1, v2 } = query as { v1?: string; v2?: string }

	if (isNaN(docId) || !v1 || !v2) {
		set.status = 400
		return { success: false, message: '参数不完整' }
	}

	const v1Id = parseInt(v1)
	const v2Id = parseInt(v2)

	if (isNaN(v1Id) || isNaN(v2Id)) {
		set.status = 400
		return { success: false, message: '无效的版本ID' }
	}

	// 验证文档属于当前用户
	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	try {
		const result = compareVersions(v1Id, v2Id)

		if (!result.v1 || !result.v2) {
			set.status = 404
			return { success: false, message: '版本不存在' }
		}

		// 验证版本属于该文档
		if (result.v1.documentId !== docId || result.v2.documentId !== docId) {
			set.status = 400
			return { success: false, message: '版本不属于该文档' }
		}

		return {
			success: true,
			data: {
				v1: result.v1,
				v2: result.v2,
				diffPatch: result.diffPatch
			}
		}
	} catch (e) {
		logger.error(`对比版本失败: v1=${v1Id}, v2=${v2Id}`, e)
		set.status = 500
		return { success: false, message: '对比版本失败' }
	}
})

app.get('/documents/:id/versions/:versionId', async ({ params, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	const versionId = parseInt(params.versionId)

	if (isNaN(docId) || isNaN(versionId)) {
		set.status = 400
		return { success: false, message: '无效的ID' }
	}

	// 验证文档属于当前用户
	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	try {
		const version = db.getVersionById(versionId)
		if (!version || version.documentId !== docId) {
			set.status = 404
			return { success: false, message: '版本不存在' }
		}

		const tags = db.getVersionTags(versionId)
		return { success: true, data: { ...version, tags } }
	} catch (e) {
		logger.error(`获取版本详情失败: versionId=${versionId}`, e)
		set.status = 500
		return { success: false, message: '获取版本详情失败' }
	}
})

app.get('/documents/:id/versions/:versionId/diff', async ({ params, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	const versionId = parseInt(params.versionId)

	if (isNaN(docId) || isNaN(versionId)) {
		set.status = 400
		return { success: false, message: '无效的ID' }
	}

	// 验证文档属于当前用户
	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	try {
		const result = getVersionDiff(versionId)
		if (!result.version || result.version.documentId !== docId) {
			set.status = 404
			return { success: false, message: '版本不存在' }
		}

		return {
			success: true,
			data: {
				version: result.version,
				diffPatch: result.diffPatch,
				previousVersion: result.previousVersion
			}
		}
	} catch (e) {
		logger.error(`获取版本 diff 失败: versionId=${versionId}`, e)
		set.status = 500
		return { success: false, message: '获取版本 diff 失败' }
	}
})

app.post('/documents/:id/versions/:versionId/rollback', async ({ params, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	const versionId = parseInt(params.versionId)

	if (isNaN(docId) || isNaN(versionId)) {
		set.status = 400
		return { success: false, message: '无效的ID' }
	}

	// 验证文档属于当前用户
	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	try {
		const newVersion = rollbackToVersion(docId, user.id, versionId)
		if (!newVersion) {
			set.status = 404
			return { success: false, message: '回滚失败，版本不存在' }
		}

		return {
			success: true,
			data: newVersion,
			message: '回滚成功'
		}
	} catch (e) {
		logger.error(`回滚失败: documentId=${docId}, versionId=${versionId}`, e)
		set.status = 500
		return { success: false, message: '回滚失败' }
	}
})

app.post('/documents/:id/versions/:versionId/tag', async ({ params, body, headers, set, jwt }) => {
	const authHeader = headers.authorization
	if (!authHeader) {
		set.status = 401
		return { success: false, message: '未登录' }
	}

	const token = authHeader.replace('Bearer ', '')
	const decoded = await jwt.verify(token)

	if (!decoded) {
		set.status = 401
		return { success: false, message: '无效的 token' }
	}

	const user = db.getUserByUsername(decoded.username)
	if (!user) {
		set.status = 404
		return { success: false, message: '用户不存在' }
	}

	const docId = parseInt(params.id)
	const versionId = parseInt(params.versionId)

	if (isNaN(docId) || isNaN(versionId)) {
		set.status = 400
		return { success: false, message: '无效的ID' }
	}

	// 验证文档属于当前用户
	const document = db.getDocumentById(docId)
	if (!document || document.userId !== user.id) {
		set.status = 404
		return { success: false, message: '文档不存在' }
	}

	const { tagName } = body as { tagName: string }
	if (!tagName || tagName.trim() === '') {
		set.status = 400
		return { success: false, message: '标签名称不能为空' }
	}

	// 验证版本属于该文档
	const version = db.getVersionById(versionId)
	if (!version || version.documentId !== docId) {
		set.status = 404
		return { success: false, message: '版本不存在' }
	}

	try {
		const tag = addVersionTag(versionId, tagName.trim())
		if (!tag) {
			set.status = 500
			return { success: false, message: '添加标签失败' }
		}

		return { success: true, data: tag, message: '标签添加成功' }
	} catch (e) {
		logger.error(`添加标签失败: versionId=${versionId}`, e)
		set.status = 500
		return { success: false, message: '添加标签失败' }
	}
})

const PORT = 3000
logger.info(`正在启动 Elysia 服务器: http://localhost:${PORT}`)
app.listen(PORT, () => logger.info(`Elysia 服务器运行中: http://localhost:${PORT}`))
