class HttpError extends Error {
  static from (error: unknown, statusCode: number) {
    let message = 'Unknown Error'
    if (error instanceof Error) message = error.message
    return new HttpError(message, statusCode)
  }

  statusCode: number

  constructor (message: string, statusCode: number = 500, options?: ErrorOptions | undefined) {
    super(message, options)
    this.statusCode = statusCode
  }
}

export default HttpError
