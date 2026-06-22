import { Database } from 'bun:sqlite'
import { createPatch } from 'diff'
import { logger } from '../utils/logger'

export interface User {
	id: number
	username: string
	password: string
	createdAt: string
}

export interface Document {
	id: number
	userId: number
	title: string
	filename: string
	content: string
	originalType: string
	createdAt: string
}

export interface DocumentVersion {
	id: number
	documentId: number
	userId: number
	content: string
	commitMessage: string | null
	diffPatch: string | null
	versionNum: number
	createdAt: string
}

export interface DocumentTag {
	id: number
	versionId: number
	tagName: string
	createdAt: string
}

export interface SearchResult {
	id: number
	title: string
	filename: string
	originalType: string
	createdAt: string
	snippet: string
}

/**
 * 中文分词：将中文字符逐字拆分，英文按词拆分
 * 用于存入 FTS5 索引，实现中英文混合搜索
 */
export function tokenizeForFTS(text: string): string {
	if (!text) return ''
	// 匹配中文字符、英文单词、数字
	const tokens = text.match(/[一-鿿]|[a-zA-Z]+|[0-9]+/g)
	return tokens ? tokens.join(' ') : ''
}

class DatabaseManager {
	private db: Database

	constructor() {
		this.db = new Database('docplatform.db')
		this.initTables()
	}

	private initTables() {
		logger.info('正在初始化数据库表...')
		try {
			this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )
      `)

			this.db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          title TEXT NOT NULL,
          filename TEXT NOT NULL,
          content TEXT NOT NULL,
          originalType TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )
      `)

			// FTS5 全文搜索虚拟表
			this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
          title,
          content,
          content_rowid='id'
        )
      `)

			// 版本管理表
			this.db.run(`
        CREATE TABLE IF NOT EXISTS document_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          documentId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          content TEXT NOT NULL,
          commitMessage TEXT,
          diffPatch TEXT,
          versionNum INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `)

			// 版本标签表
			this.db.run(`
        CREATE TABLE IF NOT EXISTS document_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          versionId INTEGER NOT NULL,
          tagName TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (versionId) REFERENCES document_versions(id) ON DELETE CASCADE
        )
      `)

			this.db.run(`
        INSERT OR IGNORE INTO users (id, username, password, createdAt)
        VALUES (1, 'test', 'test', '2024-01-01T00:00:00.000Z')
      `)
			logger.info('数据库表初始化成功')
		} catch (e) {
			logger.error('数据库表初始化失败', e)
			throw e
		}
	}

	// ==================== 用户方法 ====================

	createUser(username: string, password: string): User | null {
		logger.debug(`正在创建用户: ${username}`)
		try {
			const createdAt = new Date().toISOString()
			this.db.run(
				'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
				[username, password, createdAt]
			)
			const result = this.db.query<User, any[]>('SELECT * FROM users WHERE username = ?').get(username)
			if (result) {
				logger.info(`用户创建成功: ${username}`)
			}
			return result || null
		} catch (e) {
			logger.error(`用户创建失败: ${username}`, e)
			return null
		}
	}

	getUserByUsername(username: string): User | null {
		logger.debug(`根据用户名查询用户: ${username}`)
		try {
			const row = this.db.query<User, any[]>(
				'SELECT * FROM users WHERE username = ?'
			).get(username)
			if (row) {
				logger.debug(`找到用户: ${username}`)
			} else {
				logger.debug(`未找到用户: ${username}`)
			}
			return row || null
		} catch (e) {
			logger.error(`查询用户失败: ${username}`, e)
			return null
		}
	}

	getUserById(id: number): User | null {
		logger.debug(`根据ID查询用户: ${id}`)
		try {
			const row = this.db.query<User, any[]>(
				'SELECT * FROM users WHERE id = ?'
			).get(id)
			return row || null
		} catch (e) {
			logger.error(`根据ID查询用户失败: ${id}`, e)
			return null
		}
	}

	// ==================== 文档方法 ====================

	createDocument(userId: number, title: string, filename: string, content: string, originalType: string): Document | null {
		logger.debug(`正在创建文档: ${title} (用户ID: ${userId})`)
		try {
			const createdAt = new Date().toISOString()
			this.db.run(
				'INSERT INTO documents (userId, title, filename, content, originalType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
				[userId, title, filename, content, originalType, createdAt]
			)
			const result = this.db.query<Document, any[]>(
				'SELECT * FROM documents WHERE userId = ? AND title = ? ORDER BY createdAt DESC LIMIT 1'
			).get(userId, title)
			if (result) {
				// 同步更新 FTS 索引
				this.syncFTSInsert(result.id, title, content)
				logger.info(`文档创建成功: ${title}`)
			}
			return result || null
		} catch (e) {
			logger.error(`文档创建失败: ${title}`, e)
			return null
		}
	}

	getDocumentsByUserId(userId: number): Document[] {
		logger.debug(`查询用户的文档列表: ${userId}`)
		try {
			const rows = this.db.query<Document, any[]>(
				'SELECT * FROM documents WHERE userId = ? ORDER BY createdAt DESC'
			).all(userId)
			logger.debug(`找到 ${rows.length} 个文档`)
			return rows || []
		} catch (e) {
			logger.error(`查询用户文档失败: ${userId}`, e)
			return []
		}
	}

	getDocumentById(id: number): Document | null {
		logger.debug(`根据ID查询文档: ${id}`)
		try {
			const row = this.db.query<Document, any[]>(
				'SELECT * FROM documents WHERE id = ?'
			).get(id)
			return row || null
		} catch (e) {
			logger.error(`根据ID查询文档失败: ${id}`, e)
			return null
		}
	}

	deleteDocument(id: number, userId: number): boolean {
		logger.debug(`正在删除文档: ${id} (用户ID: ${userId})`)
		try {
			// 先删除 FTS 索引
			this.syncFTSDelete(id)
			const result = this.db.run(
				'DELETE FROM documents WHERE id = ? AND userId = ?',
				[id, userId]
			)
			const success = result.changes > 0
			if (success) {
				logger.info(`文档删除成功: ${id}`)
			} else {
				logger.warn(`文档不存在或不属于当前用户: ${id}`)
			}
			return success
		} catch (e) {
			logger.error(`文档删除失败: ${id}`, e)
			return false
		}
	}

	updateDocument(id: number, userId: number, content: string): boolean {
		logger.debug(`正在更新文档: ${id} (用户ID: ${userId})`)
		try {
			const result = this.db.run(
				'UPDATE documents SET content = ? WHERE id = ? AND userId = ?',
				[content, id, userId]
			)
			const success = result.changes > 0
			if (success) {
				// 同步更新 FTS 索引：先删除旧的，再插入新的
				const doc = this.getDocumentById(id)
				if (doc) {
					this.syncFTSUpdate(id, doc.title, content)
				}
				logger.info(`文档更新成功: ${id}`)
			} else {
				logger.warn(`文档不存在或不属于当前用户: ${id}`)
			}
			return success
		} catch (e) {
			logger.error(`文档更新失败: ${id}`, e)
			return false
		}
	}

	// ==================== FTS 索引同步方法 ====================

	private syncFTSInsert(docId: number, title: string, content: string) {
		try {
			const tokenizedTitle = tokenizeForFTS(title)
			const tokenizedContent = tokenizeForFTS(content)
			this.db.run(
				`INSERT INTO documents_fts(rowid, title, content) VALUES (?, ?, ?)`,
				[docId, tokenizedTitle, tokenizedContent]
			)
		} catch (e) {
			logger.error(`FTS 索引插入失败: ${docId}`, e)
		}
	}

	private syncFTSUpdate(docId: number, title: string, content: string) {
		try {
			// 先删除旧索引
			this.db.run(`DELETE FROM documents_fts WHERE rowid = ?`, [docId])
			// 插入新索引
			const tokenizedTitle = tokenizeForFTS(title)
			const tokenizedContent = tokenizeForFTS(content)
			this.db.run(
				`INSERT INTO documents_fts(rowid, title, content) VALUES (?, ?, ?)`,
				[docId, tokenizedTitle, tokenizedContent]
			)
		} catch (e) {
			logger.error(`FTS 索引更新失败: ${docId}`, e)
		}
	}

	private syncFTSDelete(docId: number) {
		try {
			this.db.run(`DELETE FROM documents_fts WHERE rowid = ?`, [docId])
		} catch (e) {
			logger.error(`FTS 索引删除失败: ${docId}`, e)
		}
	}

	// ==================== 搜索方法 ====================

	searchDocuments(userId: number, query: string, page: number = 1, pageSize: number = 20): { documents: SearchResult[]; total: number } {
		logger.debug(`搜索文档: userId=${userId}, query="${query}", page=${page}`)
		try {
			const tokenizedQuery = tokenizeForFTS(query)
			if (!tokenizedQuery.trim()) {
				return { documents: [], total: 0 }
			}

			// FTS5 搜索，使用 BM25 排序，返回高亮摘要
			const offset = (page - 1) * pageSize

			// 获取总数
			const countResult = this.db.query<{ total: number }, any[]>(
				`SELECT COUNT(*) as total
				 FROM documents_fts
				 JOIN documents ON documents_fts.rowid = documents.id
				 WHERE documents_fts MATCH ? AND documents.userId = ?`
			).get(tokenizedQuery, userId)

			const total = countResult?.total || 0

			// 获取分页结果，带高亮 snippet
			const results = this.db.query<SearchResult, any[]>(
				`SELECT
				   documents.id,
				   documents.title,
				   documents.filename,
				   documents.originalType,
				   documents.createdAt,
				   snippet(documents_fts, 1, '<mark>', '</mark>', '...', 32) as snippet
				 FROM documents_fts
				 JOIN documents ON documents_fts.rowid = documents.id
				 WHERE documents_fts MATCH ? AND documents.userId = ?
				 ORDER BY rank
				 LIMIT ? OFFSET ?`
			).all(tokenizedQuery, userId, pageSize, offset)

			logger.debug(`搜索完成: 找到 ${total} 条结果`)
			return { documents: results || [], total }
		} catch (e) {
			logger.error(`搜索失败: query="${query}"`, e)
			return { documents: [], total: 0 }
		}
	}

	// ==================== 版本管理方法 ====================

	createVersion(documentId: number, userId: number, content: string, commitMessage: string | null, diffPatch: string | null): DocumentVersion | null {
		logger.debug(`创建版本: documentId=${documentId}`)
		try {
			// 获取当前最新版本号
			const latest = this.db.query<{ maxNum: number | null }, any[]>(
				'SELECT MAX(versionNum) as maxNum FROM document_versions WHERE documentId = ?'
			).get(documentId)
			const versionNum = (latest?.maxNum || 0) + 1
			const createdAt = new Date().toISOString()

			this.db.run(
				`INSERT INTO document_versions (documentId, userId, content, commitMessage, diffPatch, versionNum, createdAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[documentId, userId, content, commitMessage, diffPatch, versionNum, createdAt]
			)

			const result = this.db.query<DocumentVersion, any[]>(
				'SELECT * FROM document_versions WHERE documentId = ? AND versionNum = ?'
			).get(documentId, versionNum)

			if (result) {
				logger.info(`版本创建成功: documentId=${documentId}, versionNum=${versionNum}`)
			}
			return result || null
		} catch (e) {
			logger.error(`版本创建失败: documentId=${documentId}`, e)
			return null
		}
	}

	getVersionsByDocumentId(documentId: number, page: number = 1, pageSize: number = 20): { versions: DocumentVersion[]; total: number } {
		logger.debug(`获取版本列表: documentId=${documentId}`)
		try {
			const countResult = this.db.query<{ total: number }, any[]>(
				'SELECT COUNT(*) as total FROM document_versions WHERE documentId = ?'
			).get(documentId)
			const total = countResult?.total || 0

			const offset = (page - 1) * pageSize
			const versions = this.db.query<DocumentVersion, any[]>(
				`SELECT * FROM document_versions
				 WHERE documentId = ?
				 ORDER BY versionNum DESC
				 LIMIT ? OFFSET ?`
			).all(documentId, pageSize, offset)

			return { versions: versions || [], total }
		} catch (e) {
			logger.error(`获取版本列表失败: documentId=${documentId}`, e)
			return { versions: [], total: 0 }
		}
	}

	getVersionById(versionId: number): DocumentVersion | null {
		logger.debug(`获取版本详情: versionId=${versionId}`)
		try {
			const row = this.db.query<DocumentVersion, any[]>(
				'SELECT * FROM document_versions WHERE id = ?'
			).get(versionId)
			return row || null
		} catch (e) {
			logger.error(`获取版本详情失败: versionId=${versionId}`, e)
			return null
		}
	}

	getPreviousVersion(documentId: number, versionNum: number): DocumentVersion | null {
		try {
			const row = this.db.query<DocumentVersion, any[]>(
				'SELECT * FROM document_versions WHERE documentId = ? AND versionNum < ? ORDER BY versionNum DESC LIMIT 1'
			).get(documentId, versionNum)
			return row || null
		} catch (e) {
			logger.error(`获取前一版本失败: documentId=${documentId}, versionNum=${versionNum}`, e)
			return null
		}
	}

	compareVersions(v1Id: number, v2Id: number): { v1: DocumentVersion | null; v2: DocumentVersion | null } {
		logger.debug(`对比版本: v1=${v1Id}, v2=${v2Id}`)
		try {
			const v1 = this.getVersionById(v1Id)
			const v2 = this.getVersionById(v2Id)
			return { v1, v2 }
		} catch (e) {
			logger.error(`对比版本失败: v1=${v1Id}, v2=${v2Id}`, e)
			return { v1: null, v2: null }
		}
	}

	rollbackToVersion(documentId: number, userId: number, versionId: number): DocumentVersion | null {
		logger.debug(`回滚到版本: documentId=${documentId}, versionId=${versionId}`)
		try {
			const targetVersion = this.getVersionById(versionId)
			if (!targetVersion) {
				logger.warn(`目标版本不存在: versionId=${versionId}`)
				return null
			}

			// 获取当前文档内容
			const currentDoc = this.getDocumentById(documentId)
			if (!currentDoc) {
				logger.warn(`文档不存在: documentId=${documentId}`)
				return null
			}

			// 统一行尾符后再 diff，避免 \r\n vs \n 导致每行都被标记为不同
			const normalizedCurrent = currentDoc.content.replace(/\r\n/g, '\n')
			const normalizedTarget = targetVersion.content.replace(/\r\n/g, '\n')
			const diffPatch = createPatch('document', normalizedCurrent, normalizedTarget)

			// 创建新版本（回滚版本）
			const newVersion = this.createVersion(
				documentId,
				userId,
				targetVersion.content,
				`回滚到版本 #${targetVersion.versionNum}`,
				diffPatch
			)

			// 更新文档内容
			this.db.run(
				'UPDATE documents SET content = ? WHERE id = ?',
				[targetVersion.content, documentId]
			)

			// 更新 FTS 索引
			if (currentDoc) {
				this.syncFTSUpdate(documentId, currentDoc.title, targetVersion.content)
			}

			logger.info(`回滚成功: documentId=${documentId} -> versionNum=${targetVersion.versionNum}`)
			return newVersion
		} catch (e) {
			logger.error(`回滚失败: documentId=${documentId}, versionId=${versionId}`, e)
			return null
		}
	}

	addVersionTag(versionId: number, tagName: string): DocumentTag | null {
		logger.debug(`添加版本标签: versionId=${versionId}, tagName=${tagName}`)
		try {
			const createdAt = new Date().toISOString()
			this.db.run(
				'INSERT INTO document_tags (versionId, tagName, createdAt) VALUES (?, ?, ?)',
				[versionId, tagName, createdAt]
			)
			const result = this.db.query<DocumentTag, any[]>(
				'SELECT * FROM document_tags WHERE versionId = ? AND tagName = ?'
			).get(versionId, tagName)
			if (result) {
				logger.info(`版本标签添加成功: versionId=${versionId}, tagName=${tagName}`)
			}
			return result || null
		} catch (e) {
			logger.error(`版本标签添加失败: versionId=${versionId}`, e)
			return null
		}
	}

	getVersionTags(versionId: number): DocumentTag[] {
		try {
			const tags = this.db.query<DocumentTag, any[]>(
				'SELECT * FROM document_tags WHERE versionId = ? ORDER BY createdAt DESC'
			).all(versionId)
			return tags || []
		} catch (e) {
			logger.error(`获取版本标签失败: versionId=${versionId}`, e)
			return []
		}
	}
}

export const db = new DatabaseManager()
