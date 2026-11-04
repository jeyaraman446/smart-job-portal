const fs = require('fs');
const crypto = require('crypto');
const pdf = require('pdf-parse');

exports.hashFile = filePath => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch (err) {
    console.error('Error generating file hash:', err);
    return null;
  }
};

exports.hashBuffer = buffer => {
  try {
    if (!buffer) return null;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  } catch (err) {
    console.error('Error generating buffer hash:', err);
    return null;
  }
};

exports.parsePdfBuffer = async (filePathOrBuffer) => {
  try {
    let buffer;
    if (Buffer.isBuffer(filePathOrBuffer)) {
      buffer = filePathOrBuffer;
    } else if (typeof filePathOrBuffer === 'string' && fs.existsSync(filePathOrBuffer)) {
      buffer = fs.readFileSync(filePathOrBuffer);
    } else {
      return '';
    }
    const parsed = await pdf(buffer);
    return parsed.text || '';
  } catch (err) {
    console.warn('PDF parse error:', err.message);
    return '';
  }
};
