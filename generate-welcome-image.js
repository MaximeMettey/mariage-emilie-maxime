const sharp = require('sharp');
const path = require('path');

// Créer une belle image de bienvenue
const width = 1200;
const height = 800;

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b1538;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6b1029;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b1538;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>

  <!-- Decorative border -->
  <rect x="40" y="40" width="${width-80}" height="${height-80}"
        fill="none" stroke="#d4af37" stroke-width="2" opacity="0.5"/>
  <rect x="50" y="50" width="${width-100}" height="${height-100}"
        fill="none" stroke="#d4af37" stroke-width="1" opacity="0.3"/>

  <!-- Heart decoration top -->
  <path d="M ${width/2} 150
           C ${width/2} 140, ${width/2-10} 130, ${width/2-20} 130
           C ${width/2-35} 130, ${width/2-40} 140, ${width/2-40} 150
           C ${width/2-40} 165, ${width/2} 180, ${width/2} 200
           C ${width/2} 180, ${width/2+40} 165, ${width/2+40} 150
           C ${width/2+40} 140, ${width/2+35} 130, ${width/2+20} 130
           C ${width/2+10} 130, ${width/2} 140, ${width/2} 150 Z"
        fill="#d4af37" opacity="0.8"/>

  <!-- Main text -->
  <text x="${width/2}" y="280"
        font-family="serif" font-size="72" font-weight="300"
        fill="#ffffff" text-anchor="middle" letter-spacing="4">
    Émilie &amp; Maxime
  </text>

  <!-- Date -->
  <text x="${width/2}" y="360"
        font-family="serif" font-size="36" font-weight="300"
        fill="#d4af37" text-anchor="middle" letter-spacing="3">
    8 Novembre 2025
  </text>

  <!-- Subtitle -->
  <text x="${width/2}" y="480"
        font-family="serif" font-size="32" font-weight="300"
        fill="#ffffff" text-anchor="middle" opacity="0.9">
    Merci d'être venus !
  </text>

  <!-- Decorative line -->
  <line x1="${width/2-150}" y1="420" x2="${width/2+150}" y2="420"
        stroke="#d4af37" stroke-width="1" opacity="0.5"/>

  <!-- Location -->
  <text x="${width/2}" y="580"
        font-family="serif" font-size="28" font-weight="300"
        fill="#d4af37" text-anchor="middle" letter-spacing="2" opacity="0.8">
    Château de Villersexel
  </text>

  <!-- Decorative flourish bottom -->
  <circle cx="${width/2}" cy="680" r="3" fill="#d4af37" opacity="0.6"/>
  <circle cx="${width/2-20}" cy="680" r="2" fill="#d4af37" opacity="0.4"/>
  <circle cx="${width/2+20}" cy="680" r="2" fill="#d4af37" opacity="0.4"/>
</svg>
`;

const outputPath = path.join(__dirname, 'public', 'images', 'welcome.jpg');

sharp(Buffer.from(svg))
  .jpeg({ quality: 90 })
  .toFile(outputPath)
  .then(() => {
    console.log('✅ Image de bienvenue créée avec succès:', outputPath);
  })
  .catch(err => {
    console.error('❌ Erreur lors de la création de l\'image:', err);
    process.exit(1);
  });
