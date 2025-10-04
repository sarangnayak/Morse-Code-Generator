document.addEventListener('DOMContentLoaded', () => {
    // Morse Code Mapping
    const MORSE_CODE_MAP = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..', 
        '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', 
        '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', 
        ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
        ' ': '/'
    };

    // DOM Elements
    const textInput = document.getElementById('textInput');
    const translateBtn = document.getElementById('translateBtn');
    const stopBtn = document.getElementById('stopBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const visualizer = document.getElementById('visualizer');
    const rippleContainer = document.getElementById('rippleContainer');
    const morseOutput = document.getElementById('morseOutput');
    const copyBtn = document.getElementById('copyBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const speedControl = document.getElementById('speedControl');
    const speedValue = document.getElementById('speedValue');
    const volumeControl = document.getElementById('volumeControl');
    const volumeValue = document.getElementById('volumeValue');
    const soundToggle = document.getElementById('soundToggle');
    const rippleToggle = document.getElementById('rippleToggle');
    const starsContainer = document.getElementById('stars');
    const nebulaCloudsContainer = document.getElementById('nebulaClouds');

    // App State
    let isPlaying = false;
    let currentPlayback = null;
    let ditDuration = 100; // Base duration for a dit in ms

    // Initialize Tone.js Synth
    const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination();
    
    // Set initial volume
    synth.volume.value = Tone.gainToDb(volumeControl.value / 100);

    // Initialize the background
    createStarfield();
    createNebulaClouds();

    // Functions
    function textToMorse(text) {
        return text.toUpperCase().split('').map(char => {
            const morse = MORSE_CODE_MAP[char];
            return morse !== undefined ? morse : `[${char}]`;
        }).join(' ');
    }

    function updateSpeed() {
        // Convert WPM to dit duration in ms
        // Standard formula: PARIS = 50 time units, WPM = 1200 / (time unit in ms)
        const wpm = parseInt(speedControl.value);
        ditDuration = 1200 / wpm;
        speedValue.textContent = wpm;
    }

    function updateVolume() {
        const volume = volumeControl.value / 100;
        synth.volume.value = Tone.gainToDb(volume);
        volumeValue.textContent = volumeControl.value;
    }

    function showStatus(message, type = 'success') {
        statusIndicator.textContent = message;
        statusIndicator.className = `status-indicator ${type}`;
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusIndicator.className = 'status-indicator';
            }, 3000);
        }
    }

    // FIXED COPY FUNCTION
    function copyToClipboard(text) {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        
        // Select and copy the text
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (successful) {
                showStatus('Morse code copied to clipboard!');
                return true;
            } else {
                showStatus('Failed to copy text', 'error');
                return false;
            }
        } catch (err) {
            document.body.removeChild(textarea);
            showStatus('Failed to copy text', 'error');
            console.error('Copy failed: ', err);
            return false;
        }
    }

    function wait(ms) {
        return new Promise(resolve => {
            if (currentPlayback && currentPlayback.isStopped) {
                resolve('stopped');
                return;
            }
            setTimeout(resolve, ms);
        });
    }

    function createRipple() {
        if (!rippleToggle.checked) return;
        
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.width = '100px';
        ripple.style.height = '100px';
        ripple.style.left = '50px';
        ripple.style.top = '50px';
        ripple.style.borderColor = getRandomRippleColor();
        
        rippleContainer.appendChild(ripple);
        
        // Animate the ripple
        anime({
            targets: ripple,
            width: '400px',
            height: '400px',
            left: '-100px',
            top: '-100px',
            opacity: [0.7, 0],
            duration: 1500,
            easing: 'easeOutQuad',
            complete: () => {
                ripple.remove();
            }
        });
    }

    function getRandomRippleColor() {
        const colors = [
            '#8a2be2', // primary purple
            '#c71585', // magenta
            '#4B0082', // indigo
            '#9370DB', // medium purple
            '#DA70D6'  // orchid
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    async function playMorseCode(morseString) {
        if (isPlaying) return;
        
        isPlaying = true;
        translateBtn.disabled = true;
        stopBtn.disabled = false;
        morseOutput.innerHTML = '';
        
        // Create playback controller
        currentPlayback = { isStopped: false };
        
        const morseChars = morseString.split('');
        let outputHTML = '';
        
        for (let i = 0; i < morseChars.length; i++) {
            if (currentPlayback.isStopped) break;
            
            const char = morseChars[i];
            const spanId = `char-${i}`;
            
            outputHTML += `<span id="${spanId}" class="morse-char">${char}</span>`;
            morseOutput.innerHTML = outputHTML;
            
            const currentChar = document.getElementById(spanId);
            
            // Highlight the current character
            currentChar.classList.add('active');
            
            switch (char) {
                case '.':
                    await playSignal(ditDuration, currentPlayback);
                    await wait(ditDuration); // Inter-signal gap
                    break;
                case '-':
                    await playSignal(ditDuration * 3, currentPlayback);
                    await wait(ditDuration); // Inter-signal gap
                    break;
                case ' ':
                    await wait(ditDuration * 3); // Inter-letter gap
                    break;
                case '/':
                    await wait(ditDuration * 7); // Inter-word gap
                    break;
                default:
                    // For unknown characters, just wait a bit
                    await wait(ditDuration * 3);
            }
            
            // Remove highlight
            currentChar.classList.remove('active');
            
            // Small delay between characters for better visibility
            await wait(50);
        }
        
        isPlaying = false;
        translateBtn.disabled = false;
        stopBtn.disabled = true;
        currentPlayback = null;
        
        if (!stopBtn.disabled) {
            showStatus('Playback completed');
        }
    }

    async function playSignal(duration, playback) {
        if (playback.isStopped) return;
        
        // Visual feedback
        visualizer.style.opacity = '0.8';
        createRipple();
        
        // Audio feedback if enabled
        if (soundToggle.checked) {
            synth.triggerAttackRelease('C5', duration / 1000);
        }
        
        // Wait for the signal duration
        await wait(duration);
        
        // Turn off visual
        visualizer.style.opacity = '0';
    }

    function stopPlayback() {
        if (currentPlayback) {
            currentPlayback.isStopped = true;
            isPlaying = false;
            translateBtn.disabled = false;
            stopBtn.disabled = true;
            visualizer.style.opacity = '0';
            synth.triggerRelease();
            showStatus('Playback stopped');
        }
    }

    function createStarfield() {
        const starCount = 150;
        
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random properties for each star
            const size = Math.random() * 2 + 1;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const twinkleDuration = Math.random() * 5 + 3;
            const twinkleDelay = Math.random() * 5;
            
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.left = `${posX}%`;
            star.style.top = `${posY}%`;
            star.style.setProperty('--twinkle-duration', `${twinkleDuration}s`);
            star.style.setProperty('--twinkle-delay', `${twinkleDelay}s`);
            
            starsContainer.appendChild(star);
        }
    }

    function createNebulaClouds() {
        const cloudCount = 5;
        const colors = ['#8a2be2', '#4B0082', '#c71585', '#191970', '#483D8B'];
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'nebula-cloud';
            
            // Random properties for each cloud
            const size = Math.random() * 400 + 200;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const driftDuration = Math.random() * 60 + 30;
            
            cloud.style.width = `${size}px`;
            cloud.style.height = `${size}px`;
            cloud.style.left = `${posX}%`;
            cloud.style.top = `${posY}%`;
            cloud.style.setProperty('--cloud-color', color);
            cloud.style.setProperty('--drift-duration', `${driftDuration}s`);
            
            nebulaCloudsContainer.appendChild(cloud);
        }
    }

    // Event Listeners
    translateBtn.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (!text) {
            showStatus('Please enter some text to translate', 'error');
            return;
        }
        
        const morse = textToMorse(text);
        morseOutput.textContent = morse;
        playMorseCode(morse);
    });

    stopBtn.addEventListener('click', stopPlayback);

    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('active');
    });

    // FIXED COPY BUTTON EVENT LISTENER
    copyBtn.addEventListener('click', () => {
        const morseText = morseOutput.textContent.trim();
        if (!morseText) {
            showStatus('No Morse code to copy', 'error');
            return;
        }
        
        // Try modern clipboard API first, then fallback to execCommand
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(morseText).then(() => {
                showStatus('Morse code copied to clipboard!');
            }).catch(err => {
                // Fallback to execCommand if modern API fails
                console.log('Modern clipboard API failed, using fallback:', err);
                copyToClipboard(morseText);
            });
        } else {
            // Use fallback method
            copyToClipboard(morseText);
        }
    });

    speedControl.addEventListener('input', updateSpeed);
    volumeControl.addEventListener('input', updateVolume);

    // Initialize values
    updateSpeed();
    updateVolume();

    // GSAP Scroll Animations
    gsap.registerPlugin(ScrollTrigger);

    const infoSections = document.querySelectorAll('.info-section');
    infoSections.forEach(section => {
        const content = section.querySelector('.info-content');
        const visual = section.querySelector('.info-visual');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });

        tl.from(content, { opacity: 0, x: -50, duration: 1, ease: 'power3.out' })
          .from(visual, { opacity: 0, scale: 0.8, duration: 1, ease: 'power3.out' }, '-=0.7');
    });

    // Add visual effect to the main title
    gsap.to('.main-title', {
        backgroundPosition: '200% 0',
        ease: 'sine.inOut',
        duration: 3,
        repeat: -1,
        yoyo: true
    });
});
