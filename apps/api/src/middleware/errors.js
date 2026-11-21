export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : err.message });
}

/** Placeholder cho các route sẽ được làm ở nhánh feature tương ứng. */
export const notImplemented = (branch) => (req, res) =>
  res.status(501).json({ error: 'Not implemented yet', branch });
