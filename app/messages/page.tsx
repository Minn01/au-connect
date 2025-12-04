'use client'

import { Search, SquarePen, Send, ImagePlus, Paperclip, Smile, MoreVertical, ArrowLeft } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

// Mock data for conversations
const mockConversations = [
  {
    id: 1,
    name: "Floyd Miles",
    avatar: "/au-bg.png",
    lastMessage: "You: Ok, let's do that!",
    time: "17:03",
    unread: 0
  },
  {
    id: 2,
    name: "Floyd Miles",
    avatar: "/au-bg.png",
    lastMessage: "You: Ok, let's do that!",
    time: "17:03",
    unread: 0
  },
  {
    id: 3,
    name: "Floyd Miles",
    avatar: "/au-bg.png",
    lastMessage: "You: Ok, let's do that!",
    time: "17:03",
    unread: 0
  }
];

// Mock data for messages
const mockMessages = [
  {
    id: 1,
    sender: "other",
    text: "hello, what can i do for you ?",
    time: "17:03"
  },
  {
    id: 2,
    sender: "me",
    text: "I would like arrange a meeting",
    time: "17:04"
  },
  {
    id: 3,
    sender: "other",
    text: "Would you like to do it on monday ?",
    time: "17:05"
  },
  {
    id: 4,
    sender: "me",
    text: "Ok, let's do that",
    time: "17:06",
    status: "seen"
  }
];

export default function MessagePages() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [messageInput, setMessageInput] = useState("What time would you like to meet ?");
  const [showChat, setShowChat] = useState(false);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  return (
    <div className="h-screen flex flex-col md:grid md:grid-cols-12 md:h-full md:px-4 lg:px-40 xl:px-60 md:pt-6">
      {/* MOBILE: Full screen toggle between list and chat */}
      {/* TABLET (md): Side by side 5-7 split */}
      {/* DESKTOP (lg+): Side by side 4-8 split */}
      
      {/* Conversations List */}
      <div className={`
        ${showChat ? 'hidden' : 'flex'}
        md:flex md:col-span-5
        lg:col-span-4
        flex-col h-full bg-white 
        md:border md:border-gray-300
      `}>
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-4 md:px-5 md:pt-6 md:pb-4">
          <div className="flex items-center flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus-within:border-gray-400">
            <Search className="text-gray-400 w-5 h-5 shrink-0" />
            <input
              type="text"
              placeholder="Search contacts"
              className="ml-3 text-sm text-gray-600 placeholder-gray-400 w-full border-none focus:outline-none bg-transparent"
            />
          </div>
          <SquarePen className="text-gray-500 w-5 h-5 shrink-0 cursor-pointer hover:text-gray-700" />
        </div>
        
        <div className="border-t border-gray-200" />
        
        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {mockConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation)}
              className={`flex items-center px-4 py-4 md:px-5 cursor-pointer hover:bg-gray-200 transition-colors ${
                selectedConversation.id === conversation.id ? 'bg-gray-200' : ''
              }`}
            >
              <div className="relative w-12 h-12 shrink-0">
                <Image
                  src="/au-bg.png"
                  alt={conversation.name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{conversation.name}</h3>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{conversation.time}</span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">{conversation.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Box */}
      <div className={`
        ${showChat ? 'flex' : 'hidden'}
        md:flex md:col-span-7
        lg:col-span-8
        flex-col h-full bg-white
        md:border md:border-gray-300
      `}>
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-4 md:px-6 border-b border-gray-200">
          <div className="flex items-center min-w-0 flex-1">
            <ArrowLeft 
              onClick={handleBack}
              className="w-5 h-5 text-gray-700 cursor-pointer hover:text-gray-900 mr-3 flex-shrink-0 md:hidden" 
            />
            <div className="relative w-11 h-11 shrink-0">
              <Image
                src="/au-bg.png"
                alt={selectedConversation.name}
                fill
                className="rounded-full object-cover"
              />
            </div>
            <h2 className="ml-3 font-semibold text-gray-900 text-base md:text-lg truncate">{selectedConversation.name}</h2>
          </div>
          <MoreVertical className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 shrink-0 ml-2" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
          {mockMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'other' && (
                <div className="relative w-10 h-10 rounded-full shrink-0 mr-2 md:mr-3">
                  <Image
                    src="/au-bg.png"
                    alt="Avatar"
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
              )}
              <div className={`max-w-[75%] md:max-w-md ${message.sender === 'me' ? 'order-1' : ''}`}>
                <div
                  className={`px-4 py-2.5 md:px-5 md:py-3 rounded-3xl ${
                    message.sender === 'me'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm wrap-break-word">{message.text}</p>
                </div>
                {message.status && (
                  <p className="text-xs text-gray-400 mt-1 text-right">{message.status}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-200">
          <div className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-2 md:px-5 md:py-3 gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 border-none focus:outline-none bg-transparent min-w-0"
            />
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <ImagePlus className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
              <Paperclip className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 hidden sm:block" />
              <Smile className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 hidden sm:block" />
              <button className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 hidden sm:block">
                GIF
              </button>
              <Send className="w-5 h-5 text-gray-700 cursor-pointer hover:text-gray-900" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}