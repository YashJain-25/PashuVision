import React from 'react';

const parseInlineFormatting = (text: string) => {
  // Bolds: **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-primary-900">$1</strong>');
  return text;
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const blocks = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type;
      const listClass = ListTag === 'ul' ? 'list-disc' : 'list-decimal';
      renderedElements.push(
        <ListTag key={renderedElements.length} className={`list-inside space-y-1 my-2 pl-4 ${listClass}`}>
          {currentList.items.map((item, index) => (
            <li key={index} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(item) }} />
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  blocks.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Check for unordered list item (starts with * or -)
    if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(trimmedLine.substring(2));
      return;
    }

    // Check for ordered list item
    const orderedMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      return;
    }
    
    // If not a list item, flush any existing list and render a paragraph
    flushList();
    if (trimmedLine) {
      renderedElements.push(
        <p key={index} className="my-1" dangerouslySetInnerHTML={{ __html: parseInlineFormatting(line) }} />
      );
    }
  });

  // Flush any remaining list at the end
  flushList();

  return <>{renderedElements}</>;
};
