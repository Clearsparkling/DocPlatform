class Logger {
	private getTimestamp(): string {
		return new Date().toISOString()
	}

	private formatMessage(level: string, message: string, data?: any): string {
		const timestamp = this.getTimestamp()
		const dataStr = data ? ` | ${JSON.stringify(data)}` : ''
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`
	}

	info(message: string, data?: any): void {
		console.log(this.formatMessage('INFO', message, data))
	}

	error(message: string, error?: any): void {
		console.error(this.formatMessage('ERROR', message, error?.message || error))
	}

	warn(message: string, data?: any): void {
		console.warn(this.formatMessage('WARN', message, data))
	}

	debug(message: string, data?: any): void {
		if (process.env.NODE_ENV !== 'production') {
			console.debug(this.formatMessage('DEBUG', message, data))
		}
	}

	request(method: string, path: string, status: number, duration?: number): void {
		const durationStr = duration ? ` (${duration}ms)` : ''
		const statusColor = status >= 200 && status < 300 ? '\x1b[32m' :
			status >= 400 ? '\x1b[31m' : '\x1b[33m'
		const resetColor = '\x1b[0m'
		console.log(`[${this.getTimestamp()}] [REQUEST] ${method} ${path} ${statusColor}${status}${resetColor}${durationStr}`)
	}
}

export const logger = new Logger()