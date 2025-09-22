document.addEventListener('DOMContentLoaded', () => {
    
    const MORSE_CODE_MAP = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/'
    };
    const DIT_DURATION = 100; 

    
    const textInput = document.getElementById('textInput');
    const translateBtn = document.getElementById('translateBtn');
    const visualizer = document.getElementById('visualizer');
    const morseOutput = document.getElementById('morseOutput');

    const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination();

    function textToMorse(text) {
        return text.toUpperCase().split('').map(char => MORSE_CODE_MAP[char] || '').join(' ');
    }

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function playMorseCode(morseString) {
        translateBtn.disabled = true;
        morseOutput.innerHTML = ''; 
        
        const morseChars = morseString.split('');
        for (const char of morseChars) {
            let span = document.createElement('span');
            span.className = 'morse-char';
            span.textContent = char;
            morseOutput.appendChild(span);

            anime({
                targets: span,
                opacity: [0, 1],
                translateY: [-20, 0],
                duration: 300,
                easing: 'easeOutExpo'
            });

            switch (char) {
                case '.':
                    await playSignal(DIT_DURATION);
                    await wait(DIT_DURATION); // Inter-signal gap
                    break;
                case '-':
                    await playSignal(DIT_DURATION * 3);
                    await wait(DIT_DURATION); // Inter-signal gap
                    break;
                case ' ':
                    await wait(DIT_DURATION * 3); // Inter-letter gap
                    break;
                case '/':
                    await wait(DIT_DURATION * 7); // Inter-word gap
                    break;
            }
        }
        translateBtn.disabled = false;
    }

    async function playSignal(duration) {
        
        synth.triggerAttackRelease('C5', duration / 1000);
        
        await anime({
            targets: visualizer,
            opacity: [0, 0.8, 0],
            duration: duration,
            easing: 'linear'
        }).finished;
    }

    translateBtn.addEventListener('click', () => {
        const morse = textToMorse(textInput.value);
        playMorseCode(morse);
    });

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
});

