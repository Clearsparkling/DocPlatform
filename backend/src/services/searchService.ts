import { db, tokenizeForFTS, type SearchResult } from '../db/database'
import { logger } from '../utils/logger'

export interface SearchResponse {
	documents: SearchResult[]
	total: number
	page: number
	pageSize: number
}

/**
 * 检测输入文本的语言
 * 如果包含中文字符则返回 'zh'，否则返回 'en'
 */
function detectLanguage(text: string): 'zh' | 'en' {
	const chineseRegex = /[一-鿿]/
	return chineseRegex.test(text) ? 'zh' : 'en'
}

/**
 * 搜索文档
 * @param userId 当前用户ID
 * @param query 搜索关键词
 * @param lang 语言偏好：'zh' | 'en' | 'auto'
 * @param page 页码
 * @param pageSize 每页数量
 */
export function searchDocuments(
	userId: number,
	query: string,
	lang: 'zh' | 'en' | 'auto' = 'auto',
	page: number = 1,
	pageSize: number = 20
): SearchResponse {
	logger.info(`搜索请求: userId=${userId}, query="${query}", lang=${lang}, page=${page}`)

	// 语言检测
	const detectedLang = lang === 'auto' ? detectLanguage(query) : lang
	logger.debug(`检测语言: ${detectedLang}`)

	// 对搜索词进行分词处理
	const tokenizedQuery = tokenizeForFTS(query)
	if (!tokenizedQuery.trim()) {
		return { documents: [], total: 0, page, pageSize }
	}

	// 调用数据库搜索
	const result = db.searchDocuments(userId, tokenizedQuery, page, pageSize)

	return {
		documents: result.documents,
		total: result.total,
		page,
		pageSize
	}
}
