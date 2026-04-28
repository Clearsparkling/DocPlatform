export interface User {
	id: number
	username: string
	password: string
	createdAt: Date
}

export const users: User[] = [
	{
		id: 1,
		username: 'test',
		password: 'test',
		createdAt: new Date('2026-01-01')
	}
]