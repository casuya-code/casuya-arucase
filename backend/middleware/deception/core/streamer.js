function createSlowStream(res, { chunkBytes = 1048576, intervalMs = 100 } = {}) {
  const chunk = Buffer.alloc(chunkBytes, 0xde);
  let interval = null;

  const writeChunk = () => {
    if (!res.writableEnded && res.write(chunk) === false) {
      clearInterval(interval);
      interval = null;
    }
  };

  interval = setInterval(writeChunk, intervalMs);
  res.on('drain', () => {
    if (interval === null) interval = setInterval(writeChunk, intervalMs);
  });
  res.on('close', () => clearInterval(interval));

  return () => clearInterval(interval);
}

module.exports = { createSlowStream };
