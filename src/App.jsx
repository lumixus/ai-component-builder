import './App.css'
import { useState, useRef, useEffect } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const [chatMessage, setChatMessage] = useState('');
  const [droppedComponents, setDroppedComponents] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customComponents, setCustomComponents] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isComponentInputVisible, setIsComponentInputVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const defaultComponents = ['Button', 'Input', 'Image', 'Paragraph'];
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleDragStart = (e, component) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    setIsDragging(false);
    // Only add a new component if it's coming from the component list
    const componentData = e.dataTransfer.getData('component');
    if (componentData) {
      const component = JSON.parse(componentData);
      // Convert string components to objects with content
      if (typeof component === 'string') {
        switch (component) {
          case 'Button':
            setDroppedComponents([...droppedComponents, { type: 'Button', content: 'Button' }]);
            break;
          case 'Paragraph':
            setDroppedComponents([...droppedComponents, { type: 'Paragraph', content: 'Click to edit paragraph' }]);
            break;
          default:
            setDroppedComponents([...droppedComponents, component]);
        }
      } else {
        setDroppedComponents([...droppedComponents, component]);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle drag start for reordering
  const handleItemDragStart = (e, index) => {
    e.stopPropagation();
    dragItem.current = index;
    setIsDragging(true);
    // Set a custom data transfer to identify internal drag
    e.dataTransfer.setData('text/plain', 'reordering');
  };

  // Handle drag enter for reordering
  const handleItemDragEnter = (e, index) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  // Handle drop for reordering
  const handleItemDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Check if this is a reordering operation
    const isReordering = e.dataTransfer.getData('text/plain') === 'reordering';

    if (isReordering && dragItem.current !== null && dragOverItem.current !== null) {
      const copyListItems = [...droppedComponents];
      const draggedItemContent = copyListItems[dragItem.current];

      // Remove the dragged item
      copyListItems.splice(dragItem.current, 1);

      // Insert at new position
      copyListItems.splice(dragOverItem.current, 0, draggedItemContent);

      // Reset refs
      dragItem.current = null;
      dragOverItem.current = null;

      // Update state
      setDroppedComponents(copyListItems);

      return true;
    }

    return false;
  };

  const handleParagraphChange = (index, newText) => {
    const updatedComponents = [...droppedComponents];
    updatedComponents[index] = {
      type: 'Paragraph',
      content: newText
    };
    setDroppedComponents(updatedComponents);
  };

  // Add new handler for button text changes
  const handleButtonTextChange = (index, newText) => {
    const updatedComponents = [...droppedComponents];
    updatedComponents[index] = {
      type: 'Button',
      content: newText
    };
    setDroppedComponents(updatedComponents);
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return;

    const instructions = `Create a modern, responsive React component based on this description: "${chatMessage}". 
    Follow these requirements:
    1. Return the component in JSON format with these properties:
       - "component": the HTML structure with Tailwind classes
       - "title": a descriptive name for the component
    2. You can use the following features:
       - All Tailwind CSS classes for styling
       - Font Awesome icons (using classes like "fa fa-star")
    3. Include responsive design considerations
    4. You can do all the components. Even flappy bird.
    `;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: instructions }]
        })
      });

      const data = await response.json();

      if (data.choices && data.choices[0]) {
        try {
          // Parse the response content as JSON
          const responseContent = JSON.parse(data.choices[0].message.content.trim());
          const { component: componentHtml, title, script } = responseContent;

          // Create a new custom component
          const newComponent = {
            type: 'CustomComponent',
            content: componentHtml,
            name: title || `Custom${customComponents.length + 1}`,
            script: script || '' // Store any JavaScript
          };

          // Add to custom components list
          setCustomComponents(prev => [...prev, newComponent]);
        } catch (error) {
          console.error('Error processing component:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching chat response:', error);
    } finally {
      setIsLoading(false);
      setChatMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const handleRemoveComponent = (index) => {
    const newComponents = [...droppedComponents];
    newComponents.splice(index, 1);
    setDroppedComponents(newComponents);
  };

  const handleMoveComponent = (index, direction) => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === droppedComponents.length - 1)) {
      return; // Can't move further up/down
    }

    const newComponents = [...droppedComponents];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap components
    [newComponents[index], newComponents[newIndex]] = [newComponents[newIndex], newComponents[index]];

    setDroppedComponents(newComponents);
    setSelectedComponent(newIndex); // Update selection to follow the moved component
  };

  const handleCopyComponent = (index) => {
    const componentToCopy = droppedComponents[index];
    const componentCopy = JSON.parse(JSON.stringify(componentToCopy)); // Deep copy

    const newComponents = [...droppedComponents];
    newComponents.splice(index + 1, 0, componentCopy);

    setDroppedComponents(newComponents);
    setSelectedComponent(index + 1); // Select the new copy
  };

  const handleLinkComponent = (index) => {
    const component = droppedComponents[index];
    let link = prompt('Enter a URL for this component:', component.link || 'https://');

    if (link && link.trim()) {
      const newComponents = [...droppedComponents];
      newComponents[index] = {
        ...component,
        link: link.trim()
      };
      setDroppedComponents(newComponents);
    }
  };

  const ComponentToolbox = ({ index }) => (
    <div className="component-toolbox">
      <button
        className="tool-button"
        title="Move Up"
        onClick={(e) => {
          e.stopPropagation();
          handleMoveComponent(index, 'up');
        }}
        disabled={index === 0}
      >
        <i className="fas fa-arrow-up"></i>
      </button>
      <button
        className="tool-button"
        title="Move Down"
        onClick={(e) => {
          e.stopPropagation();
          handleMoveComponent(index, 'down');
        }}
        disabled={index === droppedComponents.length - 1}
      >
        <i className="fas fa-arrow-down"></i>
      </button>
      <button
        className="tool-button"
        title="Copy"
        onClick={(e) => {
          e.stopPropagation();
          handleCopyComponent(index);
        }}
      >
        <i className="fas fa-copy"></i>
      </button>
      <button
        className="tool-button"
        title="Link"
        onClick={(e) => {
          e.stopPropagation();
          handleLinkComponent(index);
        }}
      >
        <i className="fas fa-link"></i>
      </button>
      <div className="tool-divider"></div>
      <button
        className="tool-button"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveComponent(index);
        }}
      >
        <i className="fas fa-trash"></i>
      </button>
    </div>
  );

  const renderComponent = (component, index, isPreview = false) => {
    let componentContent;
    if (typeof component === 'string') {
      switch (component) {
        case 'Button':
          componentContent = (
            <div className="relative inline-block">
              <div
                contentEditable={!isPreview}
                suppressContentEditableWarning
                onBlur={(e) => !isPreview && handleButtonTextChange(index, e.currentTarget.textContent)}
                className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer ${!isPreview ? 'hover:ring-2 hover:ring-blue-300' : ''}`}
              >
                Button
              </div>
              {!isPreview && <div className="absolute -top-5 left-0 text-xs text-gray-500">Click to edit</div>}
            </div>
          );
          break;
        case 'Input':
          componentContent = <input className="w-full px-4 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all" placeholder="Input" />;
          break;
        case 'Image':
          componentContent = <img src="/placeholder.png" alt="Placeholder" className="max-w-[200px] h-auto rounded shadow-md" />;
          break;
        case 'Paragraph':
          componentContent = (
            <div
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onBlur={(e) => !isPreview && handleParagraphChange(index, e.currentTarget.textContent)}
              className={`prose ${isPreview ? 'preview-paragraph' : 'editable-paragraph'} p-4 rounded border border-transparent ${!isPreview ? 'hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50' : ''}`}
            >
              Click to edit paragraph
            </div>
          );
          break;
        default:
          componentContent = null;
      }
    } else {
      // Handle other component types
      if (component.type === 'Button') {
        componentContent = (
          <div className="relative inline-block">
            <div
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onBlur={(e) => !isPreview && handleButtonTextChange(index, e.currentTarget.textContent)}
              className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer ${!isPreview ? 'hover:ring-2 hover:ring-blue-300' : ''}`}
            >
              {component.content || 'Button'}
            </div>
            {!isPreview && <div className="absolute -top-5 left-0 text-xs text-gray-500">Click to edit</div>}
          </div>
        );
      } else if (component.type === 'CustomComponent') {
        componentContent = (
          <div
            dangerouslySetInnerHTML={{ __html: component.content }}
            className={isPreview ? 'preview-component' : 'custom-component'}
            data-script={component.script}
          />
        );
      } else if (component.type === 'Paragraph') {
        componentContent = (
          <div
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onBlur={(e) => !isPreview && handleParagraphChange(index, e.currentTarget.textContent)}
            className={`prose ${isPreview ? 'preview-paragraph' : 'editable-paragraph'} p-4 rounded border border-transparent ${!isPreview ? 'hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50' : ''}`}
          >
            {component.content || 'Click to edit paragraph'}
          </div>
        );
      }
    }

    // Wrap the component content with a link if it has one
    const wrapWithLink = (content) => {
      if (!isPreview && component.link) {
        return (
          <a
            href={component.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="component-link"
          >
            {content}
          </a>
        );
      }
      return content;
    };

    return (
      <div
        className="dropped-component"
        draggable={!isPreview}
        onDragStart={(e) => !isPreview && handleItemDragStart(e, index)}
        onDragEnter={(e) => !isPreview && handleItemDragEnter(e, index)}
        onDragOver={(e) => !isPreview && handleDragOver(e)}
        onDragEnd={(e) => !isPreview && handleDragEnd(e)}
      >
        {wrapWithLink(componentContent)}
        {!isPreview && <ComponentToolbox index={index} />}
      </div>
    );
  };

  const PreviewModal = () => (
    <div className="preview-overlay" onClick={() => setIsPreviewMode(false)}>
      <div className="preview-content" onClick={e => e.stopPropagation()}>
        <button className="close-preview" onClick={() => setIsPreviewMode(false)}>×</button>
        <h2>Preview</h2>
        <div className="preview-container">
          {droppedComponents.map((component, index) => (
            <div key={index} className="preview-item">
              {renderComponent(component, index, true)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const generateComponentIdea = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate a creative idea for a UI component and return it in JSON format with two properties:
            - "idea": A 2-3 sentence description of the component focusing on modern, interactive, and visually appealing aspects
            - "title": A short name for this type of component`
          }]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        try {
          const responseContent = JSON.parse(data.choices[0].message.content.trim());
          const { idea, title } = responseContent;
          setChatMessage(idea || '');
        } catch (error) {
          console.error('Error processing idea:', error);
        }
      }
    } catch (error) {
      console.error('Error generating component idea:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewInNewWindow = () => {
    // Create a new window with basic HTML structure
    const previewWindow = window.open('', '_blank');

    // Function to convert React components to HTML strings
    const componentToHtml = (component) => {
      if (typeof component === 'string') {
        switch (component) {
          case 'Button':
            return `<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200">Button</button>`;
          case 'Input':
            return `<input class="w-full px-4 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" placeholder="Input">`;
          case 'Image':
            return `<img src="/placeholder.png" alt="Placeholder" class="max-w-[200px] h-auto rounded shadow-md">`;
          case 'Paragraph':
            return `<div class="prose p-4 rounded">Click to edit paragraph</div>`;
          default:
            return '';
        }
      } else if (component.type === 'Button') {
        return `<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200">${component.content || 'Button'}</button>`;
      } else if (component.type === 'CustomComponent') {
        return component.content;
      } else if (component.type === 'Paragraph') {
        return `<div class="prose p-4 rounded">${component.content || 'Click to edit paragraph'}</div>`;
      }
      return '';
    };

    // Write the preview content to the new window
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Component Preview</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    blue: {
                      500: '#2196f3',
                      600: '#1e88e5',
                    }
                  }
                }
              },
              plugins: [],
            }
          </script>
          <style>
            body { 
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background-color: #f5f5f5;
              min-height: 100vh;
            }
            .preview-container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 30px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .preview-item {
              margin: 20px 0;
              padding: 10px;
              border-radius: 4px;
            }
            .prose {
              font-size: 1rem;
              line-height: 1.75;
              color: #374151;
            }
            /* Ripple effect */
            .ripple {
              position: absolute;
              border-radius: 50%;
              transform: scale(0);
              animation: ripple 600ms linear;
              background-color: rgba(255, 255, 255, 0.7);
            }
            @keyframes ripple {
              to {
                transform: scale(4);
                opacity: 0;
              }
            }
            /* Button styles */
            button {
              position: relative;
              overflow: hidden;
            }
            /* Input focus styles */
            input:focus {
              outline: none;
              border-color: #2196f3;
              box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
            }
          </style>
        </head>
        <body class="bg-gray-50">
          <div class="preview-container">
            <h1 class="text-2xl font-bold mb-6 text-gray-800">Component Preview</h1>
            <div class="space-y-6">
              ${droppedComponents.map(component => `
                <div class="preview-item">
                  ${componentToHtml(component)}
                </div>
              `).join('')}
            </div>
          </div>
          <script>
            // Wait for the document to be fully loaded
            document.addEventListener('DOMContentLoaded', function() {
              // Execute component scripts
              ${droppedComponents
        .filter(component => typeof component === 'object' && component.script)
        .map(component => `
                  try {
                    (function() {
                      ${component.script}
                    })();
                  } catch (error) {
                    console.error('Error executing component script:', error);
                  }
                `).join('\n')
      }

              // Add ripple effect to buttons
              document.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', function(e) {
                  const rect = button.getBoundingClientRect();
                  const ripple = document.createElement('div');
                  const size = Math.max(rect.width, rect.height);
                  const x = e.clientX - rect.left - size / 2;
                  const y = e.clientY - rect.top - size / 2;
                  
                  ripple.style.width = ripple.style.height = size + 'px';
                  ripple.style.left = x + 'px';
                  ripple.style.top = y + 'px';
                  ripple.classList.add('ripple');
                  
                  button.appendChild(ripple);
                  setTimeout(() => ripple.remove(), 600);
                });
              });

              // Initialize any custom functionality
              document.querySelectorAll('.custom-component').forEach(component => {
                if (component.dataset.script) {
                  try {
                    (new Function(component.dataset.script))();
                  } catch (error) {
                    console.error('Error executing custom component script:', error);
                  }
                }
              });
            });
          </script>
        </body>
      </html>
    `);

    previewWindow.document.close();
  };

  const handleComponentClick = (component) => {
    // Convert string components to objects with content
    if (typeof component === 'string') {
      switch (component) {
        case 'Button':
          setDroppedComponents([...droppedComponents, { type: 'Button', content: 'Button' }]);
          break;
        case 'Paragraph':
          setDroppedComponents([...droppedComponents, { type: 'Paragraph', content: 'Click to edit paragraph' }]);
          break;
        default:
          setDroppedComponents([...droppedComponents, component]);
      }
    } else {
      setDroppedComponents([...droppedComponents, component]);
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
      <div
        className={`main-template ${isDragging ? 'dragging' : ''} ${isPreviewMode ? 'preview-mode' : ''}`}
        onDrop={(e) => {
          if (!handleItemDrop(e)) {
            handleDrop(e);
          }
        }}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="template-header">
          <div className="header-left">
            <h2>
              <i className="fas fa-layer-group mr-2"></i>
              AI COMPONENT BUILDER
            </h2>
            <div className="mode-toggles">
              <button
                className={`mode-toggle ${isPreviewMode ? 'active' : ''}`}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title={isPreviewMode ? "Edit Mode" : "Preview Mode"}
              >
                <i className={`fas fa-${isPreviewMode ? 'edit' : 'eye'}`}></i>
              </button>
              <button
                className={`mode-toggle ${isDarkMode ? 'active' : ''}`}
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
              >
                <i className={`fas fa-${isDarkMode ? 'sun' : 'moon'}`}></i>
              </button>
            </div>
          </div>
          <div className="preview-buttons">
            <button
              className="preview-button"
              onClick={() => setIsPreviewMode(true)}
              disabled={droppedComponents.length === 0}
            >
              <i className="fas fa-eye"></i>
              Preview Modal
            </button>
            <button
              className="preview-button"
              onClick={handlePreviewInNewWindow}
              disabled={droppedComponents.length === 0}
            >
              <i className="fas fa-external-link-alt"></i>
              Preview in New Tab
            </button>
          </div>
        </div>
        <div className="landing-page-content">
          {droppedComponents.length === 0 && (
            <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center">
                <i className="fas fa-arrow-down text-3xl text-gray-400 dark:text-gray-600 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">Drag and drop components here to build your landing page</p>
              </div>
            </div>
          )}
          {droppedComponents.map((component, index) => (
            <div
              key={index}
              className={`dropped-component ${dragOverItem.current === index ? 'drag-over' : ''} ${isPreviewMode ? 'preview-mode' : ''}`}
              draggable={!isPreviewMode}
              onDragStart={(e) => !isPreviewMode && handleItemDragStart(e, index)}
              onDragEnter={(e) => !isPreviewMode && handleItemDragEnter(e, index)}
              onDragOver={(e) => !isPreviewMode && handleDragOver(e)}
              onDragEnd={(e) => !isPreviewMode && handleDragEnd(e)}
            >
              {renderComponent(component, index)}
            </div>
          ))}
        </div>
      </div>
      {!isPreviewMode && (
        <div className="right-sidebar">
          <div className="component-list">
            <h2>
              <i className="fas fa-boxes mr-2"></i>
              REACT COMPONENT LIST
            </h2>
            <ul>
              {defaultComponents.map((component) => (
                <li
                  key={component}
                  draggable
                  onDragStart={(e) => handleDragStart(e, component)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleComponentClick(component)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <i className={`fas fa-${getComponentIcon(component)} mr-2`}></i>
                  {component}
                </li>
              ))}
              {customComponents.map((component, index) => (
                <li
                  key={`custom-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, component)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleComponentClick(component)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <i className="fas fa-puzzle-piece mr-2"></i>
                  {component.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="chat-input">
            <div className="input-header">
              <h2>
                <i className="fas fa-magic mr-2"></i>
                COMPONENT INPUT
              </h2>
              <button
                className="toggle-button"
                onClick={() => setIsComponentInputVisible(!isComponentInputVisible)}
                title={isComponentInputVisible ? "Hide input" : "Show input"}
              >
                <i className={`fas fa-chevron-${isComponentInputVisible ? 'up' : 'down'}`}></i>
              </button>
            </div>
            {isComponentInputVisible && (
              <div className="input-container">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe the component you want to create..."
                  disabled={isLoading}
                />
                <div className="button-group">
                  <button
                    onClick={handleChatSubmit}
                    disabled={isLoading || !chatMessage.trim()}
                    className={`create-button ${isLoading ? 'loading' : ''}`}
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-wand-magic-sparkles"></i>
                        Create Component
                      </>
                    )}
                  </button>
                  <button
                    className="idea-button"
                    onClick={generateComponentIdea}
                    disabled={isLoading}
                    title="Generate component idea"
                  >
                    <i className="fas fa-lightbulb"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isPreviewMode && <PreviewModal />}
    </div>
  )
}

// Helper function to get appropriate icon for component type
function getComponentIcon(component) {
  switch (component) {
    case 'Button':
      return 'square';
    case 'Input':
      return 'keyboard';
    case 'Image':
      return 'image';
    case 'Paragraph':
      return 'paragraph';
    default:
      return 'code';
  }
}

export default App
