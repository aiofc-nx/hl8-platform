// Debug script to test environment variable loading
import { dotenvLoader } from './dist/lib/loader/index.js';

// Set environment variables
process.env.NAME = "Test App";
process.env.VERSION = "1.0.0";
process.env.PORT = "3000";
process.env.DATABASE__HOST = "localhost";
process.env.DATABASE__PORT = "5432";
process.env.DATABASE__USERNAME = "testuser";
process.env.DATABASE__PASSWORD = "testpass";

console.log("Environment variables:", Object.keys(process.env).filter(k =>
  k === 'NAME' || k === 'VERSION' || k === 'PORT' || k.startsWith('DATABASE__')
));

const loader = dotenvLoader({ separator: "__" });
const config = loader();

console.log("Config from dotenv loader:", JSON.stringify(config, null, 2));
