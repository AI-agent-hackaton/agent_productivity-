"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Spinner } from './components/Spinner';
import Image from 'next/image';
import { Input } from './components/Input';
import { ArrowUp } from 'lucide-react';

const SimpleMarkdown = ({ children }) => {
  const formatText = (text) => {
    if (typeof text !== 'string') return text;
    
    // Handle code blocks (```code```)
    text = text.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto my-3 border"><code class="text-gray-800">$1</code></pre>');
    
    // Handle inline code (`code`)
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm text-red-600 font-mono">$1</code>');
    
    // Handle bold (**text** or __text__)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong class="font-bold">$1</strong>');
    
    // Handle italic (*text* or _text_)
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    text = text.replace(/_(.*?)_/g, '<em class="italic">$1</em>');
    
    // Handle headers
    text = text.replace(/^### (.*$)/gm, '<h3 class="text-m font-semibold mt-4 mb-2">$1</h3>');
    text = text.replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-3">$1</h2>');
    text = text.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>');
    
    // Handle bullet points
    text = text.replace(/^\* (.*$)/gm, '<li class="ml-4 mb-1">$1</li>');
    text = text.replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">$1</li>');
    
    // Handle numbered lists
    text = text.replace(/^\d+\. (.*$)/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>');
    
    // Handle line breaks and paragraphs
    text = text.replace(/\n\n/g, '</p><p class="mb-3">');
    text = text.replace(/\n/g, '<br>');
    
    return text;
  };

  return (
    <div 
      className="prose prose-sm text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ 
        __html: `<p class="mb-2">${formatText(children)}</p>` 
      }} 
    />
  );
};

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full border p-5 w-full gap-4">
      <div className="flex-1 p-4 h-full border-5 border-[#191919] rounded-lg">
        <div className="flex flex-col items-center justify-center h-full gap-4">
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto border-5 border-[#191919] rounded-lg">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`w-full px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-[#112A46] text-white rounded-br-none' 
                  : 'bg-white text-gray-800 shadow-md rounded-bl-none border border-gray-200'
              }`}
            >
              <SimpleMarkdown>{message.text}</SimpleMarkdown>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

const TaskManager = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || isTyping) return;

    const newMessages: Message[] = [...messages, { id: Date.now(), text: inputText, sender: 'user' }];
    setMessages(newMessages);
    const currentInputText = inputText;
    setInputText('');
    setIsTyping(true);
    setIsThinking(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/user_query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInputText }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, text: data.response, sender: 'bot' }]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsTyping(false);
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full border p-5 w-full gap-4">
      <div className="flex-1 flex flex-col items-center justify-center h-full border-5 border-[#191919] rounded-lg p-4">
        <div className="flex flex-row items-center justify-center gap-4">
            <Image
              src={isThinking ? '/thinking_state.svg' : '/normal_state.svg'}
              alt={isThinking ? 'Thinking state' : 'Normal state'}
              width={200}
              height={200}
              className="transition-all duration-300"
            />
          <p className="text-gray-600 text-4xl font-bold">
            {isThinking ? 'Thinking...' : 'Ask me anything'}
          </p> 
        </div>
        <div className="w-full max-w-lg mt-4">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            onSubmit={handleSendMessage}
            placeholder="Type something..."
            disabled={isTyping}
            buttonContent={<ArrowUp size={20} />}
          />
        </div>
      </div>

      <div className="flex-3 p-4 space-y-4 overflow-y-auto border-5 border-[#191919] rounded-lg">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`w-full px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-[#112A46] text-white rounded-br-none' 
                  : 'bg-white text-gray-800 shadow-md rounded-bl-none border border-gray-200'
              }`}
            >
              <SimpleMarkdown>{message.text}</SimpleMarkdown>
              </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 shadow-md rounded-lg rounded-bl-none border border-gray-200 px-4 py-2 max-w-xs">
              <Spinner />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default function UI() {
  return (
    <div className="flex flex-row gap-4 max-w-7xl mx-auto h-screen">
      <TaskManager />
      <Chatbot />
    </div>
  );
}
