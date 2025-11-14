
import React from 'react';

interface HistoryPanelProps {
  history: string[];
  show: boolean;
  onClose: () => void;
  onRecall: (calculation: string) => void;
  onClear: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, show, onClose, onRecall, onClear }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-10 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 right-0 h-full w-4/5 max-w-sm bg-gray-800 text-white z-20 shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col ${show ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 id="history-title" className="text-xl font-semibold">History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close history panel">&times;</button>
        </div>
        
        {history.length > 0 ? (
          <>
            <ul className="p-4 overflow-y-auto flex-grow">
              {history.map((calc, index) => (
                <li 
                  key={index} 
                  className="py-2 border-b border-gray-700 cursor-pointer hover:bg-gray-700 rounded p-2 text-right transition-colors" 
                  onClick={() => onRecall(calc)}
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && onRecall(calc)}
                >
                  <div className="text-gray-400 text-sm break-words">{calc.split(' = ')[0]}</div>
                  <div className="text-lg font-bold">= {calc.split(' = ')[1]}</div>
                </li>
              ))}
            </ul>
            <div className="p-4 border-t border-gray-700">
                <button onClick={onClear} className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg transition-colors font-semibold">
                    Clear History
                </button>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-gray-500 flex-grow flex items-center justify-center">
            <p>No history yet.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default HistoryPanel;
