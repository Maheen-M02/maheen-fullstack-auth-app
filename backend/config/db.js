const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      tls: true, // Enable TLS
      tlsAllowInvalidCertificates: true, // Use only for testing with self-signed certs
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:');
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
};

module.exports = connectDB;