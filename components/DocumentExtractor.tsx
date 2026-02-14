import React, { useState } from 'react';

const DocumentExtractor = () => {
    const [file, setFile] = useState(null);
    const [text, setText] = useState('');

    const handleFileChange = (event) => {
        const chosenFile = event.target.files[0];
        if (chosenFile) {
            // Assuming a text file for demonstration
            const reader = new FileReader();
            reader.onload = (e) => {
                setText(e.target.result);
            };
            reader.readAsText(chosenFile);
            setFile(chosenFile);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const chosenFile = event.dataTransfer.files[0];
        if (chosenFile) {
            // Assuming a text file for demonstration
            const reader = new FileReader();
            reader.onload = (e) => {
                setText(e.target.result);
            };
            reader.readAsText(chosenFile);
            setFile(chosenFile);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extractedText.txt';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div>
            <h1>Document Text Extractor</h1>
            <input type="file" onChange={handleFileChange} />
            <div
                onDragOver={handleDragOver}
                onDrop={handleDrop} 
                style={{ border: '2px dashed gray', padding: '20px', textAlign: 'center', margin: '20px 0' }}
            >
                Drag and drop a file here
            </div>
            <div>
                <h2>Extracted Text:</h2>
                <p>{text}</p>
                <button onClick={handleCopy}>Copy Text</button>
                <button onClick={handleDownload}>Download Text</button>
            </div>
        </div>
    );
};

export default DocumentExtractor;
