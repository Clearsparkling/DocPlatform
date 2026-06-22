import { createPatch } from 'diff'
import { db, type DocumentVersion } from '../db/database'
import { logger } from '../utils/logger'

/**
 * 统一行尾符为 LF（\n），避免 \r\n vs \n 导致整行误判
 */
function normalizeLineEndings(text: string): string {
	return text.replace(/\r\n/g, '\n')
}

/**
 * 使用 diff 库的 createPatch 生成标准 unified diff 格式
 * 包含 @@ hunk 头，diff2html 可正确解析
 */
function generateDiffPatch(oldContent: string, newContent: string): string {
	// 统一行尾符后再 diff，避免 \r\n vs \n 导致每行都被标记为不同
	const normalizedOld = normalizeLineEndings(oldContent)
	const normalizedNew = normalizeLineEndings(newContent)
	const patch = createPatch('document', normalizedOld, normalizedNew)
	return patch
}

/**
 * 文档更新时自动创建版本记录
 * @param documentId 文档ID
 * @param userId 用户ID
 * @param newContent 新内容
 * @param oldContent 旧内容
 * @param commitMessage 提交说明（可选）
 * @returns 创建的版本记录，如果内容无变化则返回 null
 */
export function createVersionOnUpdate(
	documentId: number,
	userId: number,
	newContent: string,
	oldContent: string,
	commitMessage?: string
): DocumentVersion | null {
	logger.info(`检查是否需要创建版本: documentId=${documentId}`)

	// 内容无变化则跳过
	if (newContent === oldContent) {
		logger.debug(`文档内容无变化，跳过版本创建: documentId=${documentId}`)
		return null
	}

	// 计算 diff（标准 unified diff 格式）
	const diffPatch = generateDiffPatch(oldContent, newContent)

	// 创建版本记录
	const version = db.createVersion(
		documentId,
		userId,
		newContent,
		commitMessage || null,
		diffPatch
	)

	if (version) {
		logger.info(`版本自动创建成功: documentId=${documentId}, versionNum=${version.versionNum}`)
	}

	return version
}

/**
 * 获取版本 diff 信息
 * @param versionId 版本ID
 * @returns 版本信息和 diff
 */
export function getVersionDiff(versionId: number): {
	version: DocumentVersion | null
	diffPatch: string | null
	previousVersion: DocumentVersion | null
} {
	const version = db.getVersionById(versionId)
	if (!version) {
		return { version: null, diffPatch: null, previousVersion: null }
	}

	const previousVersion = db.getPreviousVersion(version.documentId, version.versionNum)

	return {
		version,
		diffPatch: version.diffPatch,
		previousVersion
	}
}

/**
 * 对比两个版本的差异
 * @param v1Id 版本1 ID
 * @param v2Id 版本2 ID
 * @returns 两个版本信息和它们之间的 diff
 */
export function compareVersions(v1Id: number, v2Id: number): {
	v1: DocumentVersion | null
	v2: DocumentVersion | null
	diffPatch: string | null
} {
	const { v1, v2 } = db.compareVersions(v1Id, v2Id)

	if (!v1 || !v2) {
		return { v1, v2, diffPatch: null }
	}

	// 计算两个版本之间的 diff（标准 unified diff 格式）
	const diffPatch = generateDiffPatch(v1.content, v2.content)

	return { v1, v2, diffPatch }
}

/**
 * 回滚到指定版本
 * @param documentId 文档ID
 * @param userId 用户ID
 * @param versionId 目标版本ID
 * @returns 回滚操作创建的新版本
 */
export function rollbackToVersion(
	documentId: number,
	userId: number,
	versionId: number
): DocumentVersion | null {
	logger.info(`执行回滚: documentId=${documentId}, versionId=${versionId}`)
	return db.rollbackToVersion(documentId, userId, versionId)
}

/**
 * 为版本添加标签
 * @param versionId 版本ID
 * @param tagName 标签名称
 */
export function addVersionTag(versionId: number, tagName: string) {
	return db.addVersionTag(versionId, tagName)
}

/**
 * 获取版本列表（带标签）
 * @param documentId 文档ID
 * @param page 页码
 * @param pageSize 每页数量
 */
export function getVersionList(documentId: number, page: number = 1, pageSize: number = 20) {
	const result = db.getVersionsByDocumentId(documentId, page, pageSize)

	// 为每个版本附加标签信息
	const versionsWithTags = result.versions.map(v => ({
		...v,
		tags: db.getVersionTags(v.id)
	}))

	return {
		versions: versionsWithTags,
		total: result.total,
		page,
		pageSize
	}
}
