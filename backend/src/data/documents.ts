export interface Document {
	id: number
	userId: number
	title: string
	filename: string
	content: string
	originalType: string
	createdAt: Date
}

export const documents: Document[] = []