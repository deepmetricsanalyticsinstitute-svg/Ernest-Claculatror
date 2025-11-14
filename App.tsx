
import React, { useState, useEffect, useRef } from 'react';
import CalculatorButton from './components/CalculatorButton';
import HistoryPanel from './components/HistoryPanel';

// FIX: Add SpeechRecognition types to the global window object to resolve TypeScript errors.
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// For browsers that support SpeechRecognition under a vendor prefix.
// FIX: Renamed to SpeechRecognitionAPI to avoid shadowing the global SpeechRecognition type.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

const App: React.FC = () => {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState<boolean>(false);
  const [angleMode, setAngleMode] = useState<'rad' | 'deg'>('rad');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Speech recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  // FIX: The type `SpeechRecognition` should now resolve correctly because the constant was renamed, removing the name collision.
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // FIX: Use renamed constant to check for browser support.
    if (!SpeechRecognitionAPI) {
      setSpeechError("Speech recognition is not supported in this browser.");
      return;
    }

    // FIX: Use renamed constant to instantiate SpeechRecognition.
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setSpeechError(`Error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Automatically press equals if an operation is pending
      if (operator && firstOperand !== null && !waitingForSecondOperand) {
        handleEquals();
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      processSpeech(transcript);
    };

    recognitionRef.current = recognition;
  }, [operator, firstOperand, waitingForSecondOperand]); // Re-create handler closures when state changes

  const processSpeech = (transcript: string): void => {
    clearAll();
    let processedTranscript = transcript.toLowerCase();
    
    const replacements: { [key: string]: string } = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'zero': '0',
        'point': '.', 'dot': '.',
        'plus': '+', 'add': '+',
        'minus': '-', 'subtract': '-',
        'times': '*', 'multiply by': '*', 'multiplied by': '*',
        'divided by': '/', 'divide': '/',
        'power': '^', 'to the power of': '^'
    };

    // Replace multi-word phrases first
    processedTranscript = processedTranscript
      .replace(/multiply by/g, ' * ')
      .replace(/multiplied by/g, ' * ')
      .replace(/divided by/g, ' / ')
      .replace(/to the power of/g, ' ^ ');
    
    const parts = processedTranscript.split(' ');

    let commandQueue: (() => void)[] = [];
    
    // Handle specific phrases like "square root of 64"
    if (processedTranscript.startsWith('square root of')) {
        const numberPart = processedTranscript.substring('square root of'.length).trim();
        const numericValue = numberPart.split('').map(char => replacements[char] || char).join('');
        setDisplayValue(numericValue);
        commandQueue.push(handleSquareRoot);
    } else {
        parts.forEach(part => {
            if (replacements[part]) {
                const action = replacements[part];
                if (['+', '-', '*', '/', '^'].includes(action)) {
                    commandQueue.push(() => performOperation(action));
                } else {
                    commandQueue.push(() => inputDigit(action));
                }
            } else if (!isNaN(parseFloat(part))) {
                commandQueue.push(() => {
                    if (waitingForSecondOperand) {
                        setDisplayValue(part);
                        setWaitingForSecondOperand(false);
                    } else {
                        setDisplayValue(displayValue === '0' ? part : displayValue + part);
                    }
                });
            }
        });
    }

    // Execute commands sequentially
    commandQueue.forEach(cmd => cmd());
  };


  const handleListen = () => {
    if (isListening || !recognitionRef.current) {
      return;
    }
    try {
        recognitionRef.current.start();
    } catch (e) {
        console.error("Speech recognition could not be started: ", e);
        setSpeechError("Could not start listening. Please check permissions.");
    }
  };


  const inputDigit = (digit: string): void => {
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const inputDecimal = (): void => {
    if (waitingForSecondOperand) {
      setDisplayValue('0.');
      setWaitingForSecondOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const clearAll = (): void => {
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };
  
  const toggleSign = (): void => {
    setDisplayValue(
      displayValue.charAt(0) === '-'
        ? displayValue.substring(1)
        : '-' + displayValue
    );
  };

  const applyUnaryOperation = (operation: (n: number) => number, getExpression: (n: number) => string): void => {
    const inputValue = parseFloat(displayValue);
    if (isNaN(inputValue)) return;
    const result = operation(inputValue);

    const expression = getExpression(inputValue);
    setHistory(prevHistory => [`${expression} = ${result}`, ...prevHistory].slice(0, 50));
    
    setDisplayValue(String(result));
    setWaitingForSecondOperand(true);
  };

  const inputPercent = (): void => {
    applyUnaryOperation(n => n / 100, n => `${n}%`);
  };

  const toggleAngleMode = (): void => {
    setAngleMode(prevMode => (prevMode === 'rad' ? 'deg' : 'rad'));
  };

  const handleTrig = (func: 'sin' | 'cos' | 'tan') => {
    applyUnaryOperation((n) => {
      const radians = angleMode === 'deg' ? n * (Math.PI / 180) : n;
      switch (func) {
        case 'sin':
          return Math.sin(radians);
        case 'cos':
          return Math.cos(radians);
        case 'tan':
          const cosVal = Math.cos(radians);
          if (Math.abs(cosVal) < 1e-15) return NaN;
          return Math.tan(radians);
        default:
          return NaN;
      }
    }, n => `${func}(${n})`);
  };

  const handleSquareRoot = () => applyUnaryOperation(Math.sqrt, n => `√(${n})`);
  const handleSquare = () => applyUnaryOperation((n) => Math.pow(n, 2), n => `sqr(${n})`);

  const performOperation = (nextOperator: string): void => {
    const inputValue = parseFloat(displayValue);

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      setDisplayValue(String(result));
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (first: number, second: number, op: string): number => {
    switch (op) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '*':
        return first * second;
      case '/':
        return first / second;
      case '^':
        return Math.pow(first, second);
      default:
        return second;
    }
  };

  const getOperatorSymbol = (op: string): string => {
    switch (op) {
      case '*': return '×';
      case '/': return '÷';
      default: return op;
    }
  };
  
  const handleEquals = (): void => {
      if (operator && firstOperand !== null) {
          const inputValue = parseFloat(displayValue);
          const result = calculate(firstOperand, inputValue, operator);
          
          const expression = `${firstOperand} ${getOperatorSymbol(operator)} ${inputValue}`;
          setHistory(prevHistory => [`${expression} = ${result}`, ...prevHistory].slice(0, 50));

          setDisplayValue(String(result));
          setFirstOperand(null);
          setOperator(null);
          setWaitingForSecondOperand(true);
      }
  }

  const recallFromHistory = (calculation: string) => {
    const result = calculation.split(' = ')[1];
    if (result) {
        setDisplayValue(result);
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecondOperand(true);
        setShowHistory(false);
    }
  };

  const clearHistory = () => setHistory([]);

  const isCleared = displayValue === '0' && firstOperand === null;
  const displayFontSize = displayValue.length > 9 ? 'text-4xl' : 'text-6xl';

  return (
    <>
      <div className="bg-gray-900 min-h-screen flex items-center justify-center font-sans">
        <div className="w-full max-w-xs sm:max-w-sm">
          <div className="bg-black rounded-3xl shadow-2xl p-4">
            <div className="flex justify-between items-center h-8 pr-2 pl-2">
                <button 
                  onClick={handleListen} 
                  disabled={!SpeechRecognitionAPI}
                  className={`transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                  aria-label="Use voice input"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
                <button 
                    onClick={() => setShowHistory(true)} 
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="View calculation history"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>
            <div className="h-6 text-center text-gray-400 text-sm mb-1">
                {isListening ? "Listening..." : speechError || " "}
            </div>
            <div className={`text-white text-right ${displayFontSize} font-light mb-4 px-4 break-words h-24 flex items-end justify-end`}>
              {displayValue}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <CalculatorButton variant="dark-gray" onClick={() => handleTrig('sin')}>sin</CalculatorButton>
              <CalculatorButton variant="dark-gray" onClick={() => handleTrig('cos')}>cos</CalculatorButton>
              <CalculatorButton variant="dark-gray" onClick={() => handleTrig('tan')}>tan</CalculatorButton>
              <CalculatorButton variant="dark-gray" onClick={toggleAngleMode}>
                {angleMode.toUpperCase()}
              </CalculatorButton>

              <CalculatorButton variant="dark-gray" onClick={handleSquareRoot}>√</CalculatorButton>
              <CalculatorButton variant="dark-gray" onClick={handleSquare}>x²</CalculatorButton>
              <CalculatorButton variant="dark-gray" onClick={() => performOperation('^')}>xʸ</CalculatorButton>
              <CalculatorButton variant="operator" onClick={() => performOperation('/')}>
                ÷
              </CalculatorButton>
              
              <CalculatorButton variant="light" onClick={clearAll}>
                {isCleared ? 'AC' : 'C'}
              </CalculatorButton>
              <CalculatorButton variant="light" onClick={toggleSign}>
                +/-
              </CalculatorButton>
              <CalculatorButton variant="light" onClick={inputPercent}>
                %
              </CalculatorButton>
              <CalculatorButton variant="operator" onClick={() => performOperation('*')}>
                ×
              </CalculatorButton>

              <CalculatorButton variant="dark" onClick={() => inputDigit('7')}>
                7
              </CalculatorButton>
              <CalculatorButton variant="dark" onClick={() => inputDigit('8')}>
                8
              </CalculatorButton>
              <CalculatorButton variant="dark" onClick={() => inputDigit('9')}>
                9
              </CalculatorButton>
              <CalculatorButton variant="operator" onClick={() => performOperation('-')}>
                -
              </CalculatorButton>

              <CalculatorButton variant="dark" onClick={() => inputDigit('4')}>
                4
              </CalculatorButton>
              <CalculatorButton variant="dark" onClick={() => inputDigit('5')}>
                5
              </CalculatorButton>
              <CalculatorButton variant="dark" onClick={() => inputDigit('6')}>
                6
              </CalculatorButton>
              <CalculatorButton variant="operator" onClick={() => performOperation('+')}>
                +
              </CalculatorButton>
              
              <CalculatorButton variant="dark" className="col-start-1 col-end-3" onClick={() => inputDigit('0')}>0</CalculatorButton>
              <CalculatorButton variant="dark" onClick={inputDecimal}>.</CalculatorButton>
              <CalculatorButton variant="operator" onClick={handleEquals}>=</CalculatorButton>
            </div>
          </div>
        </div>
      </div>
      <HistoryPanel
        history={history}
        show={showHistory}
        onClose={() => setShowHistory(false)}
        onRecall={recallFromHistory}
        onClear={clearHistory}
      />
    </>
  );
};

export default App;
