#!/usr/bin/env node
/**
 * xAI Image Generator
 *
 * Usage:
 *   node scripts/generate-image.mjs "a photorealistic starship on the launch pad" starship-pad
 *   node scripts/generate-image.mjs "astronaut floating in space" astronaut-space
 *
 * Args:
 *   1: prompt (required) — description of the image to generate
 *   2: filename (optional) — name without extension (default: "generated-{timestamp}")
 *
 * Output: saves to public/images/generated/{filename}.png
 *
 * API key: reads from XAI_API_KEY env var or .env file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', 'generated');

// Load .env if it exists
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const API_KEY = process.env.XAI_API_KEY;
if (!API_KEY) {
  console.error('Error: XAI_API_KEY not set. Either:');
  console.error('  1. Create a .env file with XAI_API_KEY=your-key');
  console.error('  2. Set the env var: export XAI_API_KEY=your-key');
  process.exit(1);
}

const prompt = process.argv[2];
if (!prompt) {
  console.error('Usage: node scripts/generate-image.mjs "your prompt here" [filename]');
  process.exit(1);
}

const filename = process.argv[3] || `generated-${Date.now()}`;
const outputPath = path.join(OUTPUT_DIR, `${filename}.png`);

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log(`Generating image: "${prompt}"`);
console.log(`Output: public/images/generated/${filename}.png`);

try {
  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-imagine-image',
      prompt: prompt,
      n: 1,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`API Error (${response.status}):`, err);
    process.exit(1);
  }

  const data = await response.json();

  if (data.data && data.data[0] && data.data[0].b64_json) {
    const imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`\nImage saved: ${outputPath}`);
    console.log(`Use in HTML: /Infinita/images/generated/${filename}.png`);
    console.log(`Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
  } else if (data.data && data.data[0] && data.data[0].url) {
    // If API returns URL instead of base64
    console.log('Downloading from URL...');
    const imgResp = await fetch(data.data[0].url);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
    fs.writeFileSync(outputPath, imgBuffer);
    console.log(`\nImage saved: ${outputPath}`);
    console.log(`Use in HTML: /Infinita/images/generated/${filename}.png`);
    console.log(`Size: ${(imgBuffer.length / 1024).toFixed(1)} KB`);
  } else {
    console.error('Unexpected API response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
} catch (err) {
  console.error('Request failed:', err.message);
  process.exit(1);
}
