import { Database } from 'bun:sqlite'
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

	createUser(username: string, password: string): User | null {
		logger.debug(`正在创建用户: ${username}`)
		try {
			const createdAt = new Date().toISOString()
			this.db.run(
				'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
				[username, password, createdAt]
			)
			const result = this.db.query<User>('SELECT * FROM users WHERE username = ?').get(username)
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
			const row = this.db.query<User>(
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
			const row = this.db.query<User>(
				'SELECT * FROM users WHERE id = ?'
			).get(id)
			return row || null
		} catch (e) {
			logger.error(`根据ID查询用户失败: ${id}`, e)
			return null
		}
	}

	createDocument(userId: number, title: string, filename: string, content: string, originalType: string): Document | null {
		logger.debug(`正在创建文档: ${title} (用户ID: ${userId})`)
		try {
			const createdAt = new Date().toISOString()
			this.db.run(
				'INSERT INTO documents (userId, title, filename, content, originalType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
				[userId, title, filename, content, originalType, createdAt]
			)
			const result = this.db.query<Document>(
				'SELECT * FROM documents WHERE userId = ? AND title = ? ORDER BY createdAt DESC LIMIT 1'
			).get(userId, title)
			if (result) {
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
			const rows = this.db.query<Document>(
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
			const row = this.db.query<Document>(
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
}

export const db = new DatabaseManager()