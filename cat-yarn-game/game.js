/**
 * 毛线球大作战 (Yarn Ball Battle)
 * Chrome Dino Style Interactive Web Game
 * With Camera Hand Tracking Support
 */

class CatYarnGame {
    constructor() {
        // DOM Elements
        this.gameArea = document.getElementById('gameArea');
        this.cat = document.getElementById('cat');
        this.yarnBall = document.getElementById('yarnBall');
        this.yarnString = document.getElementById('yarnString');
        this.particles = document.getElementById('particles');
        this.pawPrints = document.getElementById('pawPrints');
        this.pounceCountDisplay = document.getElementById('pounceCount');
        this.catMoodDisplay = document.getElementById('catMood');

        // Camera elements
        this.cameraContainer = document.getElementById('cameraContainer');
        this.cameraVideo = document.getElementById('cameraVideo');
        this.cameraCanvas = document.getElementById('cameraCanvas');
        this.cameraStatus = document.getElementById('cameraStatus');
        this.handIndicator = document.getElementById('handIndicator');
        this.controlHint = document.getElementById('controlHint');
        this.mouseBtn = document.getElementById('mouseBtn');
        this.cameraBtn = document.getElementById('cameraBtn');

        // Cat position and state
        this.catPos = {
            x: window.innerWidth / 2,
            y: window.innerHeight * 0.6
        };
        this.catVelocity = { x: 0, y: 0 };
        this.catSpeed = 0;
        this.catState = 'idle';

        // Yarn ball position
        this.yarnPos = {
            x: window.innerWidth / 2 + 100,
            y: window.innerHeight * 0.5
        };
        this.prevYarnPos = { ...this.yarnPos };

        // Trail positions for yarn string
        this.trailPositions = [];
        this.maxTrailLength = 10;

        // Game stats
        this.totalDistance = 0;
        this.lastPawPrintTime = 0;
        this.lastParticleTime = 0;

        // Mouse movement speed tracking
        this.mouseSpeed = 0;
        this.lastMousePos = { x: 0, y: 0 };
        this.lastMouseTime = Date.now();

        // Control mode: 'mouse' or 'camera'
        this.controlMode = 'mouse';

        // Hand tracking
        this.hands = null;
        this.camera = null;
        this.handDetected = false;
        this.fingerPos = { x: 0, y: 0 };
        this.smoothedFingerPos = { x: 0, y: 0 };
        this.fingerSmoothing = 0.3;

        // Pounce mechanics
        this.pounceCount = 0; // Counter for current session (resets after rest)
        this.totalPounces = 0; // Total pounce count for display
        this.maxPouncesBeforeRest = 6 + Math.floor(Math.random() * 5); // 6-10 pounces before rest
        this.isPouncing = false;
        this.isResting = false;
        this.pounceDistance = 80; // Distance at which cat starts preparing to pounce
        this.pounceTriggerDistance = 25; // Overlap detection: yarn ball radius (20px) + nose size (5px)
        this.lastPounceTime = 0;
        this.pounceCooldown = 500; // ms between pounces (faster recovery)
        this.restDuration = 3000; // ms to rest (shorter rest)
        this.restStartTime = 0;
        this.preparingPounce = false;

        // Demo mode
        this.demoMode = false;
        this.demoState = null;
        this.demoTimeout = null;
        this.demoPanel = document.getElementById('demoPanel');
        this.demoBtns = document.querySelectorAll('.demo-btn');

        // Create finger cursor element
        this.fingerCursor = document.createElement('div');
        this.fingerCursor.className = 'finger-cursor';
        this.gameArea.appendChild(this.fingerCursor);

        // Initialize
        this.init();
    }

    init() {
        // Set initial positions
        this.updateCatPosition();
        this.updateYarnPosition();

        // Event listeners
        this.gameArea.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.gameArea.addEventListener('touchmove', (e) => this.handleTouchMove(e));

        // Control mode buttons
        this.mouseBtn.addEventListener('click', () => this.setControlMode('mouse'));
        this.cameraBtn.addEventListener('click', () => this.setControlMode('camera'));

        // Demo panel buttons
        this.demoBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = btn.dataset.state;
                this.triggerDemoState(state);
            });
        });

        // Click anywhere to exit demo mode
        document.addEventListener('click', (e) => {
            if (this.demoMode && !e.target.closest('.demo-panel')) {
                this.exitDemoMode();
            }
        });

        // Start game loop
        this.gameLoop();

        // Initial state
        this.setCatState('curious');
    }

    setControlMode(mode) {
        this.controlMode = mode;

        // Update button states
        this.mouseBtn.classList.toggle('active', mode === 'mouse');
        this.cameraBtn.classList.toggle('active', mode === 'camera');

        // Update hint text
        if (mode === 'mouse') {
            this.controlHint.textContent = '移动鼠标控制毛线球';
            this.cameraContainer.classList.remove('active');
            this.fingerCursor.classList.remove('active');
            this.stopCamera();
        } else {
            this.controlHint.textContent = '伸出食指控制毛线球';
            this.cameraContainer.classList.add('active');
            this.startCamera();
        }
    }

    async startCamera() {
        this.updateCameraStatus('🔄 正在启动摄像头...', 'loading');

        try {
            // Initialize MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => this.onHandResults(results));

            // Setup camera
            this.camera = new Camera(this.cameraVideo, {
                onFrame: async () => {
                    await this.hands.send({ image: this.cameraVideo });
                },
                width: 640,
                height: 480
            });

            await this.camera.start();

            this.updateCameraStatus('✅ 摄像头已启动', 'success');
            setTimeout(() => {
                this.cameraStatus.classList.add('hidden');
            }, 1500);

        } catch (error) {
            console.error('Camera error:', error);
            this.updateCameraStatus('❌ 无法访问摄像头', 'error');
        }
    }

    stopCamera() {
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        this.handDetected = false;
        this.handIndicator.classList.remove('visible');
        this.cameraStatus.classList.remove('hidden');
        this.updateCameraStatus('📷 摄像头未启动', '');
    }

    updateCameraStatus(text, statusClass) {
        this.cameraStatus.textContent = text;
        this.cameraStatus.className = 'camera-status';
        if (statusClass) {
            this.cameraStatus.classList.add(statusClass);
        }
    }

    onHandResults(results) {
        const canvasCtx = this.cameraCanvas.getContext('2d');
        const canvasWidth = this.cameraCanvas.width = this.cameraVideo.videoWidth || 640;
        const canvasHeight = this.cameraCanvas.height = this.cameraVideo.videoHeight || 480;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.handDetected = true;
            this.handIndicator.classList.add('visible');

            const landmarks = results.multiHandLandmarks[0];
            this.drawHandLandmarks(canvasCtx, landmarks, canvasWidth, canvasHeight);

            const indexFingerTip = landmarks[8];
            const screenX = (1 - indexFingerTip.x) * window.innerWidth;
            const screenY = indexFingerTip.y * window.innerHeight;

            this.fingerPos = { x: screenX, y: screenY };
            this.smoothedFingerPos.x += (screenX - this.smoothedFingerPos.x) * this.fingerSmoothing;
            this.smoothedFingerPos.y += (screenY - this.smoothedFingerPos.y) * this.fingerSmoothing;

            if (this.controlMode === 'camera') {
                this.updateYarnFromFinger();
            }

        } else {
            this.handDetected = false;
            this.handIndicator.classList.remove('visible');
        }

        canvasCtx.restore();
    }

    drawHandLandmarks(ctx, landmarks, width, height) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];

        ctx.strokeStyle = 'rgba(255, 107, 157, 0.6)';
        ctx.lineWidth = 2;

        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            ctx.beginPath();
            ctx.moveTo(startPoint.x * width, startPoint.y * height);
            ctx.lineTo(endPoint.x * width, endPoint.y * height);
            ctx.stroke();
        });

        landmarks.forEach((landmark, index) => {
            const x = landmark.x * width;
            const y = landmark.y * height;

            ctx.beginPath();
            ctx.arc(x, y, index === 8 ? 8 : 4, 0, 2 * Math.PI);

            if (index === 8) {
                ctx.fillStyle = '#ff6b9d';
                ctx.strokeStyle = '#535353';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
            }
        });
    }

    updateYarnFromFinger() {
        const now = Date.now();
        const dt = now - this.lastMouseTime;

        if (dt > 0) {
            const dx = this.smoothedFingerPos.x - this.prevYarnPos.x;
            const dy = this.smoothedFingerPos.y - this.prevYarnPos.y;
            this.mouseSpeed = Math.sqrt(dx * dx + dy * dy) / dt * 16;
        }

        this.lastMouseTime = now;
        this.prevYarnPos = { ...this.yarnPos };
        this.yarnPos = { ...this.smoothedFingerPos };

        this.trailPositions.push({ ...this.yarnPos });
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.shift();
        }

        if (this.mouseSpeed > 5 && now - this.lastParticleTime > 50) {
            this.spawnParticle(this.yarnPos.x, this.yarnPos.y);
            this.lastParticleTime = now;
        }

        this.fingerCursor.classList.add('active');
        this.fingerCursor.style.left = `${this.smoothedFingerPos.x}px`;
        this.fingerCursor.style.top = `${this.smoothedFingerPos.y}px`;
    }

    handleMouseMove(e) {
        if (this.controlMode !== 'mouse') return;

        const rect = this.gameArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const now = Date.now();
        const dt = now - this.lastMouseTime;
        if (dt > 0) {
            const dx = x - this.lastMousePos.x;
            const dy = y - this.lastMousePos.y;
            this.mouseSpeed = Math.sqrt(dx * dx + dy * dy) / dt * 16;
        }
        this.lastMousePos = { x, y };
        this.lastMouseTime = now;

        this.prevYarnPos = { ...this.yarnPos };
        this.yarnPos = { x, y };

        this.trailPositions.push({ ...this.yarnPos });
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.shift();
        }

        if (this.mouseSpeed > 5 && now - this.lastParticleTime > 50) {
            this.spawnParticle(x, y);
            this.lastParticleTime = now;
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Skip normal game updates during demo mode
        if (this.demoMode) return;

        const now = Date.now();

        // Handle resting state
        if (this.isResting) {
            if (now - this.restStartTime > this.restDuration) {
                this.isResting = false;
                this.pounceCount = 0;
                this.maxPouncesBeforeRest = 4 + Math.floor(Math.random() * 4); // Reset random 4-7
                this.setCatState('curious');
            }
            return; // Don't move while resting
        }

        // Handle pouncing animation
        if (this.isPouncing) {
            if (now - this.lastPounceTime > 600) { // Pounce animation duration (matches CSS)
                this.isPouncing = false;
                this.pounceCount++;

                // Check if cat needs to rest
                if (this.pounceCount >= this.maxPouncesBeforeRest) {
                    this.startResting();
                    return;
                }
            }
            return; // Don't update position while pouncing
        }

        // Calculate distance from yarn ball center to cat's nose
        // Cat nose is offset from center based on facing direction
        const dx = this.yarnPos.x - this.catPos.x;
        const dy = this.yarnPos.y - this.catPos.y;

        // Calculate nose position (nose is about 35px towards the yarn ball from cat center)
        const noseOffsetX = dx > 0 ? 35 : -35; // Nose towards yarn ball direction
        const noseOffsetY = -15; // Nose is slightly above center (in the head)
        const noseX = this.catPos.x + noseOffsetX;
        const noseY = this.catPos.y + noseOffsetY;

        // Distance from yarn center to cat nose
        const noseDx = this.yarnPos.x - noseX;
        const noseDy = this.yarnPos.y - noseY;
        const noseDistance = Math.sqrt(noseDx * noseDx + noseDy * noseDy);

        // Distance from yarn to cat center (for movement calculations)
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check for catch - nose overlaps with yarn ball (25px = yarn radius + nose size)
        const catchDistance = 25;
        if (noseDistance < catchDistance &&
            now - this.lastPounceTime > this.pounceCooldown) {
            // Caught! Increment score and trigger pounce celebration
            this.totalPounces++;
            this.pounceCountDisplay.textContent = this.totalPounces;

            // Show floating meow text
            this.showMeowText();

            // Play meow sound
            this.playMeowSound();

            this.triggerPounce(dx, dy);
            return;
        }

        // Prepare to pounce when getting close
        if (noseDistance < this.pounceDistance && noseDistance >= this.pounceTriggerDistance && !this.preparingPounce) {
            this.preparingPounce = true;
            this.setCatState('preparing-pounce');
        } else if (noseDistance >= this.pounceDistance && this.preparingPounce) {
            this.preparingPounce = false;
        }

        // Cat AI - chase the yarn with some smoothing
        const chaseSpeed = this.calculateChaseSpeed(distance);

        if (distance > 30) {
            const dirX = dx / distance;
            const dirY = dy / distance;

            this.catVelocity.x += (dirX * chaseSpeed - this.catVelocity.x) * 0.1;
            this.catVelocity.y += (dirY * chaseSpeed - this.catVelocity.y) * 0.1;

            this.catPos.x += this.catVelocity.x;
            this.catPos.y += this.catVelocity.y;

            this.totalDistance += Math.sqrt(
                this.catVelocity.x * this.catVelocity.x +
                this.catVelocity.y * this.catVelocity.y
            );

            if (now - this.lastPawPrintTime > 200 && chaseSpeed > 2) {
                this.addPawPrint();
                this.lastPawPrintTime = now;
            }
        } else {
            this.catVelocity.x *= 0.9;
            this.catVelocity.y *= 0.9;
        }

        this.catSpeed = Math.sqrt(
            this.catVelocity.x * this.catVelocity.x +
            this.catVelocity.y * this.catVelocity.y
        );

        // Update cat state based on behavior (only if not preparing to pounce)
        if (!this.preparingPounce) {
            this.updateCatState(distance);
        }

        // Keep cat within bounds
        this.catPos.x = Math.max(70, Math.min(window.innerWidth - 70, this.catPos.x));
        this.catPos.y = Math.max(120, Math.min(window.innerHeight - 120, this.catPos.y));
    }

    triggerPounce(dx, dy) {
        this.isPouncing = true;
        this.preparingPounce = false;
        this.lastPounceTime = Date.now();
        this.setCatState('pouncing');

        // Ensure cat faces the yarn ball
        const facingScaleX = dx > 0 ? -1 : 1;
        const catBody = this.cat.querySelector('.cat-body');
        if (catBody) {
            catBody.style.transform = `scaleX(${facingScaleX})`;
        }

        // Animate parabolic pounce trajectory
        const startPos = { x: this.catPos.x, y: this.catPos.y };
        const distance = Math.sqrt(dx * dx + dy * dy);
        const pounceDistance = Math.min(70, distance); // Don't overshoot the yarn ball

        // Target position (towards yarn ball)
        const targetX = startPos.x + (dx / distance) * pounceDistance;
        const targetY = startPos.y + (dy / distance) * pounceDistance;

        const pounceDuration = 600; // ms
        const startTime = Date.now();
        const peakHeight = 80; // How high the cat jumps

        const animatePounce = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / pounceDuration, 1);

            // Horizontal movement (linear)
            const currentX = startPos.x + (targetX - startPos.x) * progress;

            // Vertical movement (parabolic arc)
            // y = -4h*t*(t-1) where t is progress 0-1, h is peak height
            const arcOffset = -4 * peakHeight * progress * (progress - 1);
            const currentY = startPos.y + (targetY - startPos.y) * progress - arcOffset;

            // Update position
            this.catPos.x = currentX;
            this.catPos.y = currentY;
            this.cat.style.left = `${currentX}px`;
            this.cat.style.top = `${currentY}px`;

            // Spawn particles during jump
            if (progress > 0.3 && progress < 0.7 && Math.random() > 0.7) {
                this.spawnParticle(currentX, currentY);
            }

            // Continue animation
            if (progress < 1) {
                requestAnimationFrame(animatePounce);
            } else {
                // Landing particles
                for (let i = 0; i < 3; i++) {
                    this.spawnParticle(currentX, currentY + 20);
                }
            }
        };

        // Start the pounce animation
        requestAnimationFrame(animatePounce);
    }

    startResting() {
        this.isResting = true;
        this.restStartTime = Date.now();
        this.catVelocity = { x: 0, y: 0 };
        this.setCatState('resting');
    }

    calculateChaseSpeed(distance) {
        // Don't chase while resting
        if (this.isResting) return 0;

        let baseSpeed = 7; // Faster base speed

        if (this.mouseSpeed > 10) {
            baseSpeed += this.mouseSpeed * 0.4; // More responsive to fast movement
        }

        if (distance < 150) {
            baseSpeed *= 1.8; // Speed boost when close
        } else if (distance > 300) {
            baseSpeed *= 0.9;
        }

        return Math.min(baseSpeed, 22); // Higher max speed
    }

    updateCatState(distance) {
        if (this.isPouncing || this.isResting || this.preparingPounce) return;

        let newState;

        if (this.catSpeed < 0.5) {
            newState = 'idle';
        } else if (this.catSpeed > 8 || this.mouseSpeed > 15) {
            newState = 'excited';
        } else if (distance < 100) {
            newState = 'excited';
        } else if (this.catSpeed > 2) {
            newState = 'running';
        } else {
            newState = 'curious';
        }

        if (newState !== this.catState) {
            this.setCatState(newState);
        }
    }

    setCatState(state) {
        this.catState = state;
        this.cat.className = 'cat ' + state;

        const moods = {
            'idle': '😺 悠闲',
            'curious': '😸 好奇',
            'running': '😻 追逐中',
            'excited': '🙀 超兴奋!',
            'preparing-pounce': '😼 准备飞扑...',
            'pouncing': '🐱 飞扑！',
            'resting': '😴 累了休息...'
        };
        this.catMoodDisplay.textContent = moods[state] || '😺 好奇';

        // Show pounce count when relevant
        if (state === 'pouncing') {
            this.catMoodDisplay.textContent += ` (${this.pounceCount + 1}/${this.maxPouncesBeforeRest})`;
        } else if (state === 'resting') {
            const remainingTime = Math.ceil((this.restDuration - (Date.now() - this.restStartTime)) / 1000);
            this.updateRestingCountdown();
        }
    }

    updateRestingCountdown() {
        if (!this.isResting) return;

        const remainingTime = Math.ceil((this.restDuration - (Date.now() - this.restStartTime)) / 1000);
        if (remainingTime > 0) {
            this.catMoodDisplay.textContent = `😴 休息中... ${remainingTime}s`;
            setTimeout(() => this.updateRestingCountdown(), 200);
        }
    }

    // Demo mode methods
    triggerDemoState(state) {
        // Clear any existing demo timeout
        if (this.demoTimeout) {
            clearTimeout(this.demoTimeout);
        }

        // Save original position if entering demo mode for the first time
        if (!this.demoMode) {
            this.savedCatPos = { ...this.catPos };
        }

        // Enter demo mode
        this.demoMode = true;
        this.demoState = state;
        document.body.classList.add('demo-mode-active');

        // Move cat to center of screen for demo
        this.catPos = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
        this.cat.style.left = `${this.catPos.x}px`;
        this.cat.style.top = `${this.catPos.y}px`;

        // Update button states
        this.demoBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.state === state);
        });

        // Reset any ongoing animations
        this.isPouncing = false;
        this.isResting = false;
        this.preparingPounce = false;

        // Set the cat to the demo state
        this.setCatState(state);

        // For pouncing state, replay the animation periodically
        if (state === 'pouncing') {
            this.playPounceDemo();
        }

        // For resting, simulate the resting animation
        if (state === 'resting') {
            this.catMoodDisplay.textContent = '😴 休息演示中...';
        }

        // Update hint
        const hints = {
            'idle': '猫咪正在悠闲地休息',
            'curious': '猫咪正在好奇地观察',
            'running': '猫咪正在追逐毛线球',
            'excited': '猫咪非常兴奋！',
            'pouncing': '猫咪正在飞扑！',
            'resting': '猫咪累了正在休息喘气'
        };

        const demoHint = this.demoPanel.querySelector('.demo-hint');
        demoHint.textContent = hints[state] || '点击按钮预览猫咪动作';
    }

    playPounceDemo() {
        if (!this.demoMode || this.demoState !== 'pouncing') return;

        // Reset cat class to retrigger animation
        this.cat.className = 'cat';

        // Force reflow
        void this.cat.offsetWidth;

        // Apply pouncing class
        this.cat.className = 'cat pouncing';
        this.catMoodDisplay.textContent = '🐱 飞扑演示！';

        // Spawn particles
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (this.demoMode) {
                    this.spawnParticle(this.catPos.x, this.catPos.y);
                }
            }, i * 50);
        }

        // Replay after animation completes
        this.demoTimeout = setTimeout(() => {
            if (this.demoMode && this.demoState === 'pouncing') {
                this.playPounceDemo();
            }
        }, 1500);
    }

    exitDemoMode() {
        if (!this.demoMode) return;

        this.demoMode = false;
        this.demoState = null;
        document.body.classList.remove('demo-mode-active');

        // Clear demo timeout
        if (this.demoTimeout) {
            clearTimeout(this.demoTimeout);
            this.demoTimeout = null;
        }

        // Reset button states
        this.demoBtns.forEach(btn => {
            btn.classList.remove('active');
        });

        // Restore cat position
        if (this.savedCatPos) {
            this.catPos = { ...this.savedCatPos };
            this.cat.style.left = `${this.catPos.x}px`;
            this.cat.style.top = `${this.catPos.y}px`;
        }

        // Reset cat state
        this.isPouncing = false;
        this.isResting = false;
        this.preparingPounce = false;
        this.pounceCount = 0;

        // Return to normal idle state
        this.setCatState('idle');

        // Reset hint
        const demoHint = this.demoPanel.querySelector('.demo-hint');
        demoHint.textContent = '点击按钮预览猫咪动作';
    }

    render() {
        // Don't update position during pounce animation (CSS handles it)
        if (!this.isPouncing) {
            this.updateCatPosition();
        }
        this.updateYarnPosition();
        this.updateYarnTrail();
        if (!this.isResting) {
            this.updateCatEyes();
        }
    }

    updateCatPosition() {
        let rotation = 0;
        if (Math.abs(this.catVelocity.x) > 0.1 || Math.abs(this.catVelocity.y) > 0.1) {
            rotation = Math.atan2(this.catVelocity.y, this.catVelocity.x) * (180 / Math.PI);
            rotation = Math.max(-30, Math.min(30, rotation));
        }

        // Cat should face towards the yarn ball (not based on velocity)
        const dx = this.yarnPos.x - this.catPos.x;
        const scaleX = dx > 0 ? -1 : 1;

        this.cat.style.left = `${this.catPos.x}px`;
        this.cat.style.top = `${this.catPos.y}px`;

        // Apply facing direction to cat-body so it doesn't interfere with cat's animation transform
        const catBody = this.cat.querySelector('.cat-body');
        if (catBody) {
            catBody.style.transform = `scaleX(${scaleX})`;
        }

        // Set cat's base transform (without scaleX - that's on cat-body now)
        if (!this.isResting && !this.isPouncing && !this.preparingPounce) {
            this.cat.style.transform = `translate(-50%, -50%)`;
        }
    }

    updateYarnPosition() {
        this.yarnBall.style.left = `${this.yarnPos.x}px`;
        this.yarnBall.style.top = `${this.yarnPos.y}px`;

        const rotation = (this.totalDistance * 2) % 360;
        this.yarnBall.querySelector('.yarn-pattern').style.transform = `rotate(${rotation}deg)`;
    }

    updateYarnTrail() {
        if (this.trailPositions.length < 2) return;

        let pathData = `M ${this.trailPositions[0].x} ${this.trailPositions[0].y}`;

        for (let i = 1; i < this.trailPositions.length; i++) {
            const p1 = this.trailPositions[i];
            pathData += ` L ${p1.x} ${p1.y}`;
        }

        pathData += ` L ${this.yarnPos.x} ${this.yarnPos.y}`;

        this.yarnString.setAttribute('d', pathData);
    }

    updateCatEyes() {
        const pupils = this.cat.querySelectorAll('.cat-pupil');

        const dx = this.yarnPos.x - this.catPos.x;
        const dy = this.yarnPos.y - this.catPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const pupilOffsetX = (dx / distance) * 2;
            const pupilOffsetY = (dy / distance) * 2;

            pupils.forEach(pupil => {
                pupil.style.transform = `translate(${pupilOffsetX}px, ${pupilOffsetY}px)`;
            });
        }
    }

    spawnParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${x + (Math.random() - 0.5) * 20}px`;
        particle.style.top = `${y + (Math.random() - 0.5) * 20}px`;

        const colors = ['#ff6b9d', '#ff9f43', '#ffd8a8', '#ffb3cc'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        this.particles.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 800);
    }

    addPawPrint() {
        const pawPrint = document.createElement('div');
        pawPrint.className = 'paw-print';
        pawPrint.style.left = `${this.catPos.x + (Math.random() - 0.5) * 30}px`;
        pawPrint.style.top = `${this.catPos.y + 20 + (Math.random() - 0.5) * 10}px`;
        pawPrint.style.transform = `rotate(${Math.random() * 60 - 30}deg)`;

        this.pawPrints.appendChild(pawPrint);

        setTimeout(() => {
            pawPrint.remove();
        }, 2000);
    }

    showMeowText() {
        const meowText = document.createElement('div');
        meowText.className = 'meow-text';

        // Random meow variations
        const meows = ['喵～', '喵喵～', '喵！', '喵～♪'];
        meowText.textContent = meows[Math.floor(Math.random() * meows.length)];

        // Position above cat's head
        meowText.style.left = `${this.catPos.x}px`;
        meowText.style.top = `${this.catPos.y - 60}px`;

        this.gameArea.appendChild(meowText);

        // Remove after animation
        setTimeout(() => {
            meowText.remove();
        }, 1200);
    }

    playMeowSound() {
        // Create a simple meow sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create oscillator for meow sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Meow frequency pattern (starts high, slides down)
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.15);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.25);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.4);

            // Volume envelope
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.type = 'sine';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
        } catch (e) {
            // Audio not supported, silently fail
            console.log('Audio not available');
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CatYarnGame();
});

// Handle window resize
window.addEventListener('resize', () => {
    // Game will automatically adjust on next frame
});
