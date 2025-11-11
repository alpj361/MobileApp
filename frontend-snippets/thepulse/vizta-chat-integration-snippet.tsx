// Usage snippet to integrate in ThePulse vizta-chat.tsx
// Assumes Tailwind/shadcn and lucide-react available in ThePulse.

import React, { useState } from 'react';
import ExplorationChips from './ExplorationChips';
import { ExplorationSuggestion, ViztaChatResponse } from './types';

export function ViztaExplorationBlock({
  conversationId,
  message,
  addAssistantMessage,
}: {
  conversationId: string;
  message: { id: string; sender: 'assistant' | 'user'; content: string; explorationSuggestions?: ExplorationSuggestion[] };
  addAssistantMessage: (m: any) => void;
}) {
  const [depth, setDepth] = useState(0);

  if (message.sender !== 'assistant' || !Array.isArray(message.explorationSuggestions) || message.explorationSuggestions.length === 0) {
    return null;
  }

  const handleResult = (data: ViztaChatResponse<any>) => {
    // Append the assistant response and any new explorationSuggestions
    addAssistantMessage({
      id: data.response?.id || `${Date.now()}`,
      sender: 'assistant',
      content: data.response?.message,
      explorationSuggestions: data.explorationSuggestions || [],
      timestamp: Date.now(),
    });
  };

  return (
    <div className="mt-3">
      <ExplorationChips
        conversationId={conversationId}
        suggestions={message.explorationSuggestions}
        depth={depth}
        onResult={handleResult}
        onDepthChange={setDepth}
        depthLimit={2}
        endpoint="/api/vizta-chat/query"
      />
    </div>
  );
}

