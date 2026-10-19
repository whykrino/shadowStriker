'use strict';

class MenuScene {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  generate(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.ctx;
    
    const cx = w * 0.7;
    const cy = h * 0.75;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 80 + 20;
      const shade = Math.random();
      if (shade < 0.4) ctx.fillStyle = 'rgba(13, 20, 30, 0.7)';
      else if (shade < 0.8) ctx.fillStyle = 'rgba(8, 12, 20, 0.8)';
      else ctx.fillStyle = 'rgba(22, 36, 54, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tempWorld = new World();
    tempWorld.buildTreeSprites();

    const trees = [];
    const rocks = [];

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      
      const distToCenter = Math.hypot(x - cx, y - cy);
      
      if (distToCenter < 250) {
        if (distToCenter > 80 && Math.random() < 0.4) {
          rocks.push({ x, y });
        }
        continue;
      }

      if (Math.random() < 0.8) {
        trees.push({
          x: x,
          y: y,
          spriteIdx: Math.floor(Math.random() * tempWorld.treeSprites.length)
        });
      } else {
        rocks.push({ x, y });
      }
    }

    trees.sort((a, b) => a.y - b.y);

    for (const r of rocks) {
      ctx.fillStyle = '#0a0e14';
      ctx.beginPath();
      ctx.moveTo(r.x - 15, r.y + 10);
      ctx.lineTo(r.x - 5, r.y - 10);
      ctx.lineTo(r.x + 10, r.y - 5);
      ctx.lineTo(r.x + 20, r.y + 15);
      ctx.fill();
      
      ctx.fillStyle = '#141e30';
      ctx.beginPath();
      ctx.moveTo(r.x - 10, r.y + 5);
      ctx.lineTo(r.x - 3, r.y - 5);
      ctx.lineTo(r.x + 8, r.y - 2);
      ctx.fill();
    }

    for (const t of trees) {
      const sprite = tempWorld.treeSprites[t.spriteIdx];
      ctx.drawImage(sprite, t.x - sprite.width / 2, t.y - sprite.height + 20);
    }

    ctx.save();
    ctx.translate(cx, cy + 5);
    
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rx = Math.cos(a) * 30;
      const ry = Math.sin(a) * 15;
      const size = 8 + Math.random() * 4;
      
      ctx.fillStyle = '#04060a';
      ctx.beginPath(); 
      ctx.ellipse(rx, ry + 5, size + 2, size * 0.7 + 2, a, 0, Math.PI*2); 
      ctx.fill();
      
      ctx.fillStyle = '#101824';
      ctx.beginPath(); 
      ctx.ellipse(rx, ry, size, size * 0.7, a, 0, Math.PI*2); 
      ctx.fill();
      
      ctx.fillStyle = '#1a2436';
      ctx.beginPath(); 
      ctx.ellipse(rx - 2, ry - 2, size * 0.5, size * 0.4, a, 0, Math.PI*2); 
      ctx.fill();
    }

    ctx.fillStyle = '#0a0d14';
    ctx.beginPath(); ctx.ellipse(0, 5, 20, 8, 0, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-15, 2); ctx.lineTo(15, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(12, 2); ctx.stroke();
    
    ctx.strokeStyle = '#2a180c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-15, 2); ctx.lineTo(15, -2); ctx.stroke();

    ctx.restore();

    const vignette = ctx.createRadialGradient(cx, cy, 200, cx, cy, w*0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
}