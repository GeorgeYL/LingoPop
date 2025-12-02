import React, { useState } from 'react';
import { DictionaryEntry } from '../types';
import { SpeakerIcon } from './Icons';
import { playAudio } from '../services/geminiService';
import { MOCK_IMAGE_PLACEHOLDER } from '../constants';

interface FlashcardProps {
  entry: DictionaryEntry;
}

export const Flashcard: React.FC<FlashcardProps> = ({ entry }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    playAudio(entry.term);
  };

  return (
    <div 
      className="group w-full h-96 [perspective:1000px] cursor-pointer"
      onClick={handleFlip}
    >
      <div 
        className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front */}
        <div className="absolute w-full h-full bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-6 [backface-visibility:hidden] border-4 border-indigo-100">
          <div className="w-48 h-48 mb-6 rounded-2xl overflow-hidden shadow-md bg-indigo-50">
             <img 
                src={entry.imageUrl || MOCK_IMAGE_PLACEHOLDER} 
                alt={entry.term} 
                className="w-full h-full object-cover"
             />
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-2">{entry.term}</h3>
          <div className="text-indigo-500 text-sm font-medium">{entry.phonetic}</div>
          <button 
             onClick={handleAudio}
             className="mt-4 p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
          >
             <SpeakerIcon className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 text-gray-400 text-xs uppercase tracking-wider">Tap to Flip</div>
        </div>

        {/* Back */}
        <div className="absolute w-full h-full bg-indigo-600 text-white rounded-3xl shadow-xl flex flex-col p-8 [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-y-auto">
            <h4 className="text-xl font-bold mb-4 border-b border-indigo-400 pb-2">Definition</h4>
            <p className="text-lg leading-relaxed mb-6">{entry.definition}</p>
            
            <h4 className="text-lg font-bold mb-2 text-indigo-200">Example</h4>
            <div className="bg-indigo-700/50 p-4 rounded-xl">
                 <p className="text-lg italic mb-1">"{entry.examples[0]?.target}"</p>
                 <p className="text-sm text-indigo-200">{entry.examples[0]?.native}</p>
            </div>
            <div className="flex-grow"></div>
            <div className="text-center text-indigo-300 text-xs uppercase tracking-wider mt-4">Tap to Flip Back</div>
        </div>
      </div>
    </div>
  );
};