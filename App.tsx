import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Language, DictionaryEntry, ChatMessage, StoryResult } from './types';
import { SUPPORTED_LANGUAGES, MOCK_IMAGE_PLACEHOLDER } from './constants';
import { lookupTerm, playAudio, createChatSession, generateStoryFromNotes } from './services/geminiService';
import { SearchIcon, BookIcon, BrainIcon, SparklesIcon, SpeakerIcon, MessageCircleIcon, ChevronLeftIcon, SaveIcon } from './components/Icons';
import { Flashcard } from './components/Flashcard';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<ViewState>(ViewState.ONBOARDING);
  const [nativeLang, setNativeLang] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [targetLang, setTargetLang] = useState<Language>(SUPPORTED_LANGUAGES[1]);
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<DictionaryEntry | null>(null);
  
  const [notebook, setNotebook] = useState<DictionaryEntry[]>([]);
  const [story, setStory] = useState<StoryResult | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  
  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleStart = () => {
    setView(ViewState.HOME);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setView(ViewState.HOME); // Ensure we are on home/loading
    try {
      const result = await lookupTerm(query, nativeLang.name, targetLang.name);
      setCurrentResult(result);
      setView(ViewState.RESULT);
      
      // Initialize chat session for this term
      const session = createChatSession(`
        You are a helpful language tutor assistant. 
        The user is currently looking at the word: "${result.term}".
        The user speaks ${nativeLang.name} and is learning ${targetLang.name}.
        Answer questions about this specific word, its usage, or grammar casually.
      `);
      setChatSession(session);
      setChatHistory([{ role: 'model', text: `Hi! Ask me anything about "${result.term}"! 👋` }]);

    } catch (error) {
      console.error(error);
      alert("Oops! Something went wrong finding that word.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSave = () => {
    if (!currentResult) return;
    const exists = notebook.find(n => n.term === currentResult.term);
    if (exists) {
      setNotebook(notebook.filter(n => n.term !== currentResult.term));
    } else {
      setNotebook([currentResult, ...notebook]);
    }
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatSession) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg });
      setChatHistory(prev => [...prev, { role: 'model', text: result.text || "I didn't catch that." }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateStory = async () => {
    if (notebook.length < 3) {
      alert("Add at least 3 words to your notebook to create a story!");
      return;
    }
    setIsGeneratingStory(true);
    setView(ViewState.STORY);
    try {
      const result = await generateStoryFromNotes(notebook, nativeLang.name, targetLang.name);
      setStory(result);
    } catch (error) {
       console.error(error);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatOpen]);


  // --- Renderers ---

  if (view === ViewState.ONBOARDING) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <h1 className="text-5xl font-black mb-4 tracking-tight">LingoPop 🍭</h1>
        <p className="text-indigo-100 text-lg mb-8 max-w-md">The most fun way to learn new words instantly.</p>
        
        <div className="bg-white text-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-indigo-900 uppercase tracking-wide">I speak</label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_LANGUAGES.slice(0, 4).map(lang => (
                 <button 
                  key={lang.code}
                  onClick={() => setNativeLang(lang)}
                  className={`p-3 rounded-xl border-2 transition-all ${nativeLang.code === lang.code ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-100 hover:border-gray-200'}`}
                 >
                   <span className="mr-2">{lang.flag}</span> {lang.name}
                 </button>
              ))}
            </div>
             {/* Simple dropdown for rest if needed, kept simple for demo */}
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-indigo-900 uppercase tracking-wide">I want to learn</label>
            <div className="grid grid-cols-2 gap-2">
               {SUPPORTED_LANGUAGES.slice(0, 4).map(lang => (
                 <button 
                  key={lang.code}
                  onClick={() => setTargetLang(lang)}
                  className={`p-3 rounded-xl border-2 transition-all ${targetLang.code === lang.code ? 'border-pink-500 bg-pink-50 text-pink-700 font-bold' : 'border-gray-100 hover:border-gray-200'}`}
                 >
                   <span className="mr-2">{lang.flag}</span> {lang.name}
                 </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleStart}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl text-xl shadow-lg transform transition hover:scale-[1.02] active:scale-95"
          >
            Let's Go! 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-x-hidden max-w-md mx-auto bg-gray-50 shadow-2xl">
      
      {/* Sticky Header / Search */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
             <div className="flex items-center space-x-1">
                 <span className="text-xl">{targetLang.flag}</span>
                 <span className="font-bold text-gray-700">{targetLang.name}</span>
             </div>
             <h1 className="text-lg font-black text-indigo-600 tracking-tight">LingoPop</h1>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a word or sentence..."
            className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
          />
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
        </form>
      </div>

      {/* Main Content Area */}
      <div className="p-4">
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center mt-20 space-y-4 animate-pulse">
            <div className="w-20 h-20 bg-indigo-200 rounded-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <p className="text-indigo-400 font-bold text-sm uppercase tracking-widest mt-4">Cooking up definitions...</p>
          </div>
        )}

        {view === ViewState.HOME && !isLoading && (
            <div className="mt-12 text-center text-gray-400">
                <div className="bg-white p-6 rounded-3xl shadow-sm inline-block mb-4">
                    <span className="text-4xl">👋</span>
                </div>
                <p>Search for anything to start learning!</p>
            </div>
        )}

        {view === ViewState.RESULT && currentResult && !isLoading && (
          <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Main Word Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
               <div className="relative h-48 bg-gray-50 p-4">
                  <img 
                    src={currentResult.imageUrl || MOCK_IMAGE_PLACEHOLDER} 
                    alt={currentResult.term} 
                    className="w-full h-full object-contain"
                  />
                  <button 
                    onClick={toggleSave}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-full shadow-lg text-indigo-600 active:scale-90 transition-transform border border-gray-100"
                  >
                    <SaveIcon filled={!!notebook.find(n => n.term === currentResult.term)} />
                  </button>
               </div>
               
               <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-4xl font-black text-gray-900">{currentResult.term}</h2>
                    <button onClick={() => playAudio(currentResult.term)} className="p-3 bg-indigo-100 rounded-full text-indigo-600 hover:bg-indigo-200 active:scale-95 transition-colors">
                        <SpeakerIcon />
                    </button>
                  </div>
                  <p className="text-indigo-500 font-mono text-lg mb-4">{currentResult.phonetic}</p>
                  <p className="text-xl text-gray-700 leading-relaxed font-medium">{currentResult.definition}</p>
               </div>
            </div>

            {/* Usage Guide - The "Chatty" Part */}
            <div className="bg-yellow-400 rounded-3xl p-6 shadow-lg text-yellow-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-yellow-300 rounded-full opacity-50 blur-xl"></div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5"/> The Vibe Check
                </h3>
                <p className="font-medium leading-relaxed">{currentResult.usageGuide}</p>
            </div>

            {/* Examples */}
            <div className="space-y-4">
                <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider ml-2">Examples</h3>
                {currentResult.examples.map((ex, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-lg font-semibold text-gray-800">{ex.target}</p>
                            <button onClick={() => playAudio(ex.target)} className="text-gray-400 hover:text-indigo-500">
                                <SpeakerIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-gray-500">{ex.native}</p>
                    </div>
                ))}
            </div>
            
            <div className="h-12"></div>
          </div>
        )}

        {view === ViewState.NOTEBOOK && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-800">My Notebook</h2>
                <div className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
                    {notebook.length} words
                </div>
              </div>
              
              <div className="grid gap-3">
                 {notebook.length === 0 ? (
                     <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                         <BookIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                         <p>No words saved yet!</p>
                     </div>
                 ) : (
                     notebook.map(entry => (
                        <div key={entry.id} onClick={() => { setCurrentResult(entry); setView(ViewState.RESULT); }} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                             <img src={entry.imageUrl || MOCK_IMAGE_PLACEHOLDER} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                             <div>
                                 <h4 className="font-bold text-lg">{entry.term}</h4>
                                 <p className="text-sm text-gray-500 line-clamp-1">{entry.definition}</p>
                             </div>
                        </div>
                     ))
                 )}
              </div>

              {notebook.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-6">
                      <button 
                        onClick={() => setView(ViewState.FLASHCARDS)}
                        className="bg-indigo-600 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                      >
                          <BrainIcon className="w-8 h-8"/>
                          Study Mode
                      </button>
                      <button 
                        onClick={handleGenerateStory}
                        className="bg-pink-500 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                      >
                          <SparklesIcon className="w-8 h-8"/>
                          Story Time
                      </button>
                  </div>
              )}
           </div>
        )}

        {view === ViewState.STORY && (
            <div className="space-y-6">
                <button onClick={() => setView(ViewState.NOTEBOOK)} className="flex items-center text-gray-500 font-bold text-sm">
                    <ChevronLeftIcon className="w-4 h-4 mr-1"/> Back
                </button>
                
                {isGeneratingStory ? (
                    <div className="text-center py-20 animate-pulse">
                        <div className="text-6xl mb-4">🧙‍♂️</div>
                        <h3 className="text-xl font-bold text-gray-800">Weaving a story...</h3>
                        <p className="text-gray-500">Combining your vocabulary into magic.</p>
                    </div>
                ) : story && (
                    <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-pink-500">
                        <h2 className="text-3xl font-black mb-6 text-gray-900">{story.title}</h2>
                        <div className="prose prose-lg text-gray-700 leading-loose">
                            {story.content}
                        </div>
                        <button onClick={() => playAudio(story.content)} className="mt-8 flex items-center gap-2 text-pink-600 font-bold bg-pink-50 px-4 py-2 rounded-full">
                            <SpeakerIcon className="w-5 h-5"/> Read to me
                        </button>
                    </div>
                )}
            </div>
        )}

        {view === ViewState.FLASHCARDS && (
            <div className="h-[80vh] flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setView(ViewState.NOTEBOOK)} className="p-2 bg-white rounded-full shadow text-gray-600">
                        <ChevronLeftIcon />
                    </button>
                    <span className="font-bold text-gray-500">Flashcards</span>
                    <div className="w-10"></div>
                 </div>
                 
                 <div className="flex-grow flex items-center justify-center">
                    {notebook.length > 0 ? (
                        /* Simple carousel logic for demo - just showing random or first */
                        <div className="w-full">
                           <Flashcard entry={notebook[0]} />
                           <p className="text-center text-gray-400 mt-8 text-sm">
                               (In a full app, swipe for next card)
                           </p>
                        </div>
                    ) : (
                        <p>No cards available.</p>
                    )}
                 </div>
            </div>
        )}

      </div>

      {/* Floating Chat Button (Only on Result View) */}
      {view === ViewState.RESULT && !isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-24 right-4 bg-black text-white p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform"
          >
              <MessageCircleIcon className="w-6 h-6" />
          </button>
      )}

      {/* Chat Interface Slide-up */}
      {isChatOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center">
              <div className="bg-white w-full max-w-md h-[80vh] rounded-t-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs">AI</div>
                        <span className="font-bold text-gray-800">Tutor Chat</span>
                      </div>
                      <button onClick={() => setIsChatOpen(false)} className="text-gray-500 font-bold text-sm bg-gray-200 px-3 py-1 rounded-full">Close</button>
                  </div>
                  
                  <div className="flex-grow overflow-y-auto p-4 space-y-4">
                      {chatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                                  msg.role === 'user' 
                                  ? 'bg-indigo-600 text-white rounded-br-none' 
                                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
                              }`}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      {isChatLoading && (
                          <div className="flex justify-start">
                              <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-none">
                                  <div className="flex space-x-1">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                  </div>
                              </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleChatSend} className="p-4 border-t bg-white">
                      <div className="flex gap-2">
                          <input 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="flex-grow bg-gray-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ask about this word..."
                          />
                          <button type="submit" disabled={!chatInput.trim()} className="bg-indigo-600 text-white p-3 rounded-full disabled:opacity-50">
                              <ChevronLeftIcon className="w-6 h-6 rotate-180" />
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Bottom Navigation */}
      {view !== ViewState.ONBOARDING && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-6 flex justify-around items-center z-40 max-w-md mx-auto">
              <button 
                onClick={() => setView(ViewState.HOME)}
                className={`flex flex-col items-center gap-1 ${view === ViewState.HOME || view === ViewState.RESULT ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                  <SearchIcon className="w-6 h-6" />
                  <span className="text-xs font-bold">Search</span>
              </button>
              <button 
                onClick={() => setView(ViewState.NOTEBOOK)}
                className={`flex flex-col items-center gap-1 ${view === ViewState.NOTEBOOK || view === ViewState.FLASHCARDS || view === ViewState.STORY ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                  <BookIcon className="w-6 h-6" />
                  <span className="text-xs font-bold">Notebook</span>
              </button>
          </div>
      )}
    </div>
  );
};

export default App;