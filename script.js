const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const restartBtn = document.getElementById("restartBtn");
const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const gameUI = document.getElementById("gameUI");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const pauseIndicator = document.getElementById("pauseIndicator");
const milestoneMessage = document.getElementById("milestoneMessage");

// Audio elements - wait for DOM to be ready
let mamataVoiceSound, lastSound;

// Initialize audio when DOM is ready
function initAudio() {
  mamataVoiceSound = document.getElementById("mamataVoiceSound");
  lastSound = document.getElementById("lastSound");
  
  if (mamataVoiceSound) {
    mamataVoiceSound.volume = 1.0;
    console.log('Mamata voice sound element found');
  } else {
    console.log('Mamata voice sound element NOT found!');
  }
  
  if (lastSound) {
    lastSound.volume = 1.0;
    lastSound.loop = true; // Loop the sound
    console.log('Last sound element found');
  } else {
    console.log('Last sound element NOT found!');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAudio);
} else {
  initAudio();
}

// Game state
let frames = 0;
let score = 0;
let pipes = [];
let particles = [];
let gameOver = false;
let gameStarted = false;
let gamePaused = false;
let animationId = null;
let screenShake = 0;
let milestonesShown = { 10: false, 20: false };

// High score
let highScore = localStorage.getItem('flappyBirdHighScore') || 0;
highScoreDisplay.textContent = highScore;

// Sound management - loading sound removed

// Bird image loading - will try to find any uploaded image
const birdImage = new Image();
let birdImageLoaded = false;
// Extended list of possible image filenames - prioritizing uploaded image
const imageFallbacks = [
  'mamta_-removebg-preview.png', // User's uploaded image - highest priority
  'bird.png', 'bird.jpg', 'bird.jpeg', 'bird.gif', 'bird.webp',
  'bird-head.png', 'bird-head.jpg', 'bird-head.jpeg',
  'head.png', 'head.jpg', 'head.jpeg',
  'birdImage.png', 'birdImage.jpg',
  'image.png', 'image.jpg'
];
let currentImageIndex = 0;

birdImage.onload = function() {
  birdImageLoaded = true;
  console.log('Bird image loaded successfully:', birdImage.src);
  // Auto-adjust size based on image dimensions if reasonable
  if (birdImage.width > 0 && birdImage.height > 0) {
    const maxSize = 50; // Maximum bird size
    const aspectRatio = birdImage.width / birdImage.height;
    if (aspectRatio > 1) {
      bird.width = Math.min(maxSize, birdImage.width);
      bird.height = bird.width / aspectRatio;
    } else {
      bird.height = Math.min(maxSize, birdImage.height);
      bird.width = bird.height * aspectRatio;
    }
  }
};

birdImage.onerror = function() {
  if (currentImageIndex < imageFallbacks.length - 1) {
    currentImageIndex++;
    console.log(`Trying image: ${imageFallbacks[currentImageIndex]}`);
    birdImage.src = imageFallbacks[currentImageIndex];
  } else {
    console.log('No bird image found, using drawn bird');
    birdImageLoaded = false;
  }
};

// Start loading images
birdImage.src = imageFallbacks[0];

// Pipe obstacle image (modi.png)
const pipeImage = new Image();
let pipeImageLoaded = false;
pipeImage.onload = function() {
  pipeImageLoaded = true;
  console.log('Pipe image loaded successfully:', pipeImage.src);
};
pipeImage.onerror = function() {
  console.log('Pipe image not found, using drawn pipes');
  pipeImageLoaded = false;
};
pipeImage.src = 'modi.png';

// Bird object with improved graphics and animation
const bird = {
  x: 80,
  y: 150,
  radius: 22, // Larger for easier mobile gameplay
  width: 42, // Larger image width for mobile
  height: 42, // Larger image height for mobile
  gravity: 0.35, // Even lower gravity for mobile-friendly control
  lift: -8.5, // Optimized lift for mobile touch
  velocity: 0,
  angle: 0,
  wingPhase: 0,
  color: '#FFD700',
  
  draw() {
    ctx.save();
    
    // Screen shake effect
    if (screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * screenShake,
        (Math.random() - 0.5) * screenShake
      );
      screenShake *= 0.9;
    }
    
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // Use image if loaded, otherwise draw bird
    if (birdImageLoaded && birdImage.complete && birdImage.width > 0) {
      // Draw bird image with proper centering and scaling
      ctx.drawImage(
        birdImage,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback: Draw bird body (ellipse)
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius + 5, this.radius, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Wing animation
      ctx.save();
      ctx.rotate(Math.sin(this.wingPhase) * 0.5);
      ctx.beginPath();
      ctx.ellipse(-8, 0, 8, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFA500';
      ctx.fill();
      ctx.restore();
      
      // Eye
      ctx.beginPath();
      ctx.arc(8, -5, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(10, -5, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      
      // Beak
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(25, -3);
      ctx.lineTo(25, 3);
      ctx.closePath();
      ctx.fillStyle = '#FF6B35';
      ctx.fill();
    }
    
    ctx.restore();
    
    // Update wing animation
    this.wingPhase += 0.3;
  },
  
  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
    
    // Rotation based on velocity (more natural)
    this.angle = Math.min(Math.max(this.velocity * 0.05, -0.5), 0.5);
    
    // Boundary checks
    if (this.y + this.radius > canvas.height) {
      this.y = canvas.height - this.radius;
      this.velocity = 0;
      endGame();
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.velocity = 0;
    }
  },
  
  flap() {
    this.velocity = this.lift;
    this.wingPhase = 0; // Reset wing animation
    createFlapParticles();
  },
  
  reset() {
    this.y = 150;
    this.velocity = 0;
    this.angle = 0;
    this.wingPhase = 0;
  }
};

// Particle system for visual effects
function Particle(x, y, vx, vy, color, size, life) {
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
  this.color = color;
  this.size = size;
  this.life = life;
  this.maxLife = life;
  
  this.update = function() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // gravity
    this.life--;
    return this.life > 0;
  };
  
  this.draw = function() {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
}

function createFlapParticles() {
  for (let i = 0; i < 5; i++) {
    particles.push(new Particle(
      bird.x,
      bird.y,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2 - 2,
      '#FFD700',
      Math.random() * 3 + 2,
      20
    ));
  }
}

function createExplosionParticles(x, y) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(
      x,
      y,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
      ['#FF6B6B', '#FFD700', '#FFA500', '#FF6B35'][Math.floor(Math.random() * 4)],
      Math.random() * 4 + 3,
      30
    ));
  }
}

// Enhanced pipe creation - Made easier with larger gaps
function createPipe() {
  const gap = 270; // Extra large gap for mobile-friendly gameplay
  const minHeight = 60;
  const maxHeight = canvas.height - gap - minHeight;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
  
  pipes.push({
    x: canvas.width,
    top: topHeight,
    bottom: topHeight + gap,
    width: 70, // Slightly wider for visibility
    scored: false,
    capSize: 15,
    imageHeight: 0 // Will be set based on pipe height
  });
}

// Draw pipes with modi.png image
function drawPipes() {
  pipes.forEach((pipe) => {
    if (pipeImageLoaded && pipeImage.complete && pipeImage.width > 0) {
      // Draw using modi.png image
      const imageAspectRatio = pipeImage.width / pipeImage.height;
      
      // Top pipe - repeat image to fill height
      const topHeight = pipe.top;
      let currentY = 0;
      while (currentY < topHeight) {
        const drawHeight = Math.min(pipe.width / imageAspectRatio, topHeight - currentY);
        ctx.drawImage(
          pipeImage,
          pipe.x,
          currentY,
          pipe.width,
          drawHeight
        );
        currentY += drawHeight;
      }
      
      // Bottom pipe - repeat image to fill height
      const bottomHeight = canvas.height - pipe.bottom;
      currentY = pipe.bottom;
      while (currentY < canvas.height) {
        const drawHeight = Math.min(pipe.width / imageAspectRatio, canvas.height - currentY);
        ctx.drawImage(
          pipeImage,
          pipe.x,
          currentY,
          pipe.width,
          drawHeight
        );
        currentY += drawHeight;
      }
    } else {
      // Fallback: Draw pipes with gradient
      const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
      gradient.addColorStop(0, '#2ecc71');
      gradient.addColorStop(0.5, '#27ae60');
      gradient.addColorStop(1, '#229954');
      
      // Top pipe
      ctx.fillStyle = gradient;
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
      
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottom, pipe.width, canvas.height - pipe.bottom);
      
      // Pipe highlight
      ctx.strokeStyle = '#1e8449';
      ctx.lineWidth = 3;
      ctx.strokeRect(pipe.x, 0, pipe.width, pipe.top);
      ctx.strokeRect(pipe.x, pipe.bottom, pipe.width, canvas.height - pipe.bottom);
    }
  });
}

// Update pipes with improved collision - Made easier with slower movement
function updatePipes() {
  pipes.forEach((pipe, index) => {
    pipe.x -= 1.6; // Slower for mobile-friendly gameplay
    
    // Score when bird passes pipe
    if (!pipe.scored && pipe.x + pipe.width < bird.x) {
      pipe.scored = true;
      score++;
      scoreDisplay.textContent = score;
      scoreDisplay.style.animation = 'none';
      setTimeout(() => {
        scoreDisplay.style.animation = 'scorePulse 0.3s ease';
      }, 10);
      
      // Show milestone messages
      if (score === 10 && !milestonesShown[10]) {
        showMilestoneMessage('Didi oo Didi! 🎉');
        milestonesShown[10] = true;
      } else if (score === 20 && !milestonesShown[20]) {
        showMilestoneMessage('Modi ji arrived in Kolkata! 🚁');
        milestonesShown[20] = true;
      }
      
      // Score particles
      for (let i = 0; i < 10; i++) {
        particles.push(new Particle(
          pipe.x + pipe.width / 2,
          pipe.top + (pipe.bottom - pipe.top) / 2,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          '#FFD700',
          Math.random() * 3 + 2,
          25
        ));
      }
    }
    
    // Remove off-screen pipes
    if (pipe.x + pipe.width < 0) {
      pipes.splice(index, 1);
    }
    
    // Improved collision detection (circular bird vs rectangular pipe)
    const birdLeft = bird.x - bird.radius;
    const birdRight = bird.x + bird.radius;
    const birdTop = bird.y - bird.radius;
    const birdBottom = bird.y + bird.radius;
    
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;
    
    // Check if bird is in pipe's x-range
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      // Check if bird hits top or bottom pipe
      if (birdTop < pipe.top || birdBottom > pipe.bottom) {
        createExplosionParticles(bird.x, bird.y);
        screenShake = 20;
        endGame();
      }
    }
  });
  
  // Create new pipes - less frequently for easier gameplay
  if (frames % 170 === 0) { // Extra spacing for mobile-friendly gameplay
    createPipe();
  }
}

// Game state functions
// Show milestone message
function showMilestoneMessage(message) {
  milestoneMessage.textContent = message;
  milestoneMessage.classList.remove('hidden');
  milestoneMessage.style.animation = 'milestoneAppear 3s ease-in-out';
  
  setTimeout(() => {
    milestoneMessage.classList.add('hidden');
    milestoneMessage.style.animation = '';
  }, 3000);
}

function startGame() {
  gameStarted = true;
  gameOver = false;
  gamePaused = false;
  score = 0;
  pipes = [];
  particles = [];
  frames = 0;
  milestonesShown = { 10: false, 20: false };
  bird.reset();
  scoreDisplay.textContent = '0';
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  gameUI.classList.remove('hidden');
  milestoneMessage.classList.add('hidden');
  milestoneMessage.style.animation = '';
  
  // Play mamata voice sound when game starts
  if (mamataVoiceSound) {
    mamataVoiceSound.currentTime = 0;
    mamataVoiceSound.volume = 1.0;
    const playPromise = mamataVoiceSound.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Mamata voice sound playing');
        })
        .catch(e => {
          console.log('Mamata voice sound play failed:', e);
        });
    }
  }
  
  loop();
}

function endGame() {
  if (gameOver) return;
  
  gameOver = true;
  gameStarted = false;
  
  // Hide milestone message if showing
  milestoneMessage.classList.add('hidden');
  milestoneMessage.style.animation = '';
  
  // Stop mamata voice sound when game finishes
  if (mamataVoiceSound && !mamataVoiceSound.paused) {
    mamataVoiceSound.pause();
    mamataVoiceSound.currentTime = 0;
    console.log('Mamata voice sound stopped');
  }
  
  // Play last.mp3 sound after collision
  if (lastSound) {
    lastSound.currentTime = 0;
    lastSound.loop = true;
    const playPromise = lastSound.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Last sound playing');
        })
        .catch(e => {
          console.log('Last sound play failed:', e);
        });
    }
  }
  
  // Update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('flappyBirdHighScore', highScore);
    highScoreDisplay.textContent = highScore;
  }
  
  setTimeout(() => {
    gameUI.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
  }, 500);
}

function togglePause() {
  if (!gameStarted || gameOver) return;
  
  gamePaused = !gamePaused;
  pauseIndicator.classList.toggle('hidden');
  
  if (gamePaused) {
    cancelAnimationFrame(animationId);
  } else {
    loop();
  }
}

// Draw background elements - Kolkata style
function drawBackground() {
  // Animated clouds with warmer tones
  const cloudY = 100 + Math.sin(frames * 0.01) * 10;
  ctx.fillStyle = 'rgba(255, 218, 155, 0.5)'; // Warm cream clouds
  
  // Cloud 1
  drawCloud(50 + (frames * 0.3) % (canvas.width + 100), cloudY, 40);
  // Cloud 2
  drawCloud(200 + (frames * 0.2) % (canvas.width + 100), cloudY + 50, 35);
  // Cloud 3
  drawCloud(320 + (frames * 0.25) % (canvas.width + 100), cloudY - 30, 30);
  
  // Kolkata-style sun with warm orange/terracotta colors
  const gradient = ctx.createRadialGradient(350, 80, 0, 350, 80, 50);
  gradient.addColorStop(0, 'rgba(255, 170, 68, 0.6)'); // Warm orange center
  gradient.addColorStop(0.5, 'rgba(255, 107, 53, 0.4)'); // Terracotta
  gradient.addColorStop(1, 'rgba(247, 147, 30, 0.2)'); // Saffron edge
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(350, 80, 50, 0, Math.PI * 2);
  ctx.fill();
  
  // Add some decorative elements at the bottom (like Kolkata architecture)
  ctx.fillStyle = 'rgba(255, 107, 53, 0.15)';
  for (let i = 0; i < 5; i++) {
    const x = (i * 80) + (frames * 0.1) % 80;
    const height = 20 + Math.sin(frames * 0.05 + i) * 5;
    ctx.fillRect(x, canvas.height - height, 30, height);
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, y, size * 0.8, 0, Math.PI * 2);
  ctx.arc(x + size * 1.2, y, size * 0.7, 0, Math.PI * 2);
  ctx.arc(x + size * 0.3, y - size * 0.5, size * 0.6, 0, Math.PI * 2);
  ctx.arc(x + size * 0.9, y - size * 0.4, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// Main draw function
function draw() {
  // Clear with background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background elements
  drawBackground();
  
  // Draw pipes
  drawPipes();
  
  // Draw particles
  particles = particles.filter(p => {
    p.update();
    p.draw();
    return p.life > 0;
  });
  
  // Draw bird
  bird.draw();
}

// Update function
function update() {
  if (!gameOver && !gamePaused) {
    bird.update();
    updatePipes();
    frames++;
  }
}

// Game loop
function loop() {
  if (!gameStarted || gameOver) return;
  
  draw();
  update();
  
  if (!gamePaused && gameStarted) {
    animationId = requestAnimationFrame(loop);
  }
}

// Input handlers
function handleInput() {
  if (!gameStarted) {
    startGame();
  } else if (!gamePaused && !gameOver) {
    bird.flap();
  }
}

// Enhanced touch handling for mobile
let touchStartTime = 0;
let lastTouchTime = 0;

canvas.addEventListener("click", handleInput);

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  touchStartTime = Date.now();
  
  // Prevent double-tap zoom on mobile
  const now = Date.now();
  if (now - lastTouchTime < 300) {
    e.preventDefault();
  }
  lastTouchTime = now;
  
  handleInput();
  
  // Visual feedback for touch
  canvas.style.transform = 'scale(0.98)';
  setTimeout(() => {
    canvas.style.transform = 'scale(1)';
  }, 100);
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
}, { passive: false });

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    handleInput();
  }
  
  if (e.code === "Escape" || e.code === "KeyP") {
    e.preventDefault();
    togglePause();
  }
});

// Start button
startBtn.addEventListener("click", startGame);

// Restart button - go back to start screen and stop last sound
restartBtn.addEventListener("click", () => {
  // Stop last.mp3 sound when clicking Play Again
  if (lastSound && !lastSound.paused) {
    lastSound.pause();
    lastSound.currentTime = 0;
    console.log('Last sound stopped');
  }
  
  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

// Prevent context menu on canvas
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
